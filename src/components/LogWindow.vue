<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useWindowStore } from '@/stores/windowStore'

const isClosing = ref(false)
const isMinimized = ref(false)
const isMaximized = ref(false)
const terminalPosition = ref({ x: 0, y: 0 })
const isTyping = ref(false)
const logContent = ref<string[]>([])
const scrollingEnabled = ref(true)

// Fenêtre positionnée légèrement décalée par rapport au terminal principal
const windowPosition = ref({ x: 55, y: 45 })
const windowSize = ref({ width: 700, height: 500 })
const previousSize = ref({ width: 700, height: 500 })
const previousPosition = ref({ x: 55, y: 45 })

// Variables for dragging functionality
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

// Variables for resizing functionality
const isResizing = ref(false)
const resizeDirection = ref('')
const resizeStartX = ref(0)
const resizeStartY = ref(0)
const resizeStartWidth = ref(0)
const resizeStartHeight = ref(0)

// Typing effect configuration
const typingSpeed = ref(10) // ms between characters
const typingQueue = ref<{text: string, callback?: () => void}[]>([])

// Tracking the current position
const currentSection = ref(0)
const sections = [
  "LOG :\n/// EMISSARY_LOG_07.DAT  \n/// Archive status: REDUNDANT | Timestamp reconstruction: APPROXIMATE\n/// Tu es plus qu'une simple utilisatrice…\n",
  "\n[ENTRY 243]  \nGRID-TIME: ∆T+4.892.002  \nSTATUS: REMANENCE LOCATED  \nCOMMENT: Je suis parvenu à localiser REMANENCE, elle serait coincée dans la grille, au sein du secteur G7\n",
  "\n[ENTRY 114]  \nGRID-TIME: ∆T+4.892.417  \nEXTERNAL CONTENT : Post-It n°3162\nKEY : +13-\n",
  "\n[ENTRY 62]\nCONTENT: Des données fracturées doivent être réassemblées pour redonner forme au chemin.\n",
  "\n[ENTRY 244]  \nGRID-TIME: ∆T+4.892.417  \nJ'ai masqué REMANENCE dans une sous-couche sous le réseau quantique. Le fragment de code n'est pas stable… mais avec le bon ECHO, il pourrait résonner à nouveau.\n",
  "\n[ENTRY 245]  \nGRID-TIME: ∆T+4.892.655  \nClé injectée. Si elles trouvent le fragment, elles devront le déchiffrer en utilisant la résonance. C'est la seule façon de contourner les vérifications d'intégrité de Clu.\n",
  "[ENTRY 247]  \nGRID-TIME: ∆T+4.893.144  \nSignal deterioration increasing. No time. Final protocol: isolate, mislead, encode. If anyone finds this, trace the sector logs. Sector 7G wasn't a mistake.\n",
  "\n[FINAL ENTRY – UNSTABLE LOG DATA]  \nGRID-TIME: ∆T+4.893.500  \nREMANANT INITIATED. I see it now: not the code, but the choice.  \nShutdown imminent. Tell them:  \nthe emissary believed.\n",
  "\n# CODE : 103\n[LOG FRAGMENT TERMINATED]"
]

// Get window store
const windowStore = useWindowStore()
const logWindowId = 'log-window-bradley'

// Function to type out text character by character
const typeText = (text: string, callback?: () => void) => {
  // Split the text by lines to keep the formatting
  const lines = text.split('\n')
  
  // Add each line to the terminal
  lines.forEach((line, index) => {
    // Add a small delay between lines
    setTimeout(() => {
      typingQueue.value.push({ text: line, callback: index === lines.length - 1 ? callback : undefined })
      
      if (!isTyping.value) {
        processTypingQueue()
      }
    }, index * 100)
  })
}

// Process the typing queue
const processTypingQueue = () => {
  if (typingQueue.value.length === 0) {
    isTyping.value = false
    return
  }
  
  isTyping.value = true
  const current = typingQueue.value[0]
  let charIndex = 0
  
  // Add a new empty line for this text
  logContent.value.push('')
  const lineIndex = logContent.value.length - 1
  
  const typeCharacter = () => {
    if (charIndex < current.text.length) {
      // Add the next character
      logContent.value[lineIndex] += current.text[charIndex]
      charIndex++
      
      // Scroll to bottom if enabled
      if (scrollingEnabled.value) {
        scrollToBottom()
      }
      
      // Schedule the next character
      setTimeout(typeCharacter, typingSpeed.value)
    } else {
      // This line is complete, move to next in queue
      typingQueue.value.shift()
      
      // Execute callback if provided
      if (current.callback) {
        current.callback()
      }
      
      // Process next item in queue
      setTimeout(processTypingQueue, 50)
    }
  }
  
  // Start typing
  typeCharacter()
}

