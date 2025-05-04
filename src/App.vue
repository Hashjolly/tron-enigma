<script setup lang="ts">
import { RouterView } from 'vue-router'
import GridBackground from './components/GridBackground.vue'
import TronTerminal from './components/TronTerminal.vue'
import TaskBar from './components/TaskBar.vue'
import TronAudioPlayer from './components/TronAudioPlayer.vue'
import LogWindow from './components/LogWindow.vue'
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAudioStore } from './stores/audioStore'
import { useGridStore } from './stores/gridStore'
import { useWindowStore } from './stores/windowStore'

// État pour la vidéo d'intro
const showIntroVideo = ref(true)
const introVideoEnded = ref(false)
const introVideoRef = ref<HTMLVideoElement | null>(null)
const videoStarted = ref(false) // État pour suivre si la vidéo a démarré avec son
const audioPermissionGranted = ref(false) // Nouvel état pour suivre si l'autorisation audio est accordée

const showTerminal = ref(false)
const showLogWindow = ref(false)
const audioStore = useAudioStore()
const gridStore = useGridStore()
const windowStore = useWindowStore()
const showAudioPrompt = ref(true)
const terminalRef = ref(null)
const logWindowRef = ref(null)

// Référence à l'élément audio morse
const morseAudioRef = ref<HTMLAudioElement | null>(null)
const morseVolume = ref(0.1) // Volume initial très bas
const maxMorseVolume = 0.4 // Volume maximum réduit
const volumeIncrementInterval = ref<number | null>(null)

// Fonction appelée quand la vidéo d'intro se termine
const onIntroVideoEnded = () => {
  introVideoEnded.value = true
  
  // Transition en fondu
  setTimeout(() => {
    showIntroVideo.value = false
    
    // Initialiser l'audio principal et le morse après la transition
    // Uniquement si l'autorisation audio a été accordée via le bouton de la vidéo
    nextTick(() => {
      if (audioPermissionGranted.value) {
        // Lancer la musique
        audioStore.play()
        
        // Démarrer le morse
        initMorseAudio()
        
        // Cacher le prompt audio puisqu'il n'est plus nécessaire
        showAudioPrompt.value = false
      }
    })
  }, 1000)
}

// Fonction pour démarrer la vidéo avec son après interaction utilisateur
const startVideoWithSound = () => {
  if (!introVideoRef.value || videoStarted.value) return
  
  // Retirer le mode silencieux
  introVideoRef.value.muted = false
  
  // Si la vidéo était déjà en cours, la redémarrer pour avoir le son depuis le début
  introVideoRef.value.currentTime = 105
  
  // Marquer l'autorisation audio comme accordée
  audioPermissionGranted.value = true
  
  // Préparer les éléments audio pendant que le contexte d'interaction utilisateur est actif
  // Pour la musique principale
  audioStore.attemptAutoplay()
  
  // Pour le morse audio - créer l'élément si nécessaire
  if (morseAudioRef.value) {
    // Charger l'audio morse en arrière-plan mais ne pas encore le jouer
    morseAudioRef.value.load()
  }
  
  // Lancer la lecture de la vidéo
  introVideoRef.value.play()
    .then(() => {
      videoStarted.value = true
    })
    .catch(error => {
      console.error("Impossible de lire la vidéo avec son:", error)
    })
}

// Initialiser l'audio morse
const initMorseAudio = () => {
  if (!morseAudioRef.value) return
  
  morseAudioRef.value.volume = morseVolume.value
  morseAudioRef.value.loop = true
  
  // Tentative de lecture
  morseAudioRef.value.play()
    .catch(error => {
      console.warn("Morse audio autoplay blocked:", error)
      // On va tenter de démarrer l'audio lors d'une interaction utilisateur
    })
  
  // Programmer l'augmentation progressive du volume (de 0.001 à 0.02 en 30min)
  const totalTimeMs = 30 * 60 * 1000 // 30 minutes en millisecondes
  const volumeRange = maxMorseVolume - morseVolume.value
  const updateIntervalMs = 30000 // Mise à jour toutes les 30 secondes
  const incrementPerInterval = volumeRange / (totalTimeMs / updateIntervalMs)
  
  volumeIncrementInterval.value = window.setInterval(() => {
    morseVolume.value = Math.min(maxMorseVolume, morseVolume.value + incrementPerInterval)
    
    if (morseAudioRef.value) {
      morseAudioRef.value.volume = morseVolume.value
    }
    
    // Si on atteint le volume max, on arrête l'intervalle
    if (morseVolume.value >= maxMorseVolume && volumeIncrementInterval.value) {
      clearInterval(volumeIncrementInterval.value)
      volumeIncrementInterval.value = null
    }
  }, updateIntervalMs)
}

