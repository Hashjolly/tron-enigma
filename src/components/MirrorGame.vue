<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useWindowStore } from '@/stores/windowStore'

// Variables pour le fonctionnement de la fenêtre
const isMinimized = ref(false)
const isClosing = ref(false)
const isMaximized = ref(false)
const windowPosition = ref({ x: 60, y: 50 })
const windowSize = ref({ width: 850, height: 750 })
const previousSize = ref({ width: 750, height: 550 })
const previousPosition = ref({ x: 60, y: 50 })
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const isResizing = ref(false)
const resizeDirection = ref('')
const resizeStartX = ref(0)
const resizeStartY = ref(0)
const resizeStartWidth = ref(0)
const resizeStartHeight = ref(0)

// État pour le jeu de puzzle
const gridSize = 4; // Grille 4x4
const totalTiles = gridSize * gridSize;
const tiles = ref<number[]>([]); // Positions actuelles des tuiles (1-16)
const solvedState = [...Array(totalTiles)].map((_, i) => i + 1); // État résolu [1,2,3,...,16]
const solved = ref(false); // Si le puzzle est résolu
const selectedTileIndex = ref<number | null>(null); // Index de la tuile actuellement sélectionnée
const isGameInitialized = ref(false); // Si le jeu a été initialisé
const congratsVisible = ref(false); // Affichage des félicitations quand résolu
const showFinalMessage = ref(false); // Affichage du message final
const animatingTiles = ref<number[]>([]); // Tuiles en cours d'animation
const animationDirection = ref<string>(''); // Direction de l'animation actuelle

// Identifiant unique pour la fenêtre
const mirrorGameId = 'mirror-game'
const windowStore = useWindowStore()

// Sélectionner une tuile
const selectTile = (tileIndex: number) => {
  if (solved.value) return;
  
  // Si aucune tuile n'est sélectionnée, la sélectionner
  if (selectedTileIndex.value === null) {
    selectedTileIndex.value = tileIndex;
    return;
  }
  
  // Si la même tuile est cliquée à nouveau, désélectionner
  if (selectedTileIndex.value === tileIndex) {
    selectedTileIndex.value = null;
    return;
  }
  
  // Sinon, échanger les deux tuiles
  switchTiles(selectedTileIndex.value, tileIndex);
}

// Échanger deux tuiles
const switchTiles = (index1: number, index2: number) => {
  // Marquer les tuiles comme en animation
  animatingTiles.value = [index1, index2];
  
  // Attendre un court instant pour que l'animation soit visible
  setTimeout(() => {
    // Effectuer l'échange
    const newTiles = [...tiles.value];
    const temp = newTiles[index1];
    newTiles[index1] = newTiles[index2];
    newTiles[index2] = temp;
    tiles.value = newTiles;
    
    // Réinitialiser la sélection
    selectedTileIndex.value = null;
    
    // Effacer les tuiles en animation
    animatingTiles.value = [];
    
    // Vérifier si le puzzle est résolu
    checkSolution();
  }, 250);
}

// Vérifier si le puzzle est résolu
const checkSolution = () => {
  // On vérifie si l'état actuel correspond à l'état résolu
  const isSolved = tiles.value.every((tile, index) => {
    return tile === solvedState[index];
  });
  
  // Si le puzzle vient d'être résolu
  if (isSolved && !solved.value) {
    solved.value = true;
    congratsVisible.value = true;
    
    // Cacher le message après quelques secondes et afficher le message final
    setTimeout(() => {
      congratsVisible.value = false;
      
      // Attendre un court instant avant de montrer le message final
      setTimeout(() => {
        showFinalMessage.value = true;
      }, 10);
    }, 2000);
  }
}