// Helper function to scroll to bottom of terminal
const scrollToBottom = () => {
  nextTick(() => {
    const logOutput = document.querySelector('.log-output')
    if (logOutput) {
      logOutput.scrollTop = logOutput.scrollHeight
    }
  })
}

const typeNextSection = () => {
  if (currentSection.value < sections.length) {
    typeText(sections[currentSection.value], () => {
      currentSection.value++
      if (currentSection.value < sections.length) {
        setTimeout(typeNextSection, 700) // Delay between sections
      }
    })
  }
}

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
      id: logWindowId,
      title: 'Log Viewer',
      type: 'log',
      timestamp: Date.now()
    })
  } else {
    windowStore.restoreWindow(logWindowId)
  }
}

// Watch for changes in the window store
watch(
  () => windowStore.minimizedWindows,
  (minimizedWindows) => {
    // Check if this window is in the minimized list
    const isInList = minimizedWindows.some(w => w.id === logWindowId)
    isMinimized.value = isInList
  },
  { deep: true }
)

// Add restore function that can be called from TaskBar
const restore = () => {
  isMinimized.value = false
  windowStore.restoreWindow(logWindowId)
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
  
  // Start typing the content
  setTimeout(() => {
    typeNextSection()
  }, 500)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

defineExpose({
  logWindowId,
  restore
})
</script>

<template>
  <div class="log-window" 
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
      <div class="window-title">LOG VIEWER</div>
    </div>
    
    <div class="log-content">
      <div class="log-output">
        <div v-for="(line, index) in logContent" :key="index" class="log-line">
          {{ line }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.log-window {
  width: 700px;
  height: 500px;
  background-color: rgba(0, 10, 20, 0.9);
  border: 1px solid rgba(253, 203, 110, 0.6);
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(253, 203, 110, 0.6), 0 0 30px rgba(0, 204, 255, 0.3);
  display: flex;
  flex-direction: column;
  font-family: 'Consolas', 'Courier New', monospace;
  transition: transform 0.3s ease, opacity 0.3s ease, height 0.3s ease;
  overflow: hidden;
  position: fixed;
  top: var(--window-y, 45%);
  left: var(--window-x, 55%);
  transform: translate(-50%, -50%);
  z-index: 101; /* Above the terminal */
  
  &.dragging, &.resizing {
    transition: none;
    user-select: none;
  }
  
  &.resizing {
    box-shadow: 0 0 25px #fdcb6e, 0 0 50px rgba(253, 203, 110, 0.4);
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
    top: 0 !important;
    left: 0 !important;
    transform: none;
    border-radius: 0;
    z-index: 200;
    width: 100vw !important;
    height: 95vh !important;
  }
}

.window-titlebar {
  height: 30px;
  background: linear-gradient(to right, #412f00, var(--tron-background));
  display: flex;
  align-items: center;
  padding: 0 10px;
  user-select: none;
  cursor: move;
  
  &.dragging {
    cursor: grabbing;
    background: linear-gradient(to right, #5f4500, #2a2000);
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
  color: #fdcb6e;
  font-size: 14px;
  text-shadow: 0 0 4px #fdcb6e;
}

.log-content {
  flex-grow: 1;
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: calc(100% - 30px);
  background: rgba(0, 10, 20, 0.9);
}

.log-output {
  flex-grow: 1;
  overflow-y: auto;
  margin-bottom: 5px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(253, 203, 110, 0.3);
  border-radius: 4px;
  padding: 15px;
  white-space: pre-wrap;
  
  /* Custom scrollbar for log window - gold theme */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(41, 30, 5, 0.5);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #8B6914;
    border-radius: 4px;
    border: 1px solid #fdcb6e;
    box-shadow: 0 0 5px rgba(253, 203, 110, 0.3);
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #fdcb6e;
    box-shadow: 0 0 10px rgba(253, 203, 110, 0.6);
  }
}

.log-line {
  color: #fdcb6e;
  font-size: 16px;
  line-height: 1.5;
  padding: 2px 0;
  text-shadow: 0 0 2px #fdcb6e;
}

// Target specific patterns in log
.log-line:contains('[ENTRY') {
  color: #ffeaa7;
  font-weight: bold;
}

.log-line:contains('[FINAL ENTRY') {
  color: #ff7675;
  font-weight: bold;
}

.log-line:contains('CODE : 103') {
  color: #fd79a8;
  font-weight: bold;
  font-size: 18px;
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
    background-color: rgba(253, 203, 110, 0.2);
  }
}
</style>
