<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
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

// Identifiant unique pour la fenêtre
const mirrorGameId = 'mirror-game'
const windowStore = useWindowStore()

// Fonctions de gestion de la fenêtre (similaires à celles du terminal)
const startDrag = (event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('.window-controls')) {
    return
  }
  
  if (isMaximized.value) return
  
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
  if (isMaximized.value) return
  
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
      id: mirrorGameId,
      title: 'MIRROR GAME',
      type: 'game',
      timestamp: Date.now()
    })
  } else {
    windowStore.restoreWindow(mirrorGameId)
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
    
    // Maximize to almost full screen (95% of viewport)
    windowSize.value = { 
      width: window.innerWidth * 0.95, 
      height: window.innerHeight * 0.9 
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
  }, 500)
}

// Gérer la restauration de la fenêtre depuis la barre des tâches
const restore = () => {
  isMinimized.value = false
  windowStore.restoreWindow(mirrorGameId)
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
      <div class="welcome-text">
        <h1>MIRROR GAME MODE ACTIVATED</h1>
        <p>Welcome to the Mirror Game. This is a hidden developer mode.</p>
        <p>Here you can see through the mirror and access special functions.</p>
        <div class="game-status">
          <div class="status-row">
            <span class="label">STATUS:</span>
            <span class="value online">ONLINE</span>
          </div>
          <div class="status-row">
            <span class="label">CONNECTION:</span>
            <span class="value secure">SECURE</span>
          </div>
          <div class="status-row">
            <span class="label">GAME ID:</span>
            <span class="value">TRON-1982-FLYNN</span>
          </div>
        </div>
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
  
  &.dragging, &.resizing {
    transition: none;
    user-select: none;
  }
  
  &.resizing {
    box-shadow: 0 0 25px #ff00ff, 0 0 50px rgba(255, 0, 255, 0.4);
  }
  
  &.minimized {
    opacity: 0;
    pointer-events: none;
    transform: scale(0.1) translate(-50%, -50%);
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
    position: fixed !important;
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
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom, rgba(20, 0, 20, 0.9), rgba(40, 0, 40, 0.9));
}

.welcome-text {
  color: #ff80ff;
  text-align: center;
  max-width: 80%;
  
  h1 {
    font-size: 24px;
    margin-bottom: 20px;
    text-shadow: 0 0 10px #ff00ff;
    letter-spacing: 2px;
  }
  
  p {
    margin-bottom: 15px;
    font-size: 16px;
    line-height: 1.6;
    text-shadow: 0 0 5px #ff80ff;
  }
}

.game-status {
  margin-top: 40px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #ff00ff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

.status-row {
  display: flex;
  justify-content: space-between;
  font-family: 'Consolas', monospace;
  
  .label {
    color: #ff80ff;
    margin-right: 20px;
  }
  
  .value {
    color: #ffffff;
    
    &.online {
      color: #50ff50;
      text-shadow: 0 0 5px #00ff00;
    }
    
    &.secure {
      color: #50ff50;
      text-shadow: 0 0 5px #00ff00;
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
    background-color: rgba(255, 0, 255, 0.2);
  }
}
</style>
