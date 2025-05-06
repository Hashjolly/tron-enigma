<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useWindowStore } from '@/stores/windowStore'

// Variables pour le fonctionnement de la fenêtre
const isMinimized = ref(false)
const isClosing = ref(false)
const isMaximized = ref(false)
const windowPosition = ref({ x: 40, y: 50 })
const windowSize = ref({ width: 850, height: 800 })
const previousSize = ref({ width: 700, height: 600 })
const previousPosition = ref({ x: 40, y: 50 })
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const isResizing = ref(false)
const resizeDirection = ref('')
const resizeStartX = ref(0)
const resizeStartY = ref(0)
const resizeStartWidth = ref(0)
const resizeStartHeight = ref(0)

// Game state
const userInput = ref('')
const showFinalMessage = ref(false)
const errorMessage = ref('')
const historyItems = ref<{input: string, success: boolean}[]>([])
const gameCompleted = ref(false)

// Get expected values from env vars
const targetDegrees = parseInt(import.meta.env.VITE_APP_DIR || '85')
const targetSteps = parseInt(import.meta.env.VITE_APP_NB_PAS || '42') // Je corrige la valeur par défaut à 42

// Calculer la valeur de base nécessaire pour obtenir les résultats attendus
const calculateRequiredBase = () => {
  const hiddenExponent = 'I'.charCodeAt(0) - 'S'.charCodeAt(0); // -10
  const divisionFactor = 4;
  
  // Inverser les calculs pour trouver la valeur de base qui donne targetDegrees
  // degrees = (interim * 1.5) + hiddenExponent
  // Donc: interim = (targetDegrees - hiddenExponent) / 1.5
  const interim = (targetDegrees - hiddenExponent) / 1.5;
  
  // interim = (base / divisionFactor) + (2 * 3) - offset
  // offset = 2 * hiddenExponent
  const offset = 2 * hiddenExponent;
  
  // base / divisionFactor = interim - 6 + offset
  // base = (interim - 6 + offset) * divisionFactor
  const requiredBase = Math.round((interim - 6 + offset) * divisionFactor);
  
  return requiredBase;
}

const dynamicBase = calculateRequiredBase();
const expectedOutput = `VECTOR ACQUIRED : ${targetDegrees}° - ${targetSteps} PAS`

// Code à afficher (basé sur script.js) avec la valeur de base calculée
const codeToDisplay = `function decodeVector(base) {
    const divisionFactor = 4;
    const hiddenExponent = 'I'.charCodeAt(0) - 'S'.charCodeAt(0);
    const offset = 2 * hiddenExponent;
  
    let interim = (base / divisionFactor) + (2 * 3) - offset;
  
    const hint = [12, 24, 36, 48];
    let sum = 0;
  
    for (let i = 0; i < hint.length; i++) {
      sum += hint[i] / (i + 1);
    }
  
    const sqrtComponent = Math.sqrt(144);
    const degrees = (interim * 1.5) + hiddenExponent;
  
    let total = sum + sqrtComponent;
    total -= 6;
    
    if (total < 50) {
        return 0;
    }

    const steps = total;
  
    return \`VECTOR ACQUIRED : \${Math.round(degrees)}° - \${Math.round(steps)} PAS\`;
}
  
const base = ${dynamicBase}; // Quelle sera la sortie ?`

// Identifiant unique pour la fenêtre
const decodeGameId = 'decode-game'
const windowStore = useWindowStore()

// Check if the user input matches the expected output
const checkAnswer = () => {
  if (!userInput.value.trim()) {
    errorMessage.value = 'Please enter your answer'
    return
  }
  
  // Add to history
  addToHistory(userInput.value, userInput.value === expectedOutput)
  
  if (userInput.value === expectedOutput) {
    errorMessage.value = ''
    gameCompleted.value = true
    setTimeout(() => {
      showFinalMessage.value = true
    }, 1000)
  } else {
    errorMessage.value = 'Incorrect output format or value'
  }
}

// Add to history
const addToHistory = (input: string, success: boolean) => {
  // Only keep last 5 items
  if (historyItems.value.length >= 5) {
    historyItems.value.shift()
  }
  
  historyItems.value.push({
    input,
    success
  })
}

// Reset the game
const resetGame = () => {
  userInput.value = ''
  historyItems.value = []
  errorMessage.value = ''
  showFinalMessage.value = false
  gameCompleted.value = false
}

// Fonctions pour gérer la fenêtre
const startDrag = (event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('.window-controls')) {
    return
  }
  
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  
  event.preventDefault()
}

