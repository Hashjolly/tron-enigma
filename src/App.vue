<script setup lang="ts">
import { RouterView } from 'vue-router'
import GridBackground from './components/GridBackground.vue'
import TronTerminal from './components/TronTerminal.vue'
import TaskBar from './components/TaskBar.vue'
import TronAudioPlayer from './components/TronAudioPlayer.vue'
import LogWindow from './components/LogWindow.vue'
import MirrorGame from './components/MirrorGame.vue'
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

// État pour la transition glitch
const showGlitchTransition = ref(false)

const showTerminal = ref(false)
const showLogWindow = ref(false)
const audioStore = useAudioStore()
const gridStore = useGridStore()
const windowStore = useWindowStore()
const showAudioPrompt = ref(true)
const terminalRef = ref(null)
const logWindowRef = ref(null)

// État pour la barre d'URL fictive
const fakeUrl = ref('tron://os.encom/grid')
const showMirrorGame = ref(false)
const mirrorGameRef = ref(null)

// Référence à l'élément audio morse
const morseAudioRef = ref<HTMLAudioElement | null>(null)
const morseVolume = ref(0.01) // Volume initial très bas
const maxMorseVolume = 0.4 // Volume maximum réduit
const volumeIncrementInterval = ref<number | null>(null)

// État pour la gestion de l'audio pendant les vidéos
const previousAudioState = ref({
  musicWasPlaying: false,
  morseWasPlaying: false,
  morseVolume: 0.1 // Ajout pour stocker le volume précédent du morse
})

// État pour l'écran de fin
const showEndScreen = ref(false)
const endCredits = ref('')

// Fonction pour vérifier si l'URL contient /NETMODE
const checkNetMode = () => {
  if (fakeUrl.value.endsWith('/netmode')) {
    showMirrorGame.value = true;
  } else {
    showMirrorGame.value = false;
  }
}

// Fonction pour gérer la saisie dans la barre d'URL
const handleUrlInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  fakeUrl.value = input.value;
  checkNetMode();
}

// Fonction pour gérer la soumission de l'URL (quand on appuie sur Entrée)
const handleUrlSubmit = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    // Vérifier si l'URL a changé
    checkNetMode();
    // Simuler un effet de chargement rapide
    const urlInput = event.target as HTMLInputElement;
    urlInput.disabled = true;
    setTimeout(() => {
      urlInput.disabled = false;
      urlInput.focus();
    }, 300);
  }
}

// Fonction pour fermer la fenêtre MirrorGame
const closeMirrorGame = () => {
  showMirrorGame.value = false;
  
  // Mettre à jour l'URL fictive pour retirer /NETMODE
  if (fakeUrl.value.endsWith('/netmode')) {
    fakeUrl.value = fakeUrl.value.replace('/netmode', '');
  }
}

// Fonction appelée quand la vidéo d'intro se termine
const onIntroVideoEnded = () => {
  introVideoEnded.value = true
  
  // Afficher l'effet de glitch pendant un moment
  showGlitchTransition.value = true
  
  // Après un délai pour l'effet de glitch, cacher la vidéo et l'effet
  setTimeout(() => {
    showIntroVideo.value = false
    
    // On laisse l'effet glitch un moment supplémentaire pour la transition
    setTimeout(() => {
      showGlitchTransition.value = false
      
      // Initialiser l'audio principal et le morse après la transition
      nextTick(() => {
        if (audioPermissionGranted.value) {
          // Lancer la musique
          audioStore.play()
          
          // Démarrer le morse
          initMorseAudio()
          
          // Cacher le prompt audio puisqu'il n'est plus nécessaire
          showAudioPrompt.value = false
        }
        showTerminal.value = true
      })
    }, 1200) // Durée de l'effet après que la vidéo a disparu
  }, 800) // Durée de l'effet pendant que la vidéo est encore visible
}

