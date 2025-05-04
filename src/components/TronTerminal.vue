<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useGridStore } from '@/stores/gridStore'
import { useWindowStore } from '@/stores/windowStore'
import LogWindow from './LogWindow.vue'

const terminalContent = ref<string[]>([
  '',
])

const commandInput = ref('')
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)
const isMinimized = ref(false)
const isClosing = ref(false)
const isMaximized = ref(false)
const terminalPosition = ref({ x: 0, y: 0 })
const isTyping = ref(false)
const showLogWindow = ref(false)
const previousSize = ref({ width: 800, height: 500 })
const previousPosition = ref({ x: 50, y: 50 })

// Typing effect configuration
const typingSpeed = ref(20) // ms between characters
const typingQueue = ref<{text: string, callback?: () => void}[]>([])

// Utiliser le store Grid global
const gridStore = useGridStore()

// Get window store
const windowStore = useWindowStore()
const terminalId = 'terminal-main'

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

// Variables for RESTORE functionality
const showPasswordModal = ref(false)
const passwordInput = ref('')
const passwordAttempts = ref(0)
const passwordError = ref('')

// Variables for secret file functionality
const showSecretFilePrompt = ref(false)
const showVideo = ref(false)
const videoPath = ref('')

const startDrag = (event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('.terminal-controls')) {
    return
  }
  
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  
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

// Formater le temps restant
const formattedTime = computed(() => {
  if (!gridStore.countdownStarted) return '';
  
  const minutes = Math.floor(gridStore.timeRemaining / 60);
  const seconds = gridStore.timeRemaining % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
})

