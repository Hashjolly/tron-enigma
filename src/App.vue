<script setup lang="ts">
import { RouterView } from 'vue-router'
import GridBackground from './components/GridBackground.vue'
import TronTerminal from './components/TronTerminal.vue'
import TaskBar from './components/TaskBar.vue'
import TronAudioPlayer from './components/TronAudioPlayer.vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAudioStore } from './stores/audioStore'
import { useGridStore } from './stores/gridStore'

const showTerminal = ref(false)
const audioStore = useAudioStore()
const gridStore = useGridStore()
const showAudioPrompt = ref(true)

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
}

// Cacher le prompt après un certain temps
onMounted(() => {
  setTimeout(() => {
    if (!audioStore.autoplayBlocked) {
      showAudioPrompt.value = false
    }
  }, 10000)
})

// Nettoyage du compteur lors de la destruction du composant
onBeforeUnmount(() => {
  gridStore.stopCountdown()
})
</script>

<template>
  <div class="tron-container" @click="enableAudio" :class="{ 'surge-mode': gridStore.isSurging }">
    <GridBackground />
    
    <!-- Compte à rebours en haut de l'écran -->
    <div v-if="gridStore.countdownStarted" class="global-countdown-container">
      <div class="global-countdown" :class="{ 'warning': gridStore.timeRemaining < 600 }">
        {{ gridStore.formattedTime }}
      </div>
    </div>
    
    <div class="content">
      <TronTerminal v-if="showTerminal" @close="showTerminal = false" />
      <TronAudioPlayer />
    </div>
    
    <TaskBar 
      @openTerminal="showTerminal = true" 
      @toggleAudio="toggleAudio"
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
