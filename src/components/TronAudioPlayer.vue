<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useAudioStore } from '@/stores/audioStore'

const audioStore = useAudioStore()
const audioElement = ref<HTMLAudioElement | null>(null)

// Gestion des événements audio
const onEnded = () => {
  audioStore.next()
}

const onTimeUpdate = () => {
  if (!audioElement.value) return
  const audio = audioElement.value
  progress.value = (audio.currentTime / audio.duration) * 100
}

const onVolumeChange = (event: Event) => {
  const value = parseFloat((event.target as HTMLInputElement).value)
  audioStore.setVolume(value / 100)
}

const onCanPlay = () => {
  // Quand l'audio est prêt à être joué
  if (audioStore.isPlaying && audioElement.value) {
    audioElement.value.play()
      .then(() => {
        audioStore.attemptAutoplay()
      })
      .catch(error => {
        console.warn("Lecture automatique bloquée:", error)
        audioStore.setAutoplayBlocked()
      })
  }
}

const progress = ref(0)
const isExpanded = ref(false)

// Fonction explicite pour lancer la lecture audio
const startPlayback = () => {
  if (!audioElement.value || !audioStore.currentTrack) return
  
  // Log attempt
  console.log("Trying to start audio playback with user gesture")
  
  // Un-block autoplay in the store
  audioStore.attemptAutoplay()
  
  // Définir explicitement la source
  audioElement.value.src = audioStore.currentTrack.src
  
  // Unmute if needed
  audioElement.value.muted = false
  
  // Set a reasonable volume
  const originalVolume = audioStore.volume
  audioElement.value.volume = originalVolume
  
  // Play with user gesture context
  audioElement.value.play()
    .then(() => {
      console.log("Audio playback started successfully")
      // Animation progressive du volume pour un démarrage en douceur
      let vol = 0.1
      audioElement.value!.volume = vol
      
      const volumeInterval = setInterval(() => {
        vol += 0.1
        if (vol >= originalVolume) {
          if (audioElement.value) audioElement.value.volume = originalVolume
          clearInterval(volumeInterval)
        } else {
          if (audioElement.value) audioElement.value.volume = vol
        }
      }, 100)
    })
    .catch(error => {
      console.error("Failed to play audio even with user interaction:", error)
      // Keep isPlaying true but mark autoplay as blocked for another attempt
      audioStore.setAutoplayBlocked()
    })
}

// Mise à jour du lecteur lorsque le store change
watch(() => audioStore.currentTrack, (newTrack) => {
  if (!audioElement.value || !newTrack) return
  
  // Changer la source audio et lancer la lecture
  audioElement.value.src = newTrack.src
  
  if (audioStore.isPlaying) {
    startPlayback()
  }
}, { immediate: true })

watch(() => audioStore.isPlaying, (isPlaying) => {
  if (!audioElement.value) return
  
  if (isPlaying) {
    console.log("isPlaying changed to true, attempting to play")
    
    // Play without changing volume - we'll handle autoplay blocking elsewhere
    audioElement.value.play()
      .catch(error => {
        console.log("Play failed due to autoplay restrictions:", error.message)
        audioStore.setAutoplayBlocked()
      })
  } else {
    audioElement.value.pause()
  }
})

watch(() => audioStore.volume, (newVolume) => {
  if (!audioElement.value) return
  audioElement.value.volume = newVolume
})

watch(() => audioStore.isMuted, (isMuted) => {
  if (!audioElement.value) return
  audioElement.value.muted = isMuted
})

onMounted(() => {
  if (!audioElement.value) return
  
  // Configuration initiale de l'audio
  audioElement.value.volume = audioStore.volume
  audioElement.value.muted = audioStore.isMuted
  
  // Vérifier si le store a déjà une piste sélectionnée
  if (audioStore.currentTrack && audioStore.isPlaying) {
    // Définir explicitement la source au montage
    audioElement.value.src = audioStore.currentTrack.src
    
    // Déclencher la lecture avec un délai pour s'assurer que tout est chargé
    setTimeout(() => {
      startPlayback()
    }, 500)
  }
})

// Gérer la barre de progression
const seekAudio = (event: MouseEvent) => {
  if (!audioElement.value) return
  
  const progressBar = event.currentTarget as HTMLElement
  const rect = progressBar.getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  
  audioElement.value.currentTime = percent * audioElement.value.duration
  progress.value = percent * 100
}

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// Fonctions de tri et de réorganisation
const isSortMode = ref(false)

const toggleSortMode = () => {
  isSortMode.value = !isSortMode.value
}

// Empêchons la lecture automatique lors du déplacement des pistes
const moveTrackUp = (index: number) => {
  // Empêcher la propagation d'événements qui déclencheraient l'audio
  const wasPlaying = audioStore.isPlaying
  
  // Effectuer l'opération de tri
  audioStore.moveTrack(index, 'up')
  
  // Éviter la relecture automatique si nécessaire
  if (!wasPlaying) {
    audioStore.pause()
  }
}