// Function to type out text character by character
const typeText = (text: string, callback?: () => void) => {
  typingQueue.value.push({ text, callback })
  
  if (!isTyping.value) {
    processTypingQueue()
  }
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
  terminalContent.value.push('')
  const lineIndex = terminalContent.value.length - 1
  
  const typeCharacter = () => {
    if (charIndex < current.text.length) {
      // Add the next character
      terminalContent.value[lineIndex] += current.text[charIndex]
      charIndex++
      
      // Scroll to bottom
      scrollToBottom()
      
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
  setTimeout(() => {
    const terminalOutput = document.querySelector('.terminal-output')
    if (terminalOutput) {
      terminalOutput.scrollTop = terminalOutput.scrollHeight
    }
  }, 0)
}

// Define emits for parent component communication
const emit = defineEmits(['close', 'stopMorse'])

const addCommandToTerminal = () => {
  if (!commandInput.value.trim()) return
  
  const userCommand = commandInput.value.trim()
  // Immediately show what the user typed with the prompt
  terminalContent.value.push(`> ${userCommand}`)
  scrollToBottom()
  
  const command = userCommand.toUpperCase()
  
  // Add to command history
  commandHistory.value.push(commandInput.value)
  historyIndex.value = commandHistory.value.length
  commandInput.value = ''
  
  if (command.includes('HELP')) {
    typeText('Available commands:')
    typeText('- HELP: Display this help')
    typeText('- CLEAR: Clear terminal')
    typeText('- SYS INFO: Display system information')
    typeText('- ACCESS GRID: Connect to the Grid')
    typeText('- LOG <USER>: Access to an user data')
    typeText('- TRACE <PROGRAM>: Locate the program of your choice')
    if (gridStore.remanenceIsolated) {
      typeText('- ISOLATE <PROGRAM>: Isolate the program of your choice')
      typeText('- DECRYPT <PROGRAM> WITH <KEY>: Decrypt the program of your choice')
    }
    if (gridStore.remanenceDecrypted) {
      typeText('- RESTORE <PROGRAM>: Restore fragmented program data')
    }
    // typeText('- STOP MORSE: Disable morse code transmission')
  } else if (command.includes('CLEAR')) {
    terminalContent.value = []
  } else if (command.includes('SYS INFO')) {
    typeText('TRON OS v1.0.0')
    typeText('CPU: ENCOM Quantum 9000')
    typeText('Memory: 128TB Quantum RAM')
    typeText('Grid Access: ' + (gridStore.gridAccessed ? 'Enabled (UNSTABLE)' : 'Disabled'))
    if (gridStore.countdownStarted) {
      typeText('WARNING: System breach detected')
      typeText('Time until CLU arrival: ' + formattedTime.value)
    }
  } else if (command === 'ACCESS GRID') {
    if (!gridStore.gridAccessed) {
      gridStore.gridAccessed = true
      typeText('Connecting to the Grid...')
      typeText('WARNING: Unstable connection detected')
      typeText('Initiating Grid access protocols...')
      typeText('Grid access established - WARNING: Connection unstable', () => {
        gridStore.startCountdown()
      })
    } else {
      typeText('Grid access already established')
      typeText('WARNING: Multiple access attempts may destabilize the connection')
      typeText('Proceeding with trace operations is recommended')
    }
  } else if (command.startsWith('TRACE ')) {
    if (!gridStore.gridAccessed) {
      typeText('ERROR: Grid access required for trace operations')
      typeText('Please use ACCESS GRID command first')
    } else {
      const target = command.replace('TRACE ', '').trim()
      
      if (target === 'REMANENCE' || target === 'REMANANCE') {
        gridStore.remanenceFound = true

        let loadingDots = 0
        terminalContent.value.push('Scanning grid for ' + target + '...')
        const loadingInterval = setInterval(() => {
          loadingDots = (loadingDots + 1) % 3
          terminalContent.value[terminalContent.value.length - 1] = 
            'Scanning grid for ' + target + '.' + '.'.repeat(loadingDots)
        }, 500)

          setTimeout(() => {
            clearInterval(loadingInterval)
            setTimeout(() => {
              typeText('Scanning complete')
              setTimeout(() => {
                typeText('Signature detected in Sector 7G.')
                setTimeout(() => {
                  typeText('Trace established')
                  setTimeout(() => {
                      typeText('>> Message from REMANENCE: <<')
                      typeText('>>"J’ai peur. Je sais qu’il me traque…"<<')
                      typeText('NEXT STEP : 01001001010100110100111101001100010000010101010001000101')
                    }, 1000)
                  }, 1000)
                }, 1000)
            }, 1000)
          }, 7000)
        
      } else {
        typeText('Initiating trace for program: ' + target)
        typeText('Scanning grid sectors...')
        setTimeout(() => {
          typeText('ERROR: Program not found or access restricted')
          typeText('Try another search parameter or verify program designation')
        }, 2000)
      }
    }
  } else if (command.startsWith('LOG ')) {
    const user = command.replace('LOG ', '').trim()
    if (user === 'BRADLEY') {
      typeText('Authenticating as BRADLEY...')
      setTimeout(() => {
        typeText('Authentication successful')
        typeText('Accessing log files...')
        setTimeout(() => {
          showLogWindow.value = true  // Ouvrir la fenêtre de log
        }, 1000)
      }, 2000)
    } else {
      typeText('ERROR: Invalid user designation')
      typeText('Please use LOG <USER> for authentication')
    }
  } else if (command.startsWith('ISOLATE ')) {
    if (!gridStore.remanenceFound) {
      typeText('ERROR: REMANENCE not found')
      typeText('Please use TRACE command first')
    } else {
      const target = command.replace('ISOLATE ', '').trim()
      
      if (target === 'REMANENCE' || target === 'REMANANCE') {
        gridStore.remanenceIsolated = true

        let loadingDots = 0
        typeText('Si tu as pu déchiffrer ça, tu es déjà différente.')
        terminalContent.value.push('Isolating ' + target + 'data cluster...')
        const loadingInterval = setInterval(() => {
          loadingDots = (loadingDots + 1) % 3
          terminalContent.value[terminalContent.value.length - 1] = 
            'Isolating ' + target + ' data cluster' + '.' + '.'.repeat(loadingDots)
        }, 500)

          setTimeout(() => {
            clearInterval(loadingInterval)
            setTimeout(() => {
              typeText('REMN_CORE.7G located.')
              setTimeout(() => {
                typeText('Integrity: 78%')
                setTimeout(() => {
                  typeText('Warning: Encryption detected.')
                  setTimeout(() => {
                      typeText('Next step: DECRYPT REMANENCE')
                    }, 1000)
                  }, 1000)
                }, 1000)
            }, 1000)
          }, 7000)
        
      } else {
        typeText('Initiating isolate for program: ' + target)
        typeText('Scanning grid sectors...')
        setTimeout(() => {
          typeText('ERROR: Program not found or access restricted')
          typeText('Try another search parameter or verify program designation')
        }, 2000)
      }
    }
  } else if (command.startsWith('DECRYPT ')) {
    if (!gridStore.remanenceIsolated) {
      typeText('ERROR: REMANENCE not isolated')
      typeText('Please use ISOLATE command first')
    } else {
      const parts = command.replace('DECRYPT ', '').split(' WITH ')
      const target = parts[0].trim()
      const password = parts[1]?.trim()

      if (target === 'REMANENCE' || target === 'REMANANCE') {
        console.log(password)
        if (password === undefined) {
          typeText('ERROR: Une clé de décryptage est nécessaire')
          typeText('Please use DECRYPT <PROGRAM> WITH <KEY>')
        } else if (password === 'ECHO') {
          gridStore.remanenceDecrypted = true
          let loadingDots = 0
          terminalContent.value.push('Decrypting data cluster...')
          const loadingInterval = setInterval(() => {
            loadingDots = (loadingDots + 1) % 3
            terminalContent.value[terminalContent.value.length - 1] = 
              'Decrypting data cluster' + '.' + '.'.repeat(loadingDots)
          }, 500)

          setTimeout(() => {
            clearInterval(loadingInterval)
            setTimeout(() => {
              typeText('Decryption finished.')
              setTimeout(() => {
                typeText('Partial fragments recovered:')
                setTimeout(() => {
                  typeText('[R] [E] [M] [_] [_] [E] [_] [_] [C] [E]')
                  typeText('>> Message from REMANENCE: <<')
                  typeText('>>"CLU ve_t me sup_r_mer. Il a p_ur _e moi. "<<')
                  typeText('>>"Il a p_ur... de c_ que je re_sens "<<')
                  setTimeout(() => {
                    typeText('Data stability: 45%')
                    typeText('Next step: RESTORE FRAGMENTS')
                    
                    // Ajout du prompt pour le dossier secret après un court délai
                    setTimeout(() => {
                      showSecretFilePrompt.value = true
                    }, 4000)
                  }, 1000)
                }, 1000)
              }, 1000)
            }, 1000)
          }, 7000)
        } else {
          typeText('ERROR: Invalid decryption key.')
          typeText('Please verify the key and try again.')
        }
      } else {
        typeText('ERROR: Target not recognized or not isolated.')
        typeText('Please use ISOLATE command first.')
      }
    }
  } else if (command.startsWith('RESTORE FRAGMENTS')) {
    if (!gridStore.remanenceDecrypted) {
      typeText('ERROR: Fragmented program data not found')
      typeText('Please decrypt the program first')
    } else {
      passwordError.value = ''
      showPasswordModal.value = true
    }
  } else if (command === 'STOP MORSE') {
    // Arrêter la transmission morse
    emit('stopMorse')
    typeText('Morse code transmission stopped.')
    typeText('Signal terminated. Channel closed.')
  } else {
    typeText('Command not recognized. Type "HELP" for available commands')
  }
}

// Fonction pour vérifier le mot de passe RESTORE
const checkRestorePassword = () => {
  const correctPassword = import.meta.env.VITE_APP_RESTORE_KEY

  if (passwordInput.value === correctPassword) {
    // Mot de passe correct
    showPasswordModal.value = false
    passwordInput.value = ''
    passwordAttempts.value = 0
    
    // Animation de restauration
    let loadingDots = 0
    terminalContent.value.push('Attempting restoration...')
    const loadingInterval = setInterval(() => {
      loadingDots = (loadingDots + 1) % 4
      terminalContent.value[terminalContent.value.length - 1] = 
        'Attempting restoration' + '.'.repeat(loadingDots)
    }, 500)

    setTimeout(() => {
      clearInterval(loadingInterval)
      setTimeout(() => {
        typeText('Matrix repair initiated.')
        setTimeout(() => {
          typeText('Data sequence re-aligned:')
          setTimeout(() => {
            typeText('[R] [E] [M] [A] [N] [E] [N] [C] [E]:')
            setTimeout(() => {
              typeText('>> REMANENCE STATUS: ACTIVE')
              typeText('>> "Je suis là. Je suis encore là."')
              typeText('Extraction possible')
              typeText('EXTRACT REMANANCE')
            }, 1000)
          }, 1000)
        }, 1000)
      }, 1000)
    }, 7000)
    
  } else {
    // Mot de passe incorrect
    passwordAttempts.value++
    
    if (passwordAttempts.value >= 5) {
      // Trop de tentatives échouées
      showPasswordModal.value = false
      passwordInput.value = ''
      typeText('ERROR: Too many failed attempts')
      typeText('System protection protocol engaged')
      typeText('RESTORE command temporarily disabled')
      passwordAttempts.value = 0
    } else {
      // Montrer l'erreur dans la fenêtre modale
      passwordError.value = `Invalid password. Attempts: ${passwordAttempts.value}/3`
    }
  }
}

// Fonction pour ouvrir le dossier secret (afficher la vidéo)
const openSecretFile = () => {
  showSecretFilePrompt.value = false
  videoPath.value = 'videos/video2_flynn.mp4'
  showVideo.value = true
}

// Fonction pour fermer le prompt du dossier secret
const closeSecretFilePrompt = () => {
  showSecretFilePrompt.value = false
}

// Fonction pour gérer la fin de la vidéo
const videoEnded = () => {
  showVideo.value = false
  typeText('>> TRANSMISSION TERMINÉE <<')
}

const closePasswordModal = () => {
  showPasswordModal.value = false
  passwordInput.value = ''
}

const closeLogWindow = () => {
  showLogWindow.value = false
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
  
  if (isMinimized.value) {
    windowStore.minimizeWindow({
      id: terminalId,
      title: 'Terminal',
      type: 'terminal',
      timestamp: Date.now()
    })
  } else {
    windowStore.restoreWindow(terminalId)
  }
}

// Watch for changes in the window store
watch(
  () => windowStore.minimizedWindows,
  (minimizedWindows) => {
    // Check if this window is in the minimized list
    const isInList = minimizedWindows.some(w => w.id === terminalId)
    isMinimized.value = isInList
  },
  { deep: true }
)

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
      width: window.innerWidth, 
      height: window.innerHeight * 0.95 
    }
    
    // Center the window
    windowPosition.value = { x: 50, y: 50 }
  }
  
  isMaximized.value = !isMaximized.value
}

