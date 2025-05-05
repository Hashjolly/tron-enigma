<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useWindowStore } from '@/stores/windowStore'

// Variables pour le fonctionnement de la fenêtre
const isMinimized = ref(false)
const isClosing = ref(false)
const isMaximized = ref(false)
const windowPosition = ref({ x: 60, y: 40 })
const windowSize = ref({ width: 750, height: 550 })
const previousSize = ref({ width: 750, height: 550 })
const previousPosition = ref({ x: 60, y: 40 })
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
const gridSize = 3; // Grille 3x3
const totalTiles = gridSize * gridSize;
const tiles = ref<number[]>([]); // Positions actuelles des tuiles (1-9)
const solvedState = [...Array(totalTiles)].map((_, i) => i + 1); // État résolu [1,2,3,4,5,6,7,8,9]
const solved = ref(false); // Si le puzzle est résolu
const moves = ref(0); // Compteur de mouvements
const selectedTileIndex = ref<number | null>(null); // Index de la tuile actuellement sélectionnée
const isGameInitialized = ref(false); // Si le jeu a été initialisé
const congratsVisible = ref(false); // Affichage des félicitations quand résolu
const patternSwapsActive = ref(false); // Si les échanges en pattern sont en cours
const animatingTiles = ref<number[]>([]); // Tuiles en cours d'animation
const difficulty = ref(1); // Niveau de difficulté (1-3)
const patternDescription = ref(''); // Description du pattern utilisé pour le mouvement
const showPatternHint = ref(false); // Afficher l'indication du pattern

// Identifiant unique pour la fenêtre
const mirrorGameId = 'mirror-game'
const windowStore = useWindowStore()

// Sélectionner une tuile
const selectTile = (tileIndex: number) => {
  if (solved.value || patternSwapsActive.value) return;
  
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
  
  // Réinitialiser le texte d'indication du pattern
  patternDescription.value = '';
  
  // Attendre un court instant pour que l'animation soit visible
  setTimeout(() => {
    // Effectuer l'échange
    const newTiles = [...tiles.value];
    const temp = newTiles[index1];
    newTiles[index1] = newTiles[index2];
    newTiles[index2] = temp;
    tiles.value = newTiles;
    
    // Incrémenter le compteur de mouvements
    moves.value++;
    
    // Réinitialiser la sélection
    selectedTileIndex.value = null;
    
    // Effacer les tuiles en animation
    animatingTiles.value = [];
    
    // Vérifier si le puzzle est résolu
    checkSolution();
    
    // Si le puzzle n'est pas résolu, effectuer des échanges selon un pattern
    if (!solved.value) {
      performPatternSwaps();
    }
  }, 250);
}

// Calculer l'indice de la position du miroir
const getMirrorIndex = (index: number): number => {
  // Dans une grille 3x3, le miroir par rapport au centre est:
  // 0 1 2     8 7 6
  // 3 4 5  → 5 4 3
  // 6 7 8     2 1 0
  return totalTiles - 1 - index;
}

