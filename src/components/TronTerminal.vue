<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const terminalContent = ref<string[]>([
  'TRON OS v1.0.0',
  'Copyright © ENCOM 2024',
  'Initiating system...',
  'Accessing Grid...'
])

const commandInput = ref('')
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)
const isMinimized = ref(false)
const isClosing = ref(false)
const terminalPosition = ref({ x: 0, y: 0 })

// Variables for dragging functionality
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const windowPosition = ref({ x: 50, y: 50 }) // Default position as percentage of screen

// Variables for resizing functionality
const isResizing = ref(false)
const resizeDirection = ref('')
const windowSize = ref({ width: 800, height: 500 })
const resizeStartX = ref(0)
const resizeStartY = ref(0)
const resizeStartWidth = ref(0)
const resizeStartHeight = ref(0)

const startDrag = (event: MouseEvent) => {
  // Only allow dragging from the titlebar (not from controls)
  if ((event.target as HTMLElement).closest('.terminal-controls')) {
    return
  }
  
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  
  // Prevent text selection during drag
  event.preventDefault()
}

const onDrag = (event: MouseEvent) => {
  if (isResizing.value) {
    onResize(event)
    return
  }
  
  if (!isDragging.value) return
  
  const deltaX = event.clientX - dragStartX.value
  const deltaY = event.clientY - dragStartY.value
  
  // Update window position based on drag delta
  windowPosition.value = {
    x: Math.max(0, Math.min(100, windowPosition.value.x + deltaX / window.innerWidth * 100)),
    y: Math.max(0, Math.min(100, windowPosition.value.y + deltaY / window.innerHeight * 100))
  }
  
  // Update starting point for next delta calculation
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
  
  // Prevent text selection during resize
  event.preventDefault()
  event.stopPropagation()
}

const onResize = (event: MouseEvent) => {
  if (!isResizing.value) return

  const deltaX = event.clientX - resizeStartX.value
  const deltaY = event.clientY - resizeStartY.value
  
  // Min and max dimensions
  const minWidth = 400
  const maxWidth = window.innerWidth * 0.9
  const minHeight = 200
  const maxHeight = window.innerHeight * 0.9
  
  // Apply resize based on direction
  if (resizeDirection.value.includes('e')) {
    windowSize.value.width = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.value + deltaX))
  }
  
  if (resizeDirection.value.includes('w')) {
    const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.value - deltaX))
    if (newWidth !== windowSize.value.width) {
      // Adjust position when resizing from left side to keep right side fixed
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
      // Adjust position when resizing from top side to keep bottom side fixed
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

// Define emits for parent component communication
const emit = defineEmits(['close'])

const addCommandToTerminal = () => {
  if (!commandInput.value.trim()) return
  
  terminalContent.value.push(`> ${commandInput.value}`)
  
  // Ajouter des réponses en fonction de la commande
  const command = commandInput.value.toUpperCase()
  
  if (command.includes('HELP')) {
    terminalContent.value.push('Available commands:')
    terminalContent.value.push('- HELP: Display this help')
    terminalContent.value.push('- CLEAR: Clear terminal')
    terminalContent.value.push('- SYS INFO: Display system information')
    terminalContent.value.push('- ACCESS GRID: Connect to the Grid')
    terminalContent.value.push('- LOG <USER>: Connect to the Grid')
    terminalContent.value.push('- LOCATE <PROGRAM>: Locate the program of your choice')
  } else if (command.includes('CLEAR')) {
    terminalContent.value = []
  } else if (command.includes('SYS INFO')) {
    terminalContent.value.push('TRON OS v1.0.0')
    terminalContent.value.push('CPU: ENCOM Quantum 9000')
    terminalContent.value.push('Memory: 128TB Quantum RAM')
    terminalContent.value.push('Grid Access: Enabled')
  } else if (command.includes('ACCESS GRID')) {
    terminalContent.value.push('Connecting to the Grid...')
    terminalContent.value.push('WARNING: User digitization process required')
    terminalContent.value.push('Initiating laser sequence...')
  } else {
    terminalContent.value.push('Command not recognized. Type "HELP" for available commands')
  }
  
  // Ajouter au historique
  commandHistory.value.push(commandInput.value)
  historyIndex.value = commandHistory.value.length
  
  // Réinitialiser l'entrée
  commandInput.value = ''
}

const navigateHistory = (direction: 'up' | 'down') => {
  if (commandHistory.value.length === 0) return
  
  if (direction === 'up') {
    historyIndex.value = Math.max(0, historyIndex.value - 1)
    commandInput.value = commandHistory.value[historyIndex.value] || ''
  } else {
    historyIndex.value = Math.min(commandHistory.value.length, historyIndex.value + 1)
    commandInput.value = commandHistory.value[historyIndex.value] || ''
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    navigateHistory('up')
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    navigateHistory('down')
  }
}

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
}

const toggleClose = () => {
  // Get terminal taskbar icon position to animate towards it
  const taskbarIcon = document.querySelector('.taskbar-icon.terminal-icon')
  if (taskbarIcon) {
    const rect = taskbarIcon.getBoundingClientRect()
    terminalPosition.value = { 
      x: rect.left + rect.width / 2, 
      y: rect.top + rect.height / 2 
    }
  }

  // Start closing animation
  isClosing.value = true
  
  // Wait for animation to complete then emit close event
  setTimeout(() => {
    emit('close')
    isClosing.value = false
  }, 500) // Match this with CSS transition duration
}