const toggleClose = () => {
  const taskbarIcon = document.querySelector('.taskbar-icon.terminal-icon')
  if (taskbarIcon) {
    const rect = taskbarIcon.getBoundingClientRect()
    terminalPosition.value = { 
      x: rect.left + rect.width / 2, 
      y: rect.top + rect.height / 2 
    }
  }

  isClosing.value = true
  
  setTimeout(() => {
    emit('close')
    isClosing.value = false
  }, 500)
}

// Add restore function that can be called from TaskBar
const restore = () => {
  isMinimized.value = false
  windowStore.restoreWindow(terminalId)
}

onMounted(() => {
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', () => {
    stopDrag()
    stopResize()
  })
  
  // Use typing effect for initializing messages
  setTimeout(() => {
    terminalContent.value = [] // Clear initial text
    
    typeText('TRON OS v1.0.0')
    typeText('Copyright © ENCOM 2024')
    typeText('Initiating system...')
    
    setTimeout(() => {
      if (gridStore.gridAccessed) {
        typeText('Vous êtes connectées à la grille, faites vite !')
        typeText('CLU ne doit surtout pas vous trouver !')
      } else {
        typeText('System initialized')
        typeText('Bienvenue, Vous êtes projetées dans une instance de simulation.')
        typeText('Mission : retrouver REMANENCE. Progression : 0%.')
        typeText('Chaque programme suit une fonction. Mais certaines... transcendent leur code.')
        typeText('Ready for input. Type "HELP" for available commands')
      }
    }, 1500)
  }, 500)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