// Effectuer des échanges selon un pattern
const performPatternSwaps = () => {
  patternSwapsActive.value = true;
  
  // Définir le pattern en fonction du niveau de difficulté
  let patternType: number;
  
  // Au lieu de mouvements vraiment aléatoires, nous utilisons un pattern prédictible
  // mais qui donne l'impression de complexité
  if (difficulty.value === 1) {
    patternType = 1; // Pattern simple: symétrie miroir centrale
  } else if (difficulty.value === 2) {
    patternType = 2; // Pattern médium: rotation de coins
  } else {
    patternType = 3; // Pattern difficile: combinaison de patterns
  }
  
  // Retard avant d'appliquer le pattern pour permettre à l'utilisateur de voir son mouvement
  setTimeout(() => {
    const newTiles = [...tiles.value];
    
    if (patternType === 1) {
      // Pattern 1: Symétrie miroir centrale - échanger deux tuiles symétriques par rapport au centre
      const index1 = 0; // Coin supérieur gauche
      const index2 = getMirrorIndex(index1); // Coin inférieur droit
      
      // Animer ces tuiles
      animatingTiles.value = [index1, index2];
      patternDescription.value = "Symétrie centrale";
      
      // Effectuer l'échange
      setTimeout(() => {
        const temp = newTiles[index1];
        newTiles[index1] = newTiles[index2];
        newTiles[index2] = temp;
        
        tiles.value = newTiles;
        animatingTiles.value = [];
        showPatternHint.value = true;
        
        // Cacher l'indication après quelques secondes
        setTimeout(() => {
          showPatternHint.value = false;
        }, 3000);
        
        patternSwapsActive.value = false;
        
        // Vérifier si le puzzle est résolu (rare, mais possible)
        checkSolution();
      }, 600);
      
    } else if (patternType === 2) {
      // Pattern 2: Rotation des coins dans le sens des aiguilles d'une montre
      const corners = [0, 2, 8, 6]; // Indices des coins (haut-gauche, haut-droit, bas-droit, bas-gauche)
      animatingTiles.value = [...corners];
      patternDescription.value = "Rotation des coins";
      
      setTimeout(() => {
        // Sauvegarder la valeur du premier coin
        const temp = newTiles[corners[0]];
        
        // Déplacer chaque coin à la position suivante (rotation horaire)
        for (let i = 0; i < corners.length - 1; i++) {
          newTiles[corners[i]] = newTiles[corners[i+1]];
        }
        
        // Placer la première valeur à la dernière position
        newTiles[corners[corners.length - 1]] = temp;
        
        tiles.value = newTiles;
        animatingTiles.value = [];
        showPatternHint.value = true;
        
        // Cacher l'indication après quelques secondes
        setTimeout(() => {
          showPatternHint.value = false;
        }, 3000);
        
        patternSwapsActive.value = false;
        
        // Vérifier si le puzzle est résolu
        checkSolution();
      }, 600);
      
    } else {
      // Pattern 3: Combinaison de patterns - symétrie des coins + échange du centre avec un bord
      // 1. D'abord, symétrie des coins opposés (0 ↔ 8 et 2 ↔ 6)
      const cornerPairs = [[0, 8], [2, 6]];
      animatingTiles.value = cornerPairs.flat();
      patternDescription.value = "Symétrie des coins + Échange central";
      
      setTimeout(() => {
        // Échanger les coins diagonalement opposés
        for (const [a, b] of cornerPairs) {
          const temp = newTiles[a];
          newTiles[a] = newTiles[b];
          newTiles[b] = temp;
        }
        
        // 2. Ensuite, échanger le centre avec un côté
        const center = 4;
        const sides = [1, 3, 5, 7]; // Haut, gauche, droite, bas
        const randomSide = sides[moves.value % sides.length]; // Prédictible mais semble aléatoire
        
        animatingTiles.value = [center, randomSide];
        
        setTimeout(() => {
          // Échanger le centre avec le côté choisi
          const temp = newTiles[center];
          newTiles[center] = newTiles[randomSide];
          newTiles[randomSide] = temp;
          
          tiles.value = newTiles;
          animatingTiles.value = [];
          showPatternHint.value = true;
          
          // Cacher l'indication après quelques secondes
          setTimeout(() => {
            showPatternHint.value = false;
          }, 3000);
          
          patternSwapsActive.value = false;
          
          // Vérifier si le puzzle est résolu
          checkSolution();
        }, 600);
      }, 600);
    }
  }, 300);
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
    
    // Cacher le message après quelques secondes
    setTimeout(() => {
      congratsVisible.value = false;
    }, 5000);
  }
}

// Mélanger les tuiles
const shuffleTiles = () => {
  // Partir de l'état résolu
  const newTiles = [...solvedState];
  
  // Effectuer une série d'échanges aléatoires pour mélanger
  const swapCount = 20 + difficulty.value * 10; // Plus de difficulté = plus de mélanges
  
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
  moves.value = 0;
  solved.value = false;
  selectedTileIndex.value = null;
  animatingTiles.value = [];
  isGameInitialized.value = true;
}

// Fonction pour calculer la position de l'image de fond pour une tuile donnée
const getTileStyle = (index: number, tile: number) => {
  // Pour toutes les tuiles, on calcule la position de l'image de fond
  const tileNumber = tile - 1; // Convertir 1-9 en 0-8
  const tileX = (tileNumber % gridSize) / (gridSize - 1) * 100;
  const tileY = Math.floor(tileNumber / gridSize) / (gridSize - 1) * 100;
  
  // Déterminer si la tuile est sélectionnée ou en cours d'animation
  const isSelected = selectedTileIndex.value === index;
  const isAnimating = animatingTiles.value.includes(index);
  
  return {
    backgroundImage: 'url(/images/silver_apple.png)',
    backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
    backgroundPosition: `${tileX}% ${tileY}%`,
    boxShadow: isSelected 
      ? '0 0 20px #ff00ff, 0 0 15px #ff00ff inset' 
      : isAnimating 
        ? '0 0 15px #ffff00, 0 0 10px #ffff00 inset' 
        : '',
    transition: 'all 0.2s ease-in-out',
    transform: isAnimating ? 'scale(0.9)' : isSelected ? 'scale(0.95)' : 'scale(1)',
    opacity: patternSwapsActive.value && !isAnimating ? '0.7' : '1'
  };
}

// Réinitialiser le jeu
const resetGame = () => {
  shuffleTiles();
  moves.value = 0;
  solved.value = false;
  selectedTileIndex.value = null;
  animatingTiles.value = [];
}

