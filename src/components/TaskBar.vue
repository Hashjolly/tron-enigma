<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAudioStore } from '@/stores/audioStore'

const currentTime = ref(new Date().toLocaleTimeString())
const currentDate = ref(new Date().toLocaleDateString())
const audioStore = useAudioStore()

// Define emits for parent communication
const emit = defineEmits(['openTerminal', 'openGridAccess', 'openIdentityDisc', 'openLightCycle', 'toggleAudio'])

// Mettre à jour l'horloge
setInterval(() => {
  currentTime.value = new Date().toLocaleTimeString()
  currentDate.value = new Date().toLocaleDateString()
}, 1000)

// Handler for opening applications
const openApp = (app: string) => {
  switch(app) {
    case 'terminal':
      emit('openTerminal')
      break
    case 'gridAccess':
      emit('openGridAccess')
      break
    case 'identityDisc':
      emit('openIdentityDisc')
      break
    case 'lightCycle':
      emit('openLightCycle')
      break
  }
}

// Handler for audio controls
const toggleAudioPlayer = () => {
  audioStore.togglePlayer()
}

const togglePlayPause = () => {
  audioStore.togglePlay()
}
</script>

<template>
  <div class="taskbar">
    <div class="start-button">
      <span>ENCOM</span>
    </div>
    
    <div class="taskbar-items">
      <div class="taskbar-item" @click="openApp('terminal')">
        <div class="taskbar-icon terminal-icon"></div>
        <div class="taskbar-tooltip">Terminal</div>
      </div>
      <div class="taskbar-item" @click="openApp('gridAccess')">
        <div class="taskbar-icon grid-icon"></div>
        <div class="taskbar-tooltip">Grid Access</div>
      </div>
      <div class="taskbar-item" @click="openApp('identityDisc')">
        <div class="taskbar-icon identity-icon"></div>
        <div class="taskbar-tooltip">Identity Disc</div>
      </div>
      <div class="taskbar-item" @click="openApp('lightCycle')">
        <div class="taskbar-icon lightcycle-icon"></div>
        <div class="taskbar-tooltip">Light Cycle</div>
      </div>
      
      <!-- New Audio Control -->
      <div class="taskbar-item" @click="toggleAudioPlayer">
        <div class="taskbar-icon audio-icon" :class="{ 'active': audioStore.isPlaying }"></div>
        <div class="taskbar-tooltip">Audio Player</div>
      </div>
    </div>
    
    <div class="taskbar-right">
      <div class="clock">
        <div class="time">{{ currentTime }}</div>
        <div class="date">{{ currentDate }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.taskbar {
  height: 48px;
  background: rgba(0, 20, 40, 0.8);
  backdrop-filter: blur(5px);
  border-top: 1px solid var(--tron-blue);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  padding: 0 10px;
  box-shadow: 0 -2px 15px rgba(0, 204, 255, 0.3);
  color: var(--tron-text-color);
}

.start-button {
  padding: 0 15px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--tron-blue);
  border-radius: 5px;
  background: linear-gradient(to bottom, rgba(0, 40, 60, 0.8), rgba(0, 10, 30, 0.8));
  margin-right: 15px;
  cursor: pointer;
  font-weight: bold;
  text-shadow: 0 0 5px var(--tron-blue);
  box-shadow: 0 0 8px var(--tron-blue-dark);
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 0 12px var(--tron-blue);
  }
}

.taskbar-items {
  display: flex;
  gap: 8px;
  flex-grow: 1;
}

.taskbar-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  
  &:hover {
    .taskbar-tooltip {
      opacity: 1;
      transform: translateY(-5px);
    }
    
    .taskbar-icon {
      box-shadow: 0 0 8px var(--tron-blue);
    }
  }
}

.taskbar-icon {
  width: 30px;
  height: 30px;
  background-color: var(--tron-blue-dark);
  border: 1px solid var(--tron-blue);
  border-radius: 5px;
  transition: all 0.2s ease;
  
  &.terminal-icon {
    background-image: radial-gradient(var(--tron-blue-dark), var(--tron-background));
    position: relative;
    
    &::before {
      content: ">";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--tron-blue-light);
      font-size: 16px;
      font-weight: bold;
    }
  }
  
  &.grid-icon {
    background-image: linear-gradient(to right, transparent 8px, var(--tron-blue) 8px, var(--tron-blue) 9px, transparent 9px),
                      linear-gradient(to bottom, transparent 8px, var(--tron-blue) 8px, var(--tron-blue) 9px, transparent 9px);
    background-size: 15px 15px;
  }
  
  &.identity-icon {
    border-radius: 50%;
    border: 2px solid var(--tron-blue);
    background: radial-gradient(circle, var(--tron-blue-dark) 60%, var(--tron-blue) 62%, var(--tron-background) 70%);
  }
  
  &.lightcycle-icon {
    background-color: transparent;
    position: relative;
    
    &::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--tron-blue);
      box-shadow: 0 0 5px var(--tron-blue);
    }
  }
  
  &.audio-icon {
    position: relative;
    
    &::before {
      content: "♪";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--tron-blue-light);
      font-size: 16px;
      font-weight: bold;
    }
    
    &.active {
      box-shadow: 0 0 8px var(--tron-blue), inset 0 0 10px var(--tron-blue);
      
      &::before {
        color: #ffffff;
        text-shadow: 0 0 5px var(--tron-blue-light);
      }
    }
  }
}

// Add active state for taskbar icons
.taskbar-item:active .taskbar-icon {
  transform: scale(0.9);
  box-shadow: 0 0 15px var(--tron-blue);
}

.taskbar-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(0);
  padding: 5px 10px;
  background-color: rgba(0, 20, 40, 0.9);
  border: 1px solid var(--tron-blue);
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  transition: all 0.2s ease;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(0, 204, 255, 0.3);
}

.taskbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.clock {
  text-align: right;
  padding: 0 10px;
  border-left: 1px solid rgba(0, 204, 255, 0.3);
  height: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.time {
  font-size: 16px;
  font-weight: bold;
  color: var(--tron-blue-light);
  text-shadow: 0 0 5px var(--tron-blue);
}

.date {
  font-size: 10px;
  color: var(--tron-text-color);
  opacity: 0.8;
}
</style>