// Fonction pour démarrer la vidéo avec son après interaction utilisateur
const startVideoWithSound = () => {
  if (!introVideoRef.value || videoStarted.value) return
  
  // Retirer le mode silencieux
  introVideoRef.value.muted = false
  
  // Si la vidéo était déjà en cours, la redémarrer pour avoir le son depuis le début
  introVideoRef.value.currentTime = 0
  
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
  const totalTimeMs = 45 * 60 * 1000 // 30 minutes en millisecondes
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

// Nouvelles fonctions pour gérer l'audio pendant la lecture de vidéos
const pauseAllAudio = () => {
  // Sauvegarder l'état actuel de l'audio
  previousAudioState.value.musicWasPlaying = audioStore.isPlaying
  previousAudioState.value.morseWasPlaying = morseAudioRef.value && !morseAudioRef.value.paused
  
  // Sauvegarder le volume actuel du morse avant de le mettre en pause
  if (morseAudioRef.value) {
    previousAudioState.value.morseVolume = morseAudioRef.value.volume
  }
  
  // Mettre en pause la musique d'ambiance
  if (audioStore.isPlaying) {
    audioStore.pause()
  }
  
  // Mettre en pause le morse
  if (morseAudioRef.value && !morseAudioRef.value.paused) {
    morseAudioRef.value.pause()
  }
}

const resumeAllAudio = () => {
  // Reprendre la musique si elle était en cours
  if (previousAudioState.value.musicWasPlaying) {
    audioStore.play()
  }
  
  // Reprendre le morse s'il était en cours avec son volume précédent
  if (previousAudioState.value.morseWasPlaying && morseAudioRef.value) {
    // Restaurer le volume du morse avant de relancer la lecture
    morseAudioRef.value.volume = previousAudioState.value.morseVolume
    morseVolume.value = previousAudioState.value.morseVolume // Synchroniser aussi la variable réactive
    
    morseAudioRef.value.play()
      .catch(error => console.warn("Could not resume morse audio:", error))
  }
}

// Gérer le démarrage d'une vidéo depuis le terminal
const handleVideoStarted = () => {
  pauseAllAudio()
}

// Gérer la fin d'une vidéo depuis le terminal
const handleVideoEnded = () => {
  resumeAllAudio()
}

// Fonction pour afficher l'écran de fin après avoir terminé le jeu
const handleGameCompleted = (endingType: string) => {
  // Arrêter tous les audios
  if (morseAudioRef.value) {
    morseAudioRef.value.pause();
    morseAudioRef.value.currentTime = 0;
  }

  // Arrêter la musique ambiante
  audioStore.pause();
  
  // Nettoyer les intervalles d'augmentation du volume
  if (volumeIncrementInterval.value) {
    clearInterval(volumeIncrementInterval.value);
    volumeIncrementInterval.value = null;
  }
  
  // Définir le message de fin en fonction du choix
  endCredits.value = endingType === 'merge' ? 
    'Vous avez fusionné avec REMANENCE' : 
    'Vous avez supprimé REMANENCE';
  
  // Afficher l'écran de fin
  showEndScreen.value = true;
  
  // Jouer la musique de fin
  const endMusic = new Audio('/public/audio/End_titles.mp3');
  endMusic.volume = 0.5;
  endMusic.play().catch(err => console.error("Couldn't play end music:", err));
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
  
  // Vérifier l'URL initiale
  checkNetMode()
})

