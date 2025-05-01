<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const isClosing = ref(false)
const isMinimized = ref(false)
const terminalPosition = ref({ x: 0, y: 0 })
const isTyping = ref(false)
const logContent = ref<string[]>([])
const scrollingEnabled = ref(true)

// Fenêtre positionnée légèrement décalée par rapport au terminal principal
const windowPosition = ref({ x: 55, y: 45 })
const windowSize = ref({ width: 700, height: 500 })

// Variables for dragging functionality
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

// Typing effect configuration
const typingSpeed = ref(10) // ms between characters
const typingQueue = ref<{text: string, callback?: () => void}[]>([])

// Tracking the current position
const currentSection = ref(0)
const sections = [
  "LOG :\n/// EMISSARY_LOG_07.DAT  \n/// Archive status: REDUNDANT | Timestamp reconstruction: APPROXIMATE\n/// Tu es plus qu'une simple utilisatrice…\n",
  "\n[ENTRY 243]  \nGRID-TIME: ∆T+4.892.002  \nSTATUS: REMANANCE LOCATED  \nCOMMENT: Je suis parvenu à localiser REMANANCE, elle serait coincée dans la grille, au sein du secteur G7\n",
  "\n[ENTRY 114]  \nGRID-TIME: ∆T+4.892.417  \nEXTERNAL CONTENT : Post-It n°3162\nKEY : +13-\n",
  "\n[ENTRY 62]\nCONTENT: Des données fracturées doivent être réassemblées pour redonner forme au chemin.\n",
  "\n[ENTRY 244]  \nGRID-TIME: ∆T+4.892.417  \nJ'ai masqué REMANANCE dans une sous-couche sous le réseau quantique. Le fragment de code n'est pas stable… mais avec le bon ECHO, il pourrait résonner à nouveau.\n",
  "\n[ENTRY 245]  \nGRID-TIME: ∆T+4.892.655  \nClé injectée. Si elles trouvent le fragment, elles devront le déchiffrer en utilisant la résonance. C'est la seule façon de contourner les vérifications d'intégrité de Clu.\n",
  "[ENTRY 247]  \nGRID-TIME: ∆T+4.893.144  \nSignal deterioration increasing. No time. Final protocol: isolate, mislead, encode. If anyone finds this, trace the sector logs. Sector 7G wasn't a mistake.\n",
  "\n[FINAL ENTRY – UNSTABLE LOG DATA]  \nGRID-TIME: ∆T+4.893.500  \nREMANANT INITIATED. I see it now: not the code, but the choice.  \nShutdown imminent. Tell them:  \nthe emissary believed.\n",
  "\n# CODE : 103\n[LOG FRAGMENT TERMINATED]"
]

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

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
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
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  
  // Start typing the content
  setTimeout(() => {
    typeNextSection()
  }, 500)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <div class="log-window" 
       :class="{ 
         'minimized': isMinimized, 
         'closing': isClosing,
         'dragging': isDragging
       }"
       :style="`
         --window-x: ${windowPosition.x}%;
         --window-y: ${windowPosition.y}%;
         width: ${windowSize.width}px;
         height: ${windowSize.height}px;
       `">
    
    <div class="window-titlebar" 
         @mousedown="startDrag"
         :class="{ 'dragging': isDragging }">
      <div class="window-controls">
        <div class="control close" @click="closeWindow"></div>
        <div class="control minimize" @click="toggleMinimize"></div>
        <div class="control maximize"></div>
      </div>
      <div class="window-title">EMISSARY LOG VIEWER</div>
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
  border: 1px solid var(--tron-blue);
  border-radius: 8px;
  box-shadow: 0 0 15px var(--tron-blue-dark), 0 0 30px rgba(0, 204, 255, 0.3);
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
  
  &.dragging {
    transition: none;
    user-select: none;
  }
  
  &.minimized {
    height: 30px;
    overflow: hidden;
  }
  
  &.closing {
    transition: all 0.5s cubic-bezier(0.2, 0.9, 0.1, 1.0);
    transform: scale(0.1);
    opacity: 0;
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
</style>