// Mélanger les tuiles
const shuffleTiles = () => {
  // Partir de l'état résolu
  const newTiles = [...solvedState];
  
  // Effectuer une série d'échanges aléatoires pour mélanger
  const swapCount = 30; // Nombre fixe d'échanges
  
  for (let i = 0; i < swapCount; i++) {
    const index1 = Math.floor(Math.random() * totalTiles);
    const index2 = Math.floor(Math.random() * totalTiles);
    
    // Échanger les tuiles
    const temp = newTiles[index1];
    newTiles[index1] = newTiles[index2];
    newTiles[index2] = temp;
  }
  
  // Vérifier que le mélange n'a pas accidentellement résolu le puzzle
  const isSolved = newTiles.every((tile, index) => tile === solvedState[index]);
  if (isSolved) {
    // Si c'est résolu (peu probable), échanger deux tuiles pour être sûr
    const temp = newTiles[0];
    newTiles[0] = newTiles[1];
    newTiles[1] = temp;
  }
  
  // Mettre à jour l'état du jeu
  tiles.value = newTiles;
  solved.value = false;
  selectedTileIndex.value = null;
  animatingTiles.value = [];
  animationDirection.value = '';
  isGameInitialized.value = true;
}

// Fonction pour calculer la position de l'image de fond pour une tuile donnée
const getTileStyle = (index: number, tile: number) => {
  // Pour toutes les tuiles, on calcule la position de l'image de fond
  const tileNumber = tile - 1; // Convertir 1-16 en 0-15
  const tileX = (tileNumber % gridSize) / (gridSize - 1) * 100;
  const tileY = Math.floor(tileNumber / gridSize) / (gridSize - 1) * 100;
  
  // Déterminer si la tuile est sélectionnée ou en cours d'animation
  const isSelected = selectedTileIndex.value === index;
  const isAnimating = animatingTiles.value.includes(index);
  
  // Calculer les transformations d'animation
  let transform = isSelected ? 'scale(0.95)' : 'scale(1)';
  let transition = 'all 0.3s ease-in-out';
  
  if (isAnimating) {
    // Ajouter l'animation de glissement basée sur la direction
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    
    if (animationDirection.value === 'left') {
      transform = `translateX(-20px) scale(0.95)`;
    } else if (animationDirection.value === 'right') {
      transform = `translateX(20px) scale(0.95)`;
    } else if (animationDirection.value === 'up') {
      transform = `translateY(-20px) scale(0.95)`;
    } else if (animationDirection.value === 'down') {
      transform = `translateY(20px) scale(0.95)`;
    }
  }
  
  return {
    backgroundImage: 'url(/images/silver_apple.png)',
    backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
    backgroundPosition: `${tileX}% ${tileY}%`,
    boxShadow: isSelected 
      ? '0 0 20px #ff00ff, 0 0 15px #ff00ff inset' 
      : isAnimating 
        ? '0 0 15px #ffff00, 0 0 10px #ffff00 inset' 
        : '',
    transition: transition,
    transform: transform,
    opacity: '1'
  };
}

// Fonctions pour déplacer une ligne ou une colonne
const shiftRow = (rowIndex: number, direction: 'left' | 'right') => {
  if (solved.value) return;
  
  // Définir la direction d'animation
  animationDirection.value = direction;
  
  // Créer une copie du tableau de tuiles
  const newTiles = [...tiles.value];
  const startIdx = rowIndex * gridSize;
  const endIdx = startIdx + gridSize;
  const rowTiles = newTiles.slice(startIdx, endIdx);
  
  // Animer toutes les tuiles de la ligne
  animatingTiles.value = Array.from({ length: gridSize }, (_, i) => startIdx + i);
  
  // Attendre un court instant pour que l'animation soit visible
  setTimeout(() => {
    if (direction === 'left') {
      // Déplacer vers la gauche (le premier élément va à la fin)
      const firstTile = rowTiles[0];
      for (let i = 0; i < gridSize - 1; i++) {
        rowTiles[i] = rowTiles[i + 1];
      }
      rowTiles[gridSize - 1] = firstTile;
    } else {
      // Déplacer vers la droite (le dernier élément va au début)
      const lastTile = rowTiles[gridSize - 1];
      for (let i = gridSize - 1; i > 0; i--) {
        rowTiles[i] = rowTiles[i - 1];
      }
      rowTiles[0] = lastTile;
    }
    
    // Mettre à jour la ligne dans le tableau de tuiles
    for (let i = 0; i < gridSize; i++) {
      newTiles[startIdx + i] = rowTiles[i];
    }
    
    tiles.value = newTiles;
    animatingTiles.value = [];
    animationDirection.value = '';
    
    // Vérifier si le puzzle est résolu
    checkSolution();
  }, 300);
}