const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return
  
  const deltaX = event.clientX - dragStartX.value
  const deltaY = event.clientY - dragStartY.value
  
  windowPosition.value = {
    x: Math.max(0, Math.min(100, windowPosition.value.x + deltaX / window.innerWidth * 100)),
    y: Math.max(0, Math.min(100, windowPosition.value.y + deltaY / window.innerHeight * 100))
  }
  
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
}

const stopDrag = () => {
  isDragging.value = false
}

const startResize = (event: MouseEvent, direction: string) => {
  isResizing.value = true
  resizeDirection.value = direction
  
  resizeStartX.value = event.clientX
  resizeStartY.value = event.clientY
  resizeStartWidth.value = windowSize.value.width
  resizeStartHeight.value = windowSize.value.height
  
  event.preventDefault()
  event.stopPropagation()
}

const onResize = (event: MouseEvent) => {
  if (!isResizing.value) return

  const deltaX = event.clientX - resizeStartX.value
  const deltaY = event.clientY - resizeStartY.value
  
  const minWidth = 400
  const maxWidth = window.innerWidth * 0.9
  const minHeight = 200
  const maxHeight = window.innerHeight * 0.9
  
  if (resizeDirection.value.includes('e')) {
    windowSize.value.width = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.value + deltaX))
  }
  
  if (resizeDirection.value.includes('w')) {
    const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.value - deltaX))
    if (newWidth !== windowSize.value.width) {
      const widthDiff = newWidth - windowSize.value.width
      windowPosition.value.x = windowPosition.value.x - (widthDiff / window.innerWidth) * 50
      windowSize.value.width = newWidth
    }
  }
  
  if (resizeDirection.value.includes('s')) {
    windowSize.value.height = Math.max(minHeight, Math.min(maxHeight, resizeStartHeight.value + deltaY))
  }
  
  if (resizeDirection.value.includes('n')) {
    const newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartHeight.value - deltaY))
    if (newHeight !== windowSize.value.height) {
      const heightDiff = newHeight - windowSize.value.height
      windowPosition.value.y = windowPosition.value.y - (heightDiff / window.innerHeight) * 50
      windowSize.value.height = newHeight
    }
  }
}

const stopResize = () => {
  isResizing.value = false
  resizeDirection.value = ''
}

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
  
  if (isMinimized.value) {
    windowStore.minimizeWindow({
      id: decodeGameId,
      title: 'VECTOR DECODER',
      type: 'game',
      timestamp: Date.now()
    })
  } else {
    windowStore.restoreWindow(decodeGameId)
  }
}

const toggleMaximize = () => {
  if (isMaximized.value) {
    // Restore previous size and position
    windowSize.value = { ...previousSize.value }
    windowPosition.value = { ...previousPosition.value }
  } else {
    // Save current size and position
    previousSize.value = { ...windowSize.value }
    previousPosition.value = { ...windowPosition.value }
    
    // Maximize to almost full screen
    windowSize.value = { 
      width: window.innerWidth * 0.9, 
      height: window.innerHeight * 0.8 
    }
    
    // Center the window
    windowPosition.value = { x: 50, y: 50 }
  }
  
  isMaximized.value = !isMaximized.value
}

const closeWindow = () => {
  isClosing.value = true
  
  setTimeout(() => {
    emit('close')
    isClosing.value = false
  }, 500)
}

// Restore function for taskbar
const restore = () => {
  isMinimized.value = false
  windowStore.restoreWindow(decodeGameId)
}

// Define emits for parent component communication
const emit = defineEmits(['close'])