// Nettoyage des ressources lors de la destruction du composant
onBeforeUnmount(() => {
  gridStore.stopCountdown()
  
  // Nettoyer l'intervalle d'augmentation du volume
  if (volumeIncrementInterval.value) {
    clearInterval(volumeIncrementInterval.value);
    volumeIncrementInterval.value = null;
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

    <!-- Effet de transition glitch -->
    <div v-if="showGlitchTransition" class="glitch-overlay">
      <div class="glitch-container">
        <div class="glitch-item"></div>
        <div class="glitch-item"></div>
        <div class="glitch-item"></div>
        <div class="glitch-item"></div>
        <div class="glitch-item"></div>
      </div>
    </div>

    <!-- Écran de fin -->
    <div v-if="showEndScreen" class="end-screen">
      <div class="end-content">
        <h1 class="end-title">Félicitations agentes</h1>
        <p class="end-choice">{{ endCredits }}</p>
        <h2 class="end-subtitle">_Fin de transmission_</h2>
        <div class="end-credits">
          <p>Crédits :</p>
          <p>Hash, Nelson</p>
        </div>
      </div>
    </div>

    <!-- Contenu principal de l'application -->
    <div class="tron-container" @click="enableAudio" :class="{ 
      'surge-mode': gridStore.isSurging, 
      'hidden': showIntroVideo || showGlitchTransition || showEndScreen,
      'appear-animation': !showIntroVideo && !showGlitchTransition && !showEndScreen
    }">
      <!-- Barre d'URL fictive -->
      <div class="fake-browser-bar">
        <div class="url-container">
          <input 
            type="text" 
            class="fake-url-input" 
            v-model="fakeUrl" 
            @input="handleUrlInput"
            @keydown="handleUrlSubmit"
            spellcheck="false"
          />
        </div>
        <div class="browser-actions">
          <span class="browser-refresh">↻</span>
        </div>
      </div>
      
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
          @videoStarted="handleVideoStarted"
          @videoEnded="handleVideoEnded"
          @gameCompleted="handleGameCompleted"
        />
        <LogWindow 
          ref="logWindowRef"
          v-if="showLogWindow" 
          @close="showLogWindow = false" 
        />
        <MirrorGame 
          v-if="showMirrorGame" 
          ref="mirrorGameRef"
          @close="closeMirrorGame"
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
  
  &.appear-animation {
    animation: app-appear 1.2s ease-out forwards;
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
    
    .fake-browser-bar {
      border-bottom-color: var(--surge-color);
      box-shadow: 0 0 10px rgba(255, 136, 0, 0.3);
    }
    
    .fake-url-input {
      color: var(--surge-light);
      border-color: var(--surge-dark);
    }
    
    .browser-refresh {
      color: var(--surge-light);
      
      &:hover {
        text-shadow: 0 0 5px var(--surge-color);
      }
    }
  }
}

@keyframes app-appear {
  0% { 
    opacity: 0;
    transform: scale(1.05);
    filter: brightness(2) saturate(1.5) contrast(1.2);
  }
  20% {
    opacity: 0.6;
    transform: scale(1.02);
    filter: brightness(1.5) saturate(1.2) contrast(1.1);
  }
  30% {
    opacity: 0.8;
    transform: scale(1.01);
    filter: brightness(1.3) saturate(1.1) contrast(1.05);
  }
  40% {
    opacity: 0.4;
    transform: scale(1.03);
    filter: brightness(1.7) saturate(1.3);
  }
  70% {
    opacity: 0.7;
    filter: brightness(1.2) saturate(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
    filter: brightness(1) saturate(1) contrast(1);
  }
}

/* Style pour la barre de navigateur fictive */
.fake-browser-bar {
  height: 36px;
  background-color: rgba(10, 20, 30, 0.9);
  border-bottom: 1px solid var(--tron-blue);
  display: flex;
  align-items: center;
  padding: 0 10px;
  position: relative;
  z-index: 10;
  box-shadow: 0 0 10px rgba(0, 204, 255, 0.3);
}

.browser-controls {
  display: flex;
  gap: 6px;
  margin-right: 15px;
}

.browser-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  
  &:nth-child(1) {
    background-color: #ff5f57;
  }
  
  &:nth-child(2) {
    background-color: #ffbd2e;
  }
  
  &:nth-child(3) {
    background-color: #28ca41;
  }
}

.url-container {
  flex: 1;
  height: 24px;
  background-color: rgba(0, 10, 20, 0.6);
  border-radius: 4px;
  border: 1px solid var(--tron-blue-dark);
  overflow: hidden;
  display: flex;
  align-items: center;
}

.fake-url-input {
  width: 100%;
  height: 100%;
  background-color: transparent;
  border: none;
  color: var(--tron-blue-light);
  padding: 0 10px;
  font-family: 'Consolas', monospace;
  font-size: 14px;
  outline: none;
  
  &:focus {
    border-color: var(--tron-blue);
    box-shadow: 0 0 5px var(--tron-blue);
  }
  
  &:disabled {
    opacity: 0.7;
  }
}

.browser-actions {
  display: flex;
  margin-left: 15px;
}

.browser-refresh {
  color: var(--tron-blue-light);
  font-size: 18px;
  cursor: pointer;
  
  &:hover {
    text-shadow: 0 0 5px var(--tron-blue);
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
  top: 45px;
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

/* Effet de transition glitch */
.glitch-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9990;
  background-color: rgba(0, 0, 0, 0.3);
  pointer-events: none;
  animation: glitch-background 0.5s steps(1) infinite;
}

.glitch-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.glitch-item {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(transparent, rgba(0, 204, 255, 0.2)),
    linear-gradient(90deg, rgba(255, 0, 128, 0.1), rgba(0, 204, 255, 0.2));
  background-size: 100% 5px, 5px 100%;
  background-repeat: repeat;
  mix-blend-mode: overlay;
  
  &:nth-child(1) {
    animation: 
      glitch-skew 0.3s linear infinite alternate-reverse,
      glitch-move-1 1.5s ease infinite;
    background-color: rgba(255, 0, 128, 0.2);
  }
  
  &:nth-child(2) {
    animation: 
      glitch-skew 0.5s linear infinite alternate,
      glitch-move-2 1.7s ease-in-out infinite;
    background-color: rgba(0, 204, 255, 0.2);
    mix-blend-mode: difference;
  }
  
  &:nth-child(3) {
    animation: 
      glitch-skew 0.7s linear infinite alternate-reverse,
      glitch-move-3 1.6s ease infinite;
    background-color: rgba(0, 255, 0, 0.1);
    mix-blend-mode: screen;
  }
  
  &:nth-child(4) {
    animation: 
      glitch-skew 0.2s linear infinite alternate,
      glitch-move-4 1.4s ease-in-out infinite;
    background-color: rgba(255, 255, 0, 0.1);
    mix-blend-mode: lighten;
  }
  
  &:nth-child(5) {
    animation: 
      glitch-skew 0.4s linear infinite alternate-reverse,
      glitch-move-5 1.3s ease infinite;
    background-image: 
      linear-gradient(transparent, rgba(0, 0, 0, 0.8)),
      linear-gradient(90deg, rgba(0, 0, 0, 0.8), transparent);
    background-size: 100% 3px, 3px 100%;
    mix-blend-mode: color-burn;
  }
}

@keyframes glitch-skew {
  0% { transform: skew(0deg); }
  20% { transform: skew(2deg); }
  40% { transform: skew(-1.5deg); }
  60% { transform: skew(1deg); }
  80% { transform: skew(-2deg); }
  100% { transform: skew(0deg); }
}

@keyframes glitch-move-1 {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-5px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

@keyframes glitch-move-2 {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(5px); }
  40% { transform: translateX(-5px); }
  60% { transform: translateX(3px); }
  80% { transform: translateX(-3px); }
}

@keyframes glitch-move-3 {
  0%, 100% { transform: translateY(0); }
  20% { transform: translateY(-2px); }
  40% { transform: translateY(2px); }
  60% { transform: translateY(-1px); }
  80% { transform: translateY(1px); }
}

@keyframes glitch-move-4 {
  0%, 100% { transform: translateY(0) scaleY(1); }
  20% { transform: translateY(2px) scaleY(1.02); }
  40% { transform: translateY(-2px) scaleY(0.98); }
  60% { transform: translateY(1px) scaleY(1.01); }
  80% { transform: translateY(-1px) scaleY(0.99); }
}

@keyframes glitch-move-5 {
  0%, 100% { transform: translateX(0) translateY(0); }
  25% { transform: translateX(2px) translateY(2px); }
  50% { transform: translateX(-2px) translateY(-2px); }
  75% { transform: translateX(-2px) translateY(2px); }
}

@keyframes glitch-background {
  0%, 100% { background-color: rgba(0, 0, 0, 0.3); }
  20% { background-color: rgba(0, 50, 100, 0.3); }
  40% { background-color: rgba(50, 0, 50, 0.3); }
  60% { background-color: rgba(0, 0, 0, 0.4); }
  80% { background-color: rgba(20, 40, 60, 0.3); }
}

/* Styles pour l'écran de fin */
.end-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #000;
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fadeIn 2s ease;
}

.end-content {
  text-align: center;
  max-width: 800px;
  padding: 20px;
}

.end-title {
  color: #00ccff;
  font-family: 'Orbitron', sans-serif;
  font-size: 48px;
  text-shadow: 0 0 20px #00ccff, 0 0 40px rgba(0, 204, 255, 0.6);
  margin-bottom: 20px;
  animation: glowPulse 3s infinite alternate;
}

.end-subtitle {
  color: #00ccff;
  font-family: 'Orbitron', sans-serif;
  font-size: 36px;
  text-shadow: 0 0 15px #00ccff;
  margin-bottom: 60px;
  opacity: 0;
  animation: fadeInDelay 3s ease forwards;
  animation-delay: 2s;
}

.end-choice {
  color: #00ccff;
  font-family: 'Orbitron', sans-serif;
  font-size: 24px;
  margin-bottom: 40px;
  opacity: 0;
  animation: fadeInDelay 3s ease forwards;
  animation-delay: 4s;
}

.end-credits {
  color: #00ccff;
  font-family: 'Orbitron', sans-serif;
  font-size: 20px;
  margin-top: 100px;
  opacity: 0;
  animation: fadeInDelay 3s ease forwards;
  animation-delay: 6s;
  
  p {
    margin: 10px 0;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInDelay {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes glowPulse {
  from { text-shadow: 0 0 10px #00ccff, 0 0 20px rgba(0, 204, 255, 0.4); }
  to { text-shadow: 0 0 20px #00ccff, 0 0 40px rgba(0, 204, 255, 0.8); }
}
</style>