const shiftColumn = (colIndex: number, direction: 'up' | 'down') => {
  if (solved.value) return;
  
  // Définir la direction d'animation
  animationDirection.value = direction;
  
  // Créer une copie du tableau de tuiles
  const newTiles = [...tiles.value];
  
  // Extraire les tuiles de la colonne
  const colTiles = [];
  for (let i = 0; i < gridSize; i++) {
    colTiles.push(newTiles[i * gridSize + colIndex]);
  }
  
  // Animer toutes les tuiles de la colonne
  animatingTiles.value = Array.from({ length: gridSize }, (_, i) => i * gridSize + colIndex);
  
  // Attendre un court instant pour que l'animation soit visible
  setTimeout(() => {
    if (direction === 'up') {
      // Déplacer vers le haut (le premier élément va à la fin)
      const firstTile = colTiles[0];
      for (let i = 0; i < gridSize - 1; i++) {
        colTiles[i] = colTiles[i + 1];
      }
      colTiles[gridSize - 1] = firstTile;
    } else {
      // Déplacer vers le bas (le dernier élément va au début)
      const lastTile = colTiles[gridSize - 1];
      for (let i = gridSize - 1; i > 0; i--) {
        colTiles[i] = colTiles[i - 1];
      }
      colTiles[0] = lastTile;
    }
    
    // Mettre à jour la colonne dans le tableau de tuiles
    for (let i = 0; i < gridSize; i++) {
      newTiles[i * gridSize + colIndex] = colTiles[i];
    }
    
    tiles.value = newTiles;
    animatingTiles.value = [];
    animationDirection.value = '';
    
    // Vérifier si le puzzle est résolu
    checkSolution();
  }, 300);
}

// Réinitialiser le jeu
const resetGame = () => {
  shuffleTiles();
  solved.value = false;
  selectedTileIndex.value = null;
  animatingTiles.value = [];
}

// Fonctions pour gérer la fenêtre
const startDrag = (event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('.window-controls')) {
    return;
  }
  
  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  
  event.preventDefault();
}

const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return;
  
  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;
  
  windowPosition.value = {
    x: Math.max(0, Math.min(100, windowPosition.value.x + deltaX / window.innerWidth * 100)),
    y: Math.max(0, Math.min(100, windowPosition.value.y + deltaY / window.innerHeight * 100))
  };
  
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
}

const stopDrag = () => {
  isDragging.value = false;
}

const startResize = (event: MouseEvent, direction: string) => {
  isResizing.value = true;
  resizeDirection.value = direction;
  
  resizeStartX.value = event.clientX;
  resizeStartY.value = event.clientY;
  resizeStartWidth.value = windowSize.value.width;
  resizeStartHeight.value = windowSize.value.height;
  
  event.preventDefault();
  event.stopPropagation();
}

const onResize = (event: MouseEvent) => {
  if (!isResizing.value) return;

  const deltaX = event.clientX - resizeStartX.value;
  const deltaY = event.clientY - resizeStartY.value;
  
  const minWidth = 400;
  const maxWidth = window.innerWidth * 0.9;
  const minHeight = 300;
  const maxHeight = window.innerHeight * 0.9;
  
  if (resizeDirection.value.includes('e')) {
    windowSize.value.width = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.value + deltaX));
  }
  
  if (resizeDirection.value.includes('w')) {
    const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.value - deltaX));
    if (newWidth !== windowSize.value.width) {
      const widthDiff = newWidth - windowSize.value.width;
      windowPosition.value.x = windowPosition.value.x - (widthDiff / window.innerWidth) * 50;
      windowSize.value.width = newWidth;
    }
  }
  
  if (resizeDirection.value.includes('s')) {
    windowSize.value.height = Math.max(minHeight, Math.min(maxHeight, resizeStartHeight.value + deltaY));
  }
  
  if (resizeDirection.value.includes('n')) {
    const newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartHeight.value - deltaY));
    if (newHeight !== windowSize.value.height) {
      const heightDiff = newHeight - windowSize.value.height;
      windowPosition.value.y = windowPosition.value.y - (heightDiff / window.innerHeight) * 50;
      windowSize.value.height = newHeight;
    }
  }
}