// Fonction pour arrêter l'audio morse
const stopMorseAudio = () => {
  if (morseAudioRef.value) {
    morseAudioRef.value.pause();
    morseAudioRef.value.currentTime = 0;
  }
  
  // Arrêter également l'intervalle d'augmentation du volume
  if (volumeIncrementInterval.value) {
    clearInterval(volumeIncrementInterval.value);
    volumeIncrementInterval.value = null;
  }
}

// Mettre en place un bouton audio dans la TaskBar
const toggleAudio = () => {
  audioStore.togglePlayer()
}

// Fonction pour activer l'audio en réponse à une interaction utilisateur
const enableAudio = () => {
  if (audioStore.autoplayBlocked) {
    audioStore.attemptAutoplay()
    // Force the audio to play without changing the isPlaying state
    document.querySelector('audio')?.play()
      .catch(() => console.log('Play still failed'))
    showAudioPrompt.value = false
  }
  
  // Essayer aussi de démarrer l'audio morse
  if (morseAudioRef.value && morseAudioRef.value.paused) {
    morseAudioRef.value.play()
      .catch(error => console.warn("Morse audio still blocked:", error))
  }
}

// Handle restoring windows from taskbar
const handleRestoreWindow = (windowId: string) => {
  if (windowId === 'terminal-main') {
    showTerminal.value = true
    // Wait for next tick to ensure terminal is rendered
    nextTick(() => {
      if (terminalRef.value) {
        terminalRef.value.restore()
      }
    })
  } else if (windowId === 'log-window-bradley') {
    // showLogWindow.value = true
    // Wait for next tick to ensure window is rendered
    // nextTick(() => {
    //   if (logWindowRef.value) {
    //     logWindowRef.value.restore()
    //   }
    // })
  }
}

// Cacher le prompt après un certain temps
onMounted(() => {
  // Démarrer la vidéo d'intro (initialement en mode muet pour permettre l'autoplay)
  if (introVideoRef.value) {
    try {
      introVideoRef.value.play()
        .catch(error => {
          console.warn("Intro video autoplay blocked:", error)
          // Si la lecture automatique est bloquée, on saute l'intro
          showIntroVideo.value = false
        })
    } catch (error) {
      console.error("Error playing intro video:", error)
      showIntroVideo.value = false
    }
  }

  // Ne pas essayer de lancer l'audio au démarrage, mais attendre l'interaction utilisateur
  // via le bouton d'activation du son de la vidéo
  
  setTimeout(() => {
    if (!audioStore.autoplayBlocked || audioPermissionGranted.value) {
      showAudioPrompt.value = false
    }
  }, 10000)
  
  // Initialiser l'audio morse
  nextTick(() => {
    initMorseAudio()
  })
})

// Nettoyage des ressources lors de la destruction du composant
onBeforeUnmount(() => {
  gridStore.stopCountdown()
  
  // Nettoyer l'intervalle d'augmentation du volume
  if (volumeIncrementInterval.value) {
    clearInterval(volumeIncrementInterval.value)
    volumeIncrementInterval.value = null
  }
})
</script>