const moveTrackDown = (index: number) => {
  // Même logique que pour moveTrackUp
  const wasPlaying = audioStore.isPlaying
  
  audioStore.moveTrack(index, 'down')
  
  if (!wasPlaying) {
    audioStore.pause()
  }
}

// Empêcher les déclenchements de lecture intempestifs en mode tri
watch(isSortMode, (newValue) => {
  // Si on entre en mode tri, optimisons l'UI pour éviter des événements de lecture inutiles
  if (newValue) {
    // Rien de spécial à faire ici, mais pourrait être utile pour des optimisations futures
  }
})
</script>

<template>
  <div class="audio-player" :class="{ 'hidden': !audioStore.showPlayer, 'expanded': isExpanded, 'sort-mode': isSortMode }">
    <div v-if="audioStore.isLoading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <div class="loading-text">Chargement des pistes...</div>
    </div>
    
    <div v-else-if="!audioStore.currentTrack" class="no-tracks">
      Aucune piste audio trouvée. 
      <span class="add-tracks-hint">Ajoutez des fichiers MP3 dans public/audio/music/</span>
    </div>
    
    <div v-if="audioStore.tracks.length > 0 && isSortMode" class="playlist-manager">
      <h3 class="playlist-title">Réorganiser les pistes</h3>
      <div class="track-list">
        <!-- Ajouter stopPropagation pour éviter les déclenchements d'audio -->
        <div v-for="(track, index) in audioStore.tracks" 
             :key="track.id" 
             class="track-item" 
             :class="{ 'active': index === audioStore.currentTrackIndex }">
          <div class="track-info">
            <div class="track-title">{{ track.title }}</div>
            <div class="track-artist">{{ track.artist }}</div>
          </div>
          <div class="track-controls">
            <button @click.stop="moveTrackUp(index)" 
                    class="track-btn up" 
                    :disabled="index === 0">▲</button>
            <button @click.stop="moveTrackDown(index)" 
                    class="track-btn down" 
                    :disabled="index === audioStore.tracks.length - 1">▼</button>
          </div>
        </div>
      </div>
      <div class="sort-actions">
        <button @click="toggleSortMode" class="close-sort">Fermer</button>
      </div>
    </div>
    
    <div v-else class="audio-controls">
      <div class="main-controls">
        <button @click="audioStore.previous" class="control-btn prev">
          <span>⏮</span>
        </button>
        <button @click="audioStore.togglePlay" class="control-btn play-pause">
          <span v-if="audioStore.isPlaying">⏸</span>
          <span v-else>▶</span>
        </button>
        <button @click="audioStore.next" class="control-btn next">
          <span>⏭</span>
        </button>
      </div>
      
      <div class="track-info">
        <div v-if="audioStore.currentTrack" class="track-details">
          <div class="track-title">{{ audioStore.currentTrack.title }}</div>
          <div class="track-artist">{{ audioStore.currentTrack.artist }}</div>
        </div>
      </div>
      
      <div class="progress-container" @click="seekAudio">
        <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
      </div>
      
      <div class="secondary-controls">
        <button @click="audioStore.toggleMute" class="control-btn volume">
          <span v-if="audioStore.isMuted">🔇</span>
          <span v-else>🔊</span>
        </button>
        <input 
          v-if="isExpanded" 
          type="range" 
          min="0" 
          max="100" 
          :value="audioStore.volume * 100" 
          @input="onVolumeChange" 
          class="volume-slider" 
        />
        <button @click="toggleExpand" class="control-btn expand">
          <span v-if="isExpanded">></span>
          <span v-else><</span>
        </button>
        <!-- Empêcher la propagation de l'événement click pour éviter les lectures audio intempestives -->
        <button v-if="isExpanded" @click.stop="toggleSortMode" class="control-btn sort">
          <span>≡</span>
        </button>
      </div>
    </div>
    
    <div v-if="audioStore.autoplayBlocked" class="autoplay-notification">
      <button class="play-button" @click.stop="startPlayback">
        Activer l'audio
      </button>
    </div>
    
    <audio 
      ref="audioElement"
      @ended="onEnded"
      @timeupdate="onTimeUpdate"
      @canplay="onCanPlay"
      preload="auto"
      muted="false"
    ></audio>
  </div>
</template>

<style scoped lang="scss">
.audio-player {
  position: fixed;
  bottom: 60px; /* Juste au-dessus de la taskbar */
  right: 10px;
  width: 300px;
  background-color: rgba(0, 20, 40, 0.85);
  border: 1px solid var(--tron-blue);
  border-radius: 6px;
  padding: 8px;
  color: var(--tron-text-color);
  backdrop-filter: blur(10px);
  z-index: 9;
  transition: all 0.3s ease;
  box-shadow: 0 0 15px rgba(0, 204, 255, 0.3);
  
  &.hidden {
    transform: translateY(100px);
    opacity: 0;
    pointer-events: none;
  }
  
  &.expanded {
    width: 400px;
  }

  &.sort-mode {
    width: 400px;
    height: auto;
    max-height: 500px;
  }
}