const stopResize = () => {
  isResizing.value = false;
  resizeDirection.value = '';
}

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value;
  
  if (isMinimized.value) {
    windowStore.minimizeWindow({
      id: mirrorGameId,
      title: 'MIRROR GAME',
      type: 'game',
      timestamp: Date.now()
    });
  } else {
    windowStore.restoreWindow(mirrorGameId);
  }
}

const toggleMaximize = () => {
  if (isMaximized.value) {
    // Restore previous size and position
    windowSize.value = { ...previousSize.value };
    windowPosition.value = { ...previousPosition.value };
  } else {
    // Save current size and position
    previousSize.value = { ...windowSize.value };
    previousPosition.value = { ...windowPosition.value };
    
    // Maximize to almost full screen
    windowSize.value = { 
      width: window.innerWidth * 0.95, 
      height: window.innerHeight * 0.9 
    };
    
    // Center the window
    windowPosition.value = { x: 50, y: 50 };
  }
  
  isMaximized.value = !isMaximized.value;
}

const closeWindow = () => {
  isClosing.value = true;
  
  setTimeout(() => {
    emit('close');
  }, 500);
}

// Gérer la restauration de la fenêtre depuis la barre des tâches
const restore = () => {
  isMinimized.value = false;
  windowStore.restoreWindow(mirrorGameId);
}

// Define emits for parent component communication
const emit = defineEmits(['close']);

onMounted(() => {
  document.addEventListener('mousemove', (event) => {
    onDrag(event);
    onResize(event);
  });
  document.addEventListener('mouseup', () => {
    stopDrag();
    stopResize();
  });
  
  // Initialiser le jeu au démarrage
  shuffleTiles();
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
})

defineExpose({
  mirrorGameId,
  restore
})
</script>