<template>
  <div>
    <!-- Overlay de la vidéo d'intro -->
    <div v-if="showIntroVideo" class="intro-video-container" :class="{ 'fade-out': introVideoEnded }">
      <video 
        ref="introVideoRef" 
        class="intro-video" 
        src="/videos/video1.mp4" 
        @ended="onIntroVideoEnded"
        autoplay 
        muted
      ></video>
      
      <!-- Bouton pour démarrer la vidéo avec son et autoriser la lecture audio future -->
      <div v-if="!videoStarted" class="video-sound-prompt" @click="startVideoWithSound">
        <div class="prompt-icon">🔊</div>
        <div class="prompt-text">Cliquez pour activer le son</div>
      </div>
    </div>

    <!-- Contenu principal de l'application -->
    <div class="tron-container" @click="enableAudio" :class="{ 'surge-mode': gridStore.isSurging, 'hidden': showIntroVideo }">
      <GridBackground />
      
      <!-- Audio en arrière-plan pour le morse -->
      <audio 
        ref="morseAudioRef" 
        src="/audio/morse/morse-secret.wav" 
        preload="auto"
      ></audio>
      
      <!-- Compte à rebours en haut de l'écran -->
      <div v-if="gridStore.countdownStarted" class="global-countdown-container">
        <div class="global-countdown" :class="{ 'warning': gridStore.timeRemaining < 600 }">
          {{ gridStore.formattedTime }}
        </div>
      </div>
      
      <div class="content">
        <TronTerminal 
          ref="terminalRef"
          v-if="showTerminal" 
          @close="showTerminal = false"
          @stopMorse="stopMorseAudio"
        />
        <LogWindow 
          ref="logWindowRef"
          v-if="showLogWindow" 
          @close="showLogWindow = false" 
        />
        <TronAudioPlayer />
      </div>
      
      <TaskBar 
        @openTerminal="showTerminal = true" 
        @toggleAudio="toggleAudio"
        @restoreWindow="handleRestoreWindow"
      />
      
      <!-- Add prominent audio enable button -->
      <div v-if="showAudioPrompt && audioStore.autoplayBlocked" class="audio-prompt" @click.stop="enableAudio">
        <div class="prompt-content">
          <div class="prompt-icon">▶️</div>
          <div class="prompt-text">Cliquez pour activer l'ambiance sonore</div>
        </div>
        <button class="close-prompt" @click.stop="showAudioPrompt = false">×</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
:root {
  --tron-blue: #00ccff;
  --tron-blue-light: #50e3ff;
  --tron-blue-dark: #005a7a;
  --tron-glow: 0 0 10px #00ccff, 0 0 20px #00ccff, 0 0 30px #00ccff;
  --tron-background: #000a12;
  --tron-grid-color: rgba(0, 127, 171, 0.3);
  --tron-text-color: #d0f3ff;
  --tron-accent: #ff00aa;
  --tron-accent-glow: 0 0 10px #ff00aa, 0 0 20px #ff00aa;
  
  /* Couleurs pour le mode surge */
  --surge-color: #ff8800;
  --surge-light: #ffcc99;
  --surge-dark: #5a1500;
  --surge-glow: 0 0 10px #ff8800, 0 0 20px #ff8800;
  --surge-text: #ffcc99;
}

/* Fix font loading method - direct @import with display swap */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');

/* Styles pour la vidéo d'intro */
.intro-video-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: black;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 1s ease;
  
  &.fade-out {
    opacity: 0;
  }
}

/* Ajout du style pour le bouton d'activation du son */
.video-sound-prompt {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid white;
  border-radius: 8px;
  padding: 12px 20px;
  gap: 15px;
  z-index: 10000;
  cursor: pointer;
  animation: pulse 2s infinite alternate;
  
  .prompt-icon {
    font-size: 24px;
    color: white;
  }
  
  .prompt-text {
    color: white;
    font-weight: 500;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
  }
  
  &:hover {
    background: rgba(0, 0, 0, 0.9);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  }
  
  @keyframes pulse {
    from { opacity: 0.8; transform: translateX(-50%) scale(0.98); }
    to { opacity: 1; transform: translateX(-50%) scale(1); }
  }
}

.intro-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: var(--tron-background);
  color: var(--tron-text-color);
  font-family: 'Orbitron', sans-serif; /* Simplified font-family with proper fallback */
}

#app {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
}