// Styles pour l'indicateur de chargement
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  
  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(0, 204, 255, 0.3);
    border-top: 2px solid var(--tron-blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
  }
  
  .loading-text {
    color: var(--tron-blue-light);
    font-size: 14px;
    text-shadow: 0 0 3px var(--tron-blue);
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
}

.no-tracks {
  text-align: center;
  padding: 20px;
  color: var(--tron-text-color);
  
  .add-tracks-hint {
    display: block;
    font-size: 12px;
    margin-top: 8px;
    opacity: 0.7;
    color: var(--tron-blue-light);
  }
}

.audio-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.main-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.control-btn {
  background: transparent;
  border: 1px solid var(--tron-blue);
  color: var(--tron-blue-light);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 204, 255, 0.2);
    box-shadow: 0 0 10px var(--tron-blue);
  }
  
  &.play-pause {
    width: 40px;
    height: 40px;
    border-width: 2px;
  }

  &.sort {
    font-size: 18px;
    line-height: 0;
  }
}

.track-info {
  text-align: center;
  margin: 5px 0;
  
  .track-title {
    font-weight: bold;
    text-shadow: 0 0 5px var(--tron-blue);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .track-artist {
    font-size: 0.8em;
    opacity: 0.8;
  }
}

.progress-container {
  width: 100%;
  height: 6px;
  background-color: rgba(0, 204, 255, 0.2);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  .progress-bar {
    height: 100%;
    background: linear-gradient(to right, var(--tron-blue), var(--tron-blue-light));
    border-radius: 3px;
    width: 0%;
    transition: width 0.1s linear;
  }
  
  &:hover {
    box-shadow: 0 0 8px var(--tron-blue-dark);
  }
}

.secondary-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  
  .volume-slider {
    width: 80px;
    height: 4px;
    -webkit-appearance: none;
    background: rgba(0, 204, 255, 0.3);
    border-radius: 2px;
    
    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--tron-blue-light);
      cursor: pointer;
      box-shadow: 0 0 5px var(--tron-blue);
    }
    
    &::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--tron-blue-light);
      cursor: pointer;
      box-shadow: 0 0 5px var(--tron-blue);
      border: none;
    }
  }
}

.autoplay-notification {
  position: absolute;
  top: -45px;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px;
  z-index: 11;
  
  .play-button {
    background: rgba(0, 40, 70, 0.9);
    color: var(--tron-blue-light);
    border: 1px solid var(--tron-blue);
    border-radius: 4px;
    padding: 8px 15px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    animation: pulse 2s infinite;
    box-shadow: 0 0 15px rgba(0, 204, 255, 0.4);
    transition: all 0.3s;
    
    &:hover {
      background: rgba(0, 60, 100, 0.9);
      box-shadow: 0 0 20px var(--tron-blue);
    }
  }
  
  @keyframes pulse {
    0% { box-shadow: 0 0 5px rgba(0, 204, 255, 0.4); }
    50% { box-shadow: 0 0 15px rgba(0, 204, 255, 0.7); }
    100% { box-shadow: 0 0 5px rgba(0, 204, 255, 0.4); }
  }
}

// Styles pour le gestionnaire de playlist
.playlist-manager {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
  
  .playlist-title {
    font-size: 14px;
    color: var(--tron-blue-light);
    text-shadow: 0 0 5px var(--tron-blue);
    margin: 0;
    padding: 5px 0;
    text-align: center;
    border-bottom: 1px solid rgba(0, 204, 255, 0.3);
  }
}

.track-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.track-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
  border-radius: 4px;
  border: 1px solid rgba(0, 204, 255, 0.2);
  background: rgba(0, 20, 40, 0.5);
  
  &.active {
    border-color: var(--tron-blue);
    background: rgba(0, 40, 80, 0.7);
    box-shadow: 0 0 10px rgba(0, 204, 255, 0.4);
  }
  
  .track-info {
    overflow: hidden;
    flex: 1;
    
    .track-title {
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .track-artist {
      font-size: 10px;
      opacity: 0.8;
    }
  }
  
  .track-controls {
    display: flex;
    gap: 5px;
    
    .track-btn {
      width: 24px;
      height: 24px;
      background: transparent;
      border: 1px solid var(--tron-blue);
      border-radius: 4px;
      color: var(--tron-blue-light);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover:not(:disabled) {
        background: rgba(0, 204, 255, 0.2);
        box-shadow: 0 0 8px var(--tron-blue);
      }
      
      &:disabled {
        opacity: 0.3;
        cursor: default;
      }
    }
  }
}

.sort-actions {
  display: flex;
  justify-content: center;
  margin-top: 10px;
  
  .close-sort {
    padding: 6px 15px;
    background: rgba(0, 40, 70, 0.9);
    color: var(--tron-blue-light);
    border: 1px solid var(--tron-blue);
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(0, 60, 100, 0.9);
      box-shadow: 0 0 10px var(--tron-blue);
    }
  }
}
</style>