<template>
  <div class="mirror-game-window" 
       :class="{ 
         'minimized': isMinimized, 
         'maximized': isMaximized,
         'closing': isClosing,
         'dragging': isDragging,
         'resizing': isResizing
       }"
       :style="`
         --window-x: ${windowPosition.x}%;
         --window-y: ${windowPosition.y}%;
         width: ${windowSize.width}px;
         height: ${windowSize.height}px;
       `">
    
    <!-- Resize handles -->
    <div class="resize-handle resize-n" @mousedown="startResize($event, 'n')"></div>
    <div class="resize-handle resize-e" @mousedown="startResize($event, 'e')"></div>
    <div class="resize-handle resize-s" @mousedown="startResize($event, 's')"></div>
    <div class="resize-handle resize-w" @mousedown="startResize($event, 'w')"></div>
    <div class="resize-handle resize-ne" @mousedown="startResize($event, 'ne')"></div>
    <div class="resize-handle resize-se" @mousedown="startResize($event, 'se')"></div>
    <div class="resize-handle resize-sw" @mousedown="startResize($event, 'sw')"></div>
    <div class="resize-handle resize-nw" @mousedown="startResize($event, 'nw')"></div>
    
    <div class="window-titlebar" 
         @mousedown="startDrag"
         :class="{ 'dragging': isDragging }">
      <div class="window-controls">
        <div class="control close" @click="closeWindow"></div>
        <div class="control minimize" @click="toggleMaximize"></div>
        <div class="control maximize" @click="toggleMinimize"></div>
      </div>
      <div class="window-title">MIRROR GAME</div>
    </div>
    
    <div class="game-content">
      <!-- Message final qui remplace tout le contenu quand le puzzle est résolu -->
      <div v-if="showFinalMessage" class="final-message">
        <p>La vérité se cache là ou les reflets mentent...</p>
      </div>
      
      <!-- Contenu normal du jeu -->
      <template v-else>
        <div class="game-header">
          <h2>Mirror Puzzle</h2>
          <div class="game-stats">
            <button class="reset-button" @click="resetGame">Reset</button>
          </div>
        </div>
        
        <div class="puzzle-container">
          <!-- Grille de puzzle avec flèches directionnelles -->
          <div class="puzzle-grid-wrapper">
            <!-- Flèches du haut pour les colonnes -->
            <div class="column-arrows top-arrows">
              <div v-for="col in gridSize" :key="`top-${col}`" class="arrow-btn-container">
                <button 
                  class="arrow-btn arrow-up" 
                  @click="shiftColumn(col-1, 'up')"
                  :disabled="solved"
                >
                  ▲
                </button>
              </div>
            </div>
            
            <div class="grid-with-row-arrows">
              <!-- Flèches gauche pour les lignes -->
              <div class="row-arrows left-arrows">
                <div v-for="row in gridSize" :key="`left-${row}`" class="arrow-btn-container">
                  <button 
                    class="arrow-btn arrow-left" 
                    @click="shiftRow(row-1, 'left')"
                    :disabled="solved"
                  >
                    ◄
                  </button>
                </div>
              </div>
              
              <!-- La grille de puzzle -->
              <div class="puzzle-grid" :style="`grid-template-columns: repeat(${gridSize}, 1fr)`">
                <div 
                  v-for="(tile, index) in tiles" 
                  :key="index"
                  class="puzzle-tile"
                  :class="{ 
                    'selected': selectedTileIndex === index,
                    'animating': animatingTiles.includes(index),
                    'solved': solved
                  }"
                  @click="selectTile(index)"
                  :style="getTileStyle(index, tile)"
                >
                </div>
              </div>
              
              <!-- Flèches droite pour les lignes -->
              <div class="row-arrows right-arrows">
                <div v-for="row in gridSize" :key="`right-${row}`" class="arrow-btn-container">
                  <button 
                    class="arrow-btn arrow-right" 
                    @click="shiftRow(row-1, 'right')"
                    :disabled="solved"
                  >
                    ►
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Flèches du bas pour les colonnes -->
            <div class="column-arrows bottom-arrows">
              <div v-for="col in gridSize" :key="`bottom-${col}`" class="arrow-btn-container">
                <button 
                  class="arrow-btn arrow-down" 
                  @click="shiftColumn(col-1, 'down')"
                  :disabled="solved"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="congratsVisible" class="congrats-message">
            <div class="congrats-content">
              <h3>Puzzle Solved!</h3>
              <p>Congratulations!</p>
            </div>
          </div>
        </div>
        
        <div class="game-instructions">
          <p>Reconstituez l'image en déplaçant les lignes et colonnes</p>
          <p class="hint">Cliquez sur les flèches pour déplacer les rangées ou sélectionnez deux tuiles pour les échanger</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.mirror-game-window {
  width: 750px;
  height: 550px;
  background-color: rgba(20, 0, 20, 0.9);
  border: 1px solid #ff00ff;
  border-radius: 8px;
  box-shadow: 0 0 15px #aa00aa, 0 0 30px rgba(255, 0, 255, 0.3);
  display: flex;
  flex-direction: column;
  font-family: 'Orbitron', sans-serif;
  transition: transform 0.3s ease, opacity 0.3s ease, height 0.3s ease;
  overflow: hidden;
  position: fixed;
  top: var(--window-y, 40%);
  left: var(--window-x, 60%);
  transform: translate(-50%, -50%);
  z-index: 150; /* Au-dessus du terminal */
}

.window-titlebar {
  height: 30px;
  background: linear-gradient(to right, #300030, #100010);
  display: flex;
  align-items: center;
  padding: 0 10px;
  user-select: none;
  cursor: move;
  
  &.dragging {
    cursor: grabbing;
    background: linear-gradient(to right, #500050, #300030);
  }
}

.window-controls {
  display: flex;
  gap: 8px;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
  
  &.close {
    background-color: #ff5f57;
  }
  
  &.minimize {
    background-color: #ffbd2e;
  }
  
  &.maximize {
    background-color: #28ca41;
  }
}

.window-title {
  flex-grow: 1;
  text-align: center;
  color: #ff80ff;
  font-size: 14px;
  text-shadow: 0 0 4px #ff00ff;
}

.game-content {
  flex-grow: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: linear-gradient(to bottom, rgba(20, 0, 20, 0.9), rgba(40, 0, 40, 0.9));
  position: relative;
}

/* Message final qui s'affiche une fois le puzzle résolu */
.final-message {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  animation: fade-in 1s ease-in-out;
  
  p {
    font-family: 'Orbitron', sans-serif;
    font-size: 28px;
    color: #ff00ff;
    text-shadow: 0 0 15px #ff00ff, 0 0 10px #ff80ff;
    font-weight: bold;
    line-height: 1.5;
    max-width: 80%;
    letter-spacing: 1px;
    animation: pulse-text 2s infinite alternate;
  }
}

@keyframes pulse-text {
  0% { text-shadow: 0 0 10px #ff00ff, 0 0 5px #ff80ff; opacity: 0.8; }
  100% { text-shadow: 0 0 20px #ff00ff, 0 0 15px #ff80ff; opacity: 1; }
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h2 {
    color: #ff80ff;
    font-size: 24px;
    margin: 0;
    text-shadow: 0 0 10px #ff00ff;
  }
  
  .game-stats {
    display: flex;
    gap: 15px;
    align-items: center;
    
    .reset-button {
      background: rgba(40, 0, 40, 0.7);
      color: #ff80ff;
      border: 1px solid #ff00ff;
      border-radius: 4px;
      padding: 5px 10px;
      cursor: pointer;
      font-family: 'Orbitron', sans-serif;
      transition: all 0.2s;
      
      &:hover {
        background: rgba(60, 0, 60, 0.9);
        box-shadow: 0 0 8px #ff00ff;
      }
    }
  }
}

.puzzle-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 10px;
}

.puzzle-grid-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.grid-with-row-arrows {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-arrows {
  display: flex;
  justify-content: space-around;
  width: 450px;
  height: 28px;
}

.row-arrows {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 450px;
  width: 28px;
}

.arrow-btn-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.arrow-btn {
  width: 28px;
  height: 28px;
  background: rgba(40, 0, 40, 0.7);
  color: #ff80ff;
  border: 1px solid #ff00ff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: rgba(60, 0, 60, 0.9);
    box-shadow: 0 0 10px #ff00ff;
    color: #ffffff;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.puzzle-grid {
  display: grid;
  gap: 4px;
  width: 450px;
  height: 450px;
  border: 2px solid #ff00ff;
  padding: 4px;
  background: rgba(10, 0, 10, 0.8);
  box-shadow: 0 0 15px rgba(255, 0, 255, 0.4);
  position: relative;
  
  .puzzle-tile {
    position: relative;
    width: 100%;
    padding-bottom: 100%; // Aspect ratio 1:1
    background-color: rgba(40, 0, 40, 0.6);
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    
    &.animating {
      z-index: 10;
    }
    
    &.solved {
      animation: pulse-solved 2s infinite alternate;
    }
  }
}

@keyframes pulse-solved {
  0% { box-shadow: 0 0 5px rgba(255, 0, 255, 0.4); }
  100% { box-shadow: 0 0 12px rgba(255, 0, 255, 0.8); }
}

.game-instructions {
  text-align: center;
  margin-top: 20px;
  color: #ff80ff;
  
  p {
    margin: 5px 0;
    font-size: 14px;
  }
  
  .hint {
    font-style: italic;
    opacity: 0.7;
    font-size: 12px;
    text-shadow: 0 0 3px #ff00ff;
  }
}

.congrats-message {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(40, 0, 40, 0.7);
  animation: fade-in 0.5s forwards;
  
  .congrats-content {
    background: rgba(60, 0, 60, 0.9);
    border: 2px solid #ff00ff;
    padding: 20px 40px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 0 20px #ff00ff;
    
    h3 {
      color: #ff80ff;
      margin-top: 0;
      font-size: 24px;
      text-shadow: 0 0 8px #ff00ff;
    }
    
    p {
      color: #ff80ff;
      margin-bottom: 0;
    }
  }
}

@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* Resize handles */
.resize-handle {
  position: absolute;
  z-index: 101;
  
  &:hover {
    background-color: rgba(255, 0, 255, 0.2);
  }
}
</style>