defineExpose({
  terminalId,
  restore
})
</script>

<template>
  <div class="terminal-window" 
       :class="{ 
         'minimized': isMinimized, 
         'maximized': isMaximized,
         'closing': isClosing,
         'dragging': isDragging,
         'resizing': isResizing,
         'surge-mode': gridStore.isSurging
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
        <div class="control minimize" @click="toggleMaximize"></div>
        <div class="control maximize" @click="toggleMinimize"></div>
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

    <!-- Fenêtre modale pour le mot de passe RESTORE -->
    <div class="password-modal" v-if="showPasswordModal">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">RESTORATION PROTOCOL</div>
          <div class="modal-close" @click="closePasswordModal">×</div>
        </div>
        <div class="modal-body">
          <p>Enter authorization key to proceed with restoration:</p>
          <div class="input-group">
            <input 
              type="password" 
              v-model="passwordInput" 
              class="password-input"
              @keyup.enter="checkRestorePassword"
              placeholder="Enter key"
              autofocus
            />
          </div>
          <div class="error-message" v-if="passwordError">{{ passwordError }}</div>
        </div>
        <div class="modal-footer">
          <button @click="checkRestorePassword" class="confirm-button">CONFIRM</button>
          <button @click="closePasswordModal" class="cancel-button">CANCEL</button>
        </div>
      </div>
    </div>
    
    <!-- Prompt pour le dossier secret -->
    <div class="secret-file-prompt" v-if="showSecretFilePrompt">
      <div class="prompt-content">
        <div class="prompt-message">DOSSIER SECRET DÉCOUVERT. VOULEZ-VOUS LE CONSULTER ?</div>
        <div class="prompt-buttons">
          <button @click="openSecretFile" class="confirm-button">OUI</button>
          <button @click="closeSecretFilePrompt" class="cancel-button">NON</button>
        </div>
      </div>
    </div>
    
    <!-- Overlay pour la vidéo -->
    <div class="video-overlay" v-if="showVideo">
      <div class="video-container">
        <video 
          :src="videoPath" 
          controls 
          autoplay 
          @ended="videoEnded"
          class="secret-video"
        ></video>
        <button @click="videoEnded" class="close-video">×</button>
      </div>
    </div>
    
  </div>
  
  <!-- Fenêtre de log qui apparaît lors de la commande LOG BRADLEY -->
  <LogWindow v-if="showLogWindow" @close="closeLogWindow" />
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
    transition: none;
    user-select: none;
  }
  
  &.resizing {
    box-shadow: 0 0 25px var(--tron-blue), 0 0 50px rgba(0, 204, 255, 0.4);
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
    transform: translate(
      calc(var(--target-x) - 50%), 
      calc(var(--target-y) - 50%)
    ) scale(0.1);
    opacity: 0;
    box-shadow: 0 0 30px var(--tron-blue);
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
  
  &.surge-mode {
    border-color: var(--tron-accent, #ff00aa);
    box-shadow: 0 0 15px var(--tron-accent, #ff00aa), 0 0 30px rgba(255, 0, 170, 0.3);
    
    .terminal-titlebar {
      background: linear-gradient(to right, #5a1500, #2a0010);
    }
    
    .prompt, .terminal-line, .terminal-input {
      color: #ffcc99;
      text-shadow: 0 0 2px #ff8800;
    }
    
    .resize-handle:hover {
      background-color: rgba(255, 136, 0, 0.2);
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
  cursor: move;
  
  &.dragging {
    cursor: grabbing;
    background: linear-gradient(to right, var(--tron-blue), var(--tron-blue-dark));
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
  
  /* Enhanced terminal scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 20, 40, 0.6);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--tron-blue-dark);
    border-radius: 4px;
    border: 1px solid var(--tron-blue);
    box-shadow: 0 0 5px var(--tron-blue);
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: var(--tron-blue);
    box-shadow: 0 0 10px var(--tron-blue);
  }
  
  /* Surge mode scrollbar */
  .surge-mode & {
    &::-webkit-scrollbar-thumb {
      background: #5a1500;
      border: 1px solid var(--surge-color);
      box-shadow: 0 0 5px var(--surge-color);
    }
    
    &::-webkit-scrollbar-thumb:hover {
      background: var(--surge-color);
      box-shadow: 0 0 10px var(--surge-color);
    }
  }
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

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.terminal-input::after {
  content: '_';
  animation: blink 1s step-end infinite;
}

/* Style pour la fenêtre modale du mot de passe */
.password-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-content {
  width: 400px;
  background-color: rgba(0, 20, 40, 0.95);
  border: 2px solid var(--tron-blue);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 20px var(--tron-blue), 0 0 40px rgba(0, 204, 255, 0.4);
  animation: appear 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: linear-gradient(to right, var(--tron-blue-dark), var(--tron-background));
  border-bottom: 1px solid var(--tron-blue);
}

.modal-title {
  color: var(--tron-blue-light);
  font-weight: bold;
  font-size: 16px;
  text-shadow: 0 0 5px var(--tron-blue);
}

.modal-close {
  font-size: 24px;
  cursor: pointer;
  color: var(--tron-text-color);
  
  &:hover {
    color: var(--tron-blue-light);
    text-shadow: 0 0 8px var(--tron-blue);
  }
}

.modal-body {
  padding: 20px;
  
  p {
    color: var(--tron-text-color);
    margin-bottom: 15px;
  }
}

.password-input {
  width: 100%;
  padding: 10px;
  background-color: rgba(0, 10, 30, 0.7);
  border: 1px solid var(--tron-blue);
  border-radius: 4px;
  color: var(--tron-blue-light);
  font-family: 'Consolas', monospace;
  font-size: 16px;
  outline: none;
  
  &:focus {
    box-shadow: 0 0 10px var(--tron-blue);
  }
}

.error-message {
  color: #ff6b6b;
  margin-top: 10px;
  font-size: 14px;
  text-shadow: 0 0 5px rgba(255, 107, 107, 0.7);
}

.modal-footer {
  padding: 15px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid rgba(0, 204, 255, 0.3);
}

button.confirm-button, 
button.cancel-button {
  padding: 8px 15px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s ease;
}

button.confirm-button {
  background-color: rgba(0, 20, 40, 0.9);
  color: var(--tron-blue-light);
  border-color: var(--tron-blue);
  
  &:hover {
    background-color: rgba(0, 60, 100, 0.9);
    box-shadow: 0 0 10px var(--tron-blue);
  }
}

button.cancel-button {
  background-color: rgba(40, 10, 10, 0.9);
  color: #ff6b6b;
  border-color: #ff6b6b;
  
  &:hover {
    background-color: rgba(60, 20, 20, 0.9);
    box-shadow: 0 0 10px #ff6b6b;
  }
}

/* Style pour le prompt du dossier secret */
.secret-file-prompt {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 20, 40, 0.9);
  border: 2px solid var(--tron-blue);
  border-radius: 8px;
  padding: 15px;
  width: 80%;
  max-width: 500px;
  box-shadow: 0 0 20px var(--tron-blue), 0 0 40px rgba(0, 204, 255, 0.4);
  animation: appear 0.3s ease;
  z-index: 102;
}

.prompt-content {
  text-align: center;
}

.prompt-message {
  color: var(--tron-blue-light);
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 15px;
  text-shadow: 0 0 5px var(--tron-blue);
}

.prompt-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
}

/* Video overlay styles */
.video-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.video-container {
  position: relative;
  width: 94%;
  aspect-ratio: 16/9;
  background: #000;
  border: 2px solid var(--tron-blue);
  border-radius: 8px;
  box-shadow: 0 0 30px var(--tron-blue);
}

.secret-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.close-video {
  position: absolute;
  top: -15px;
  right: -15px;
  width: 30px;
  height: 30px;
  background-color: rgba(0, 20, 40, 0.9);
  border: 2px solid var(--tron-blue);
  border-radius: 50%;
  color: var(--tron-blue-light);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 301;
  
  &:hover {
    background-color: rgba(0, 60, 100, 0.9);
    box-shadow: 0 0 10px var(--tron-blue);
  }
}

@keyframes appear {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