onMounted(() => {
  document.addEventListener('mousemove', (event) => {
    onDrag(event)
    onResize(event)
  })
  document.addEventListener('mouseup', () => {
    stopDrag()
    stopResize()
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

defineExpose({
  decodeGameId,
  restore
})
</script>

<template>
  <div class="decode-game-window" 
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
      <div class="window-title">VECTOR DECODER</div>
    </div>
    
    <div class="game-content">
      <!-- Message final qui remplace tout le contenu quand le puzzle est résolu -->
      <div v-if="showFinalMessage" class="final-message">
        <p>{{ expectedOutput }}</p>
      </div>
      
      <!-- Contenu normal du jeu -->
      <template v-else>
        <div class="game-header">
          <h2>Vector Decoder</h2>
          <div class="game-stats">
            <button class="reset-button" @click="resetGame">Reset</button>
          </div>
        </div>
        
        <div class="decoder-container">
          <div class="code-display">
            <pre><code>{{ codeToDisplay }}</code></pre>
          </div>
          
          <div class="decoder-interface">
            <div class="input-group">
              <label for="answer">Décoder la sortie:</label>
              <input 
                type="text" 
                id="answer" 
                v-model="userInput" 
                placeholder="VECTOR ACQUIRED : ..."
                class="answer-input"
                @keyup.enter="checkAnswer"
              />
              <button @click="checkAnswer" class="decode-button">Verify</button>
            </div>
            
            <div v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>
            
            <div class="decoder-instructions">
              <p>Analysez le code et déterminez la sortie exacte de la fonction.</p>
              <p class="hint">Indice: Faites attention au format et à la précision de la sortie.</p>
            </div>
            
            <div class="history-container">
              <h3>Tentatives</h3>
              <div v-if="historyItems.length === 0" class="no-history">
                Pas encore d'essais
              </div>
              <div v-else class="history-items">
                <div v-for="(item, index) in historyItems" :key="index" 
                     class="history-item"
                     :class="{'success': item.success}">
                  <div class="history-answer">{{ item.input }}</div>
                  <div class="history-result">{{ item.success ? '✓' : '✗' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.decode-game-window {
  width: 700px;
  height: 600px;
  background-color: rgba(0, 30, 15, 0.9);
  border: 1px solid #00ff80;
  border-radius: 8px;
  box-shadow: 0 0 15px #008040, 0 0 30px rgba(0, 255, 128, 0.3);
  display: flex;
  flex-direction: column;
  font-family: 'Orbitron', sans-serif;
  transition: transform 0.3s ease, opacity 0.3s ease, height 0.3s ease;
  overflow: hidden;
  position: fixed;
  top: var(--window-y, 40%);
  left: var(--window-x, 40%);
  transform: translate(-50%, -50%);
  z-index: 150; /* Above the terminal */
  
  &.dragging, &.resizing {
    transition: none;
    user-select: none;
  }
  
  &.resizing {
    box-shadow: 0 0 25px #00ff80, 0 0 50px rgba(0, 255, 128, 0.4);
  }
  
  &.minimized {
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, -50%) scale(0.1);
    position: absolute;
    height: 30px;
    overflow: hidden;
  }
  
  &.closing {
    transition: all 0.5s cubic-bezier(0.2, 0.9, 0.1, 1.0);
    transform: scale(0.1);
    opacity: 0;
  }
  
  &.maximized {
    position: fixed;
    top: 36px !important;
    left: 0 !important;
    transform: none;
    border-radius: 0;
    z-index: 200;
    width: 100vw !important;
    height: 91vh !important;
  }
}

.window-titlebar {
  height: 30px;
  background: linear-gradient(to right, #003020, #001510);
  display: flex;
  align-items: center;
  padding: 0 10px;
  user-select: none;
  cursor: move;
  
  &.dragging {
    cursor: grabbing;
    background: linear-gradient(to right, #004030, #002010);
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
  color: #80ffb0;
  font-size: 14px;
  text-shadow: 0 0 4px #00ff80;
}

.game-content {
  flex-grow: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: linear-gradient(to bottom, rgba(0, 30, 15, 0.9), rgba(0, 20, 10, 0.9));
  position: relative;
}

/* Message final qui s'affiche une fois résolu */
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
    color: #00ff80;
    text-shadow: 0 0 15px #00ff80, 0 0 10px #80ffb0;
    font-weight: bold;
    line-height: 1.5;
    max-width: 80%;
    letter-spacing: 1px;
    animation: pulse-text 2s infinite alternate;
  }
}

@keyframes pulse-text {
  0% { text-shadow: 0 0 10px #00ff80, 0 0 5px #80ffb0; opacity: 0.8; }
  100% { text-shadow: 0 0 20px #00ff80, 0 0 15px #80ffb0; opacity: 1; }
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h2 {
    color: #80ffb0;
    font-size: 24px;
    margin: 0;
    text-shadow: 0 0 10px #00ff80;
  }
  
  .game-stats {
    display: flex;
    gap: 15px;
    align-items: center;
    
    .reset-button {
      background: rgba(0, 40, 20, 0.7);
      color: #80ffb0;
      border: 1px solid #00ff80;
      border-radius: 4px;
      padding: 5px 10px;
      cursor: pointer;
      font-family: 'Orbitron', sans-serif;
      transition: all 0.2s;
      
      &:hover {
        background: rgba(0, 60, 30, 0.9);
        box-shadow: 0 0 8px #00ff80;
      }
    }
  }
}

.decoder-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 15px;
  overflow: hidden;
}

.code-display {
  background: rgba(0, 15, 10, 0.8);
  border: 1px solid #00ff80;
  border-radius: 4px;
  padding: 15px;
  height: 480px;
  overflow: auto;
  
  pre {
    margin: 0;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.5;
    color: #80ffb0;
    text-shadow: 0 0 2px #00ff80;
  }
  
  code {
    white-space: pre;
  }
}

.decoder-interface {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 10px;
  
  label {
    color: #80ffb0;
    font-size: 16px;
    white-space: nowrap;
  }
  
  .answer-input {
    flex: 1;
    background: rgba(0, 20, 10, 0.6);
    border: 1px solid #00ff80;
    border-radius: 4px;
    color: #ffffff;
    padding: 8px 12px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 16px;
    
    &:focus {
      outline: none;
      box-shadow: 0 0 10px rgba(0, 255, 128, 0.5);
    }
  }
  
  .decode-button {
    background: rgba(0, 40, 20, 0.7);
    color: #80ffb0;
    border: 1px solid #00ff80;
    border-radius: 4px;
    padding: 8px 15px;
    cursor: pointer;
    font-family: 'Orbitron', sans-serif;
    transition: all 0.2s;
    white-space: nowrap;
    
    &:hover {
      background: rgba(0, 60, 30, 0.9);
      box-shadow: 0 0 8px #00ff80;
    }
  }
}

.error-message {
  color: #ff6b6b;
  padding: 5px 0;
  font-size: 14px;
  text-align: center;
}

.decoder-instructions {
  margin: 5px 0;
  text-align: center;
  
  p {
    color: #80ffb0;
    margin: 5px 0;
    font-size: 14px;
  }
  
  .hint {
    font-style: italic;
    opacity: 0.7;
    font-size: 12px;
    color: #80ffb0;
  }
}

.history-container {
  flex: 1;
  margin-top: 5px;
  border: 1px solid rgba(0, 255, 128, 0.3);
  border-radius: 4px;
  padding: 10px;
  background: rgba(0, 20, 10, 0.4);
  overflow-y: auto;
  min-height: 100px;
  
  h3 {
    color: #80ffb0;
    font-size: 16px;
    margin: 0 0 10px 0;
    text-align: center;
    border-bottom: 1px solid rgba(0, 255, 128, 0.3);
    padding-bottom: 5px;
  }
  
  .no-history {
    color: rgba(128, 255, 176, 0.5);
    text-align: center;
    font-style: italic;
    padding: 10px 0;
  }
  
  .history-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .history-item {
    background: rgba(0, 30, 15, 0.5);
    border-radius: 4px;
    padding: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    &.success {
      background: rgba(0, 50, 25, 0.5);
      border: 1px solid rgba(0, 255, 128, 0.4);
    }
    
    .history-answer {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 14px;
      color: #80ffb0;
      flex: 1;
    }
    
    .history-result {
      font-size: 16px;
      margin-left: 10px;
      
      &:not(.success) {
        color: #ff6b6b;
      }
      
      &.success {
        color: #00ff80;
      }
    }
  }
}

/* Resize handles */
.resize-handle {
  position: absolute;
  z-index: 101;
  
  &.resize-n {
    top: -3px;
    left: 8px;
    right: 8px;
    height: 6px;
    cursor: n-resize;
  }
  
  &.resize-e {
    top: 8px;
    right: -3px;
    bottom: 8px;
    width: 6px;
    cursor: e-resize;
  }
  
  &.resize-s {
    bottom: -3px;
    left: 8px;
    right: 8px;
    height: 6px;
    cursor: s-resize;
  }
  
  &.resize-w {
    top: 8px;
    left: -3px;
    bottom: 8px;
    width: 6px;
    cursor: w-resize;
  }
  
  &.resize-ne {
    top: -3px;
    right: -3px;
    width: 12px;
    height: 12px;
    cursor: ne-resize;
  }
  
  &.resize-se {
    bottom: -3px;
    right: -3px;
    width: 12px;
    height: 12px;
    cursor: se-resize;
  }
  
  &.resize-sw {
    bottom: -3px;
    left: -3px;
    width: 12px;
    height: 12px;
    cursor: sw-resize;
  }
  
  &.resize-nw {
    top: -3px;
    left: -3px;
    width: 12px;
    height: 12px;
    cursor: nw-resize;
  }
  
  &:hover {
    background-color: rgba(0, 255, 128, 0.2);
  }
}

@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
</style>