.tron-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
  
  &.hidden {
    opacity: 0;
  }
  
  &.surge-mode {
    /* Effet global du mode "surge" sur toute l'application */
    --tron-blue: var(--surge-color);
    --tron-blue-light: var(--surge-light);
    --tron-blue-dark: var(--surge-dark);
    --tron-glow: var(--surge-glow);
    --tron-text-color: var(--surge-text);
    
    /* Effets supplémentaires pour le mode surge */
    .taskbar {
      border-top-color: var(--surge-color) !important;
      box-shadow: 0 -2px 15px rgba(255, 136, 0, 0.3) !important;
    }
    
    .taskbar-icon {
      border-color: var(--surge-color) !important;
    }
    
    .global-countdown {
      color: #ff5500 !important;
      border-color: #ff5500 !important;
      text-shadow: 0 0 5px #ff0000 !important;
      animation: pulse-warning 1s infinite alternate;
    }
    
    a {
      color: var(--surge-light) !important;
      text-shadow: 0 0 5px var(--surge-color) !important;
      
      &:hover {
        text-shadow: var(--surge-glow) !important;
      }
    }
    
    .control-btn {
      border-color: var(--surge-color) !important;
      color: var(--surge-light) !important;
    }
    
    .audio-player {
      border-color: var(--surge-color) !important;
      box-shadow: 0 0 15px rgba(255, 136, 0, 0.3) !important;
    }
    
    .terminal-window {
      border-color: var(--surge-color) !important;
      box-shadow: 0 0 15px var(--surge-dark), 0 0 30px rgba(255, 136, 0, 0.3) !important;
      
      .terminal-titlebar {
        background: linear-gradient(to right, #5a1500, #2a0010) !important;
      }
      
      .prompt, .terminal-line, .terminal-input {
        color: #ffcc99 !important;
        text-shadow: 0 0 2px #ff8800 !important;
      }
    }
  }
}

.content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
  padding: 20px;
}

a {
  color: var(--tron-blue-light);
  text-decoration: none;
  text-shadow: 0 0 5px var(--tron-blue);
  transition: all 0.3s ease;
  
  &:hover {
    color: white;
    text-shadow: var(--tron-glow);
  }
}

/* Compte à rebours global */
.global-countdown-container {
  position: fixed;
  top: 10px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: 1;
  transition: all 0.3s ease;
}

.global-countdown {
  background-color: rgba(0, 20, 40, 0.7);
  padding: 4px 15px;
  border-radius: 6px;
  font-family: 'Consolas', monospace;
  font-size: 20px;
  font-weight: bold;
  color: var(--tron-blue-light);
  text-shadow: 0 0 5px var(--tron-blue);
  border: 2px solid var(--tron-blue);
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
  box-shadow: 0 0 15px rgba(0, 204, 255, 0.3);
  
  &.warning {
    color: #ff5500;
    border-color: #ff5500;
    text-shadow: 0 0 5px #ff0000;
    animation: pulse-warning 1s infinite alternate;
  }
}

@keyframes pulse-warning {
  from { box-shadow: 0 0 5px #ff0000; }
  to { box-shadow: 0 0 15px #ff0000; }
}

/* New Audio Prompt */
.audio-prompt {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  background: rgba(0, 30, 60, 0.8);
  border: 2px solid var(--tron-blue);
  border-radius: 8px;
  padding: 12px 20px;
  gap: 15px;
  z-index: 100;
  animation: fadeIn 0.5s ease, float 3s ease-in-out infinite;
  backdrop-filter: blur(5px);
  box-shadow: 0 0 20px rgba(0, 204, 255, 0.5);
  cursor: pointer;
  
  &:hover {
    background: rgba(0, 40, 70, 0.9);
    box-shadow: 0 0 30px rgba(0, 204, 255, 0.8);
  }
  
  .prompt-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .prompt-icon {
    font-size: 24px;
  }
  
  .prompt-text {
    color: var(--tron-blue-light);
    font-weight: 500;
    text-shadow: 0 0 5px var(--tron-blue);
  }
  
  .close-prompt {
    background: transparent;
    border: none;
    color: var(--tron-text-color);
    font-size: 20px;
    cursor: pointer;
    padding: 0 5px;
    opacity: 0.7;
    
    &:hover {
      opacity: 1;
    }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-5px); }
  }
}

@font-face {
  font-family: 'Orbitron';
  src: url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');
}
</style>