// Changer le niveau de difficulté
const changeDifficulty = (level: number) => {
  difficulty.value = level;
  resetGame();
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
      <div class="game-header">
        <h2>Mirror Puzzle</h2>
        <div class="game-stats">
          <div class="difficulty-selector">
            <span class="diff-label">Level:</span>
            <div class="diff-buttons">
              <button 
                class="diff-button" 
                :class="{ 'active': difficulty === 1 }" 
                @click="changeDifficulty(1)"
              >1</button>
              <button 
                class="diff-button" 
                :class="{ 'active': difficulty === 2 }" 
                @click="changeDifficulty(2)"
              >2</button>
              <button 
                class="diff-button" 
                :class="{ 'active': difficulty === 3 }" 
                @click="changeDifficulty(3)"
              >3</button>
            </div>
          </div>
          <div class="moves">Moves: {{ moves }}</div>
          <button class="reset-button" @click="resetGame">Reset</button>
        </div>
      </div>
      
      <div class="puzzle-container">
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
            <div class="tile-position" v-if="difficulty === 3">{{ index }}</div>
          </div>
        </div>
        
        <div v-if="patternSwapsActive" class="pattern-indicator">
          {{ patternDescription }}
        </div>
        
        <div v-if="showPatternHint" class="pattern-hint">
          <div class="hint-content">
            <h4>Pattern utilisé</h4>
            <p>{{ patternDescription }}</p>
            <p class="hint-tip" v-if="difficulty === 1">
              Les tuiles aux coins opposés s'échangent.
            </p>
            <p class="hint-tip" v-if="difficulty === 2">
              Les tuiles aux quatre coins tournent dans le sens horaire.
            </p>
            <p class="hint-tip" v-if="difficulty === 3">
              Les coins opposés s'échangent, puis le centre échange avec un bord.
            </p>
          </div>
        </div>
        
        <div v-if="congratsVisible" class="congrats-message">
          <div class="congrats-content">
            <h3>Puzzle Solved!</h3>
            <p>You completed it in {{ moves }} moves</p>
            <p>Level: {{ difficulty }}</p>
          </div>
        </div>
      </div>
      
      <div class="game-instructions">
        <p>Reconstituez l'image en échangeant les morceaux.</p>
        <p class="hint">Sélectionnez deux tuiles pour les échanger. Attention: un pattern d'échanges suivra!</p>
      </div>
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
    
    .moves {
      color: #ff80ff;
      font-size: 16px;
    }
    
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

.difficulty-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .diff-label {
    color: #ff80ff;
    font-size: 14px;
  }
  
  .diff-buttons {
    display: flex;
    gap: 3px;
  }
  
  .diff-button {
    background: rgba(30, 0, 30, 0.7);
    color: #ff80ff;
    border: 1px solid #ff00ff;
    border-radius: 3px;
    width: 24px;
    height: 24px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(50, 0, 50, 0.9);
    }
    
    &.active {
      background: rgba(80, 0, 80, 0.9);
      box-shadow: 0 0 10px #ff00ff;
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

.puzzle-grid {
  display: grid;
  gap: 4px;
  width: 300px;
  height: 300px;
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
    transition: all 0.2s ease-in-out;
    
    .tile-position {
      position: absolute;
      top: 5px;
      left: 5px;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.7);
      background: rgba(0, 0, 0, 0.5);
      border-radius: 50%;
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    &:hover {
      box-shadow: 0 0 8px #ff00ff;
    }
    
    &.selected {
      transform: scale(0.95);
      box-shadow: 0 0 20px #ff00ff, 0 0 15px #ff00ff inset;
      z-index: 10;
    }
    
    &.animating {
      transform: scale(0.9);
      box-shadow: 0 0 15px #ffff00, 0 0 10px #ffff00 inset;
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

.pattern-indicator {
  position: absolute;
  top: -30px;
  left: 0;
  right: 0;
  text-align: center;
  color: #ffff00;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 0 0 10px #ff8800;
  animation: flash 1s infinite alternate;
}

.pattern-hint {
  position: absolute;
  bottom: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  background: rgba(40, 0, 40, 0.9);
  border: 1px solid #ff00ff;
  border-radius: 8px;
  padding: 10px 15px;
  animation: fade-in 0.5s forwards;
  box-shadow: 0 0 15px rgba(255, 0, 255, 0.4);
  
  .hint-content {
    text-align: center;
    
    h4 {
      color: #ff80ff;
      margin: 0 0 8px 0;
      font-size: 16px;
      text-shadow: 0 0 5px #ff00ff;
    }
    
    p {
      color: #ff80ff;
      margin: 5px 0;
      font-size: 13px;
    }
    
    .hint-tip {
      color: #ffff00;
      font-style: italic;
      font-size: 12px;
    }
  }
}

@keyframes flash {
  0% { opacity: 0.5; }
  100% { opacity: 1; }
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