onMounted(() => {
  // Add global event listeners for drag and resize operations
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', () => {
    stopDrag()
    stopResize()
  })
  
  // Simuler un chargement de terminal
  setTimeout(() => {
    terminalContent.value.push('System initialized')
    terminalContent.value.push('Bienvenue, Vous êtes projeté dans une instance de simulation.')
    terminalContent.value.push('Mission : retrouver REMANENCE. Progression : 0%.')
    terminalContent.value.push('Chaque programme suit une fonction. Mais certains... transcendent leur code.')
    terminalContent.value.push('Ready for input. Type "HELP" for available commands')
  }, 1500)
})

onBeforeUnmount(() => {
  // Clean up event listeners
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <div class="terminal-window" 
       :class="{ 
         'minimized': isMinimized, 
         'closing': isClosing,
         'dragging': isDragging,
         'resizing': isResizing
       }"
       :style="[
         isClosing ? `--target-x: ${terminalPosition.x}px; --target-y: ${terminalPosition.y}px;` : '',
         `--window-x: ${windowPosition.x}%; --window-y: ${windowPosition.y}%;`,
         `width: ${windowSize.width}px; height: ${windowSize.height}px;`
       ]">
    <!-- Resize handles -->
    <div class="resize-handle resize-n" @mousedown="startResize($event, 'n')"></div>
    <div class="resize-handle resize-e" @mousedown="startResize($event, 'e')"></div>
    <div class="resize-handle resize-s" @mousedown="startResize($event, 's')"></div>
    <div class="resize-handle resize-w" @mousedown="startResize($event, 'w')"></div>
    <div class="resize-handle resize-ne" @mousedown="startResize($event, 'ne')"></div>
    <div class="resize-handle resize-se" @mousedown="startResize($event, 'se')"></div>
    <div class="resize-handle resize-sw" @mousedown="startResize($event, 'sw')"></div>
    <div class="resize-handle resize-nw" @mousedown="startResize($event, 'nw')"></div>
    
    <div class="terminal-titlebar" 
         @mousedown="startDrag"
         :class="{ 'dragging': isDragging }">
      <div class="terminal-controls">
        <div class="control close" @click="toggleClose"></div>
        <div class="control minimize" @click="toggleMinimize"></div>
        <div class="control maximize"></div>
      </div>
      <div class="terminal-title">ENCOM Terminal</div>
    </div>
    
    <div class="terminal-content">
      <div class="terminal-output">
        <div v-for="(line, index) in terminalContent" :key="index" class="terminal-line">
          {{ line }}
        </div>
      </div>
      
      <div class="terminal-input-line">
        <span class="prompt">></span>
        <input 
          type="text" 
          v-model="commandInput" 
          @keyup.enter="addCommandToTerminal"
          @keydown="handleKeyDown"
          class="terminal-input"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.terminal-window {
  width: 800px;
  height: 500px;
  background-color: rgba(0, 10, 20, 0.85);
  border: 1px solid var(--tron-blue);
  border-radius: 8px;
  box-shadow: 0 0 15px var(--tron-blue-dark), 0 0 30px rgba(0, 204, 255, 0.3);
  display: flex;
  flex-direction: column;
  font-family: 'Consolas', 'Courier New', monospace;
  transition: transform 0.3s ease, opacity 0.3s ease, height 0.3s ease;
  overflow: hidden;
  position: absolute;
  top: var(--window-y, 50%);
  left: var(--window-x, 50%);
  transform: translate(-50%, -50%);
  z-index: 100;
  
  &.dragging, &.resizing {
    transition: none; /* Disable transitions while dragging/resizing for smooth movement */
    user-select: none;
  }
  
  &.resizing {
    box-shadow: 0 0 25px var(--tron-blue), 0 0 50px rgba(0, 204, 255, 0.4);
  }
  
  &.minimized {
    height: 30px;
    overflow: hidden;
  }
  
  &.closing {
    transition: all 0.5s cubic-bezier(0.2, 0.9, 0.1, 1.0);
    transform: translate(
      calc(var(--target-x) - 50%), 
      calc(var(--target-y) - 50%)
    ) scale(0.1);
    opacity: 0;
    box-shadow: 0 0 30px var(--tron-blue);
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
    background-color: rgba(0, 204, 255, 0.2);
  }
}

.terminal-titlebar {
  height: 30px;
  background: linear-gradient(to right, var(--tron-blue-dark), var(--tron-background));
  display: flex;
  align-items: center;
  padding: 0 10px;
  user-select: none;
  cursor: move; /* Show move cursor on titlebar */
  
  &.dragging {
    cursor: grabbing;
    background: linear-gradient(to right, var(--tron-blue), var(--tron-blue-dark)); /* Highlight while dragging */
  }
}

.terminal-controls {
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

.terminal-title {
  flex-grow: 1;
  text-align: center;
  color: #fff;
  font-size: 14px;
  text-shadow: 0 0 4px var(--tron-blue);
}

.terminal-content {
  flex-grow: 1;
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: calc(100% - 30px);
}

.terminal-output {
  flex-grow: 1;
  overflow-y: auto;
  margin-bottom: 10px;
}

.terminal-line {
  color: var(--tron-text-color);
  font-size: 16px;
  line-height: 1.5;
  padding: 2px 0;
  text-shadow: 0 0 2px var(--tron-blue);
}

.terminal-input-line {
  display: flex;
  align-items: center;
}

.prompt {
  color: var(--tron-blue-light);
  text-shadow: 0 0 5px var(--tron-blue);
  margin-right: 8px;
  font-weight: bold;
}

.terminal-input {
  flex-grow: 1;
  background-color: transparent;
  border: none;
  outline: none;
  color: var(--tron-text-color);
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 16px;
  text-shadow: 0 0 2px var(--tron-blue);
  caret-color: var(--tron-blue-light);
}

/* Animation de clignotement du curseur */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.terminal-input::after {
  content: '_';
  animation: blink 1s step-end infinite;
}
</style>
