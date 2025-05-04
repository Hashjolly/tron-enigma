import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Track {
  id: number
  title: string
  artist: string
  src: string
}

// Utiliser l'API globale de Vite pour obtenir tous les fichiers audio
// Note: Ce code s'exécute à la compilation, pas à l'exécution
const musicFiles = import.meta.glob('/public/audio/music/**/*.{mp3,ogg,wav}', { eager: true, as: 'url' })

// Fonction pour extraire les métadonnées à partir du nom de fichier
// Format supposé: "Artist - Title.mp3" ou simplement "Title.mp3"
function extractMetadata(filePath: string): { title: string, artist: string } {
  // Extraire juste le nom du fichier (sans chemin ni extension)
  console.log(filePath)
  const fileName = filePath.split('/').pop() || ''
  console.log(fileName)
  const fileNameWithoutExt = fileName.replace(/\.(mp3|ogg|wav)$/, '')
  
  // Vérifier si le format est "Artist - Title"
  const parts = fileNameWithoutExt.split(' - ')
  if (parts.length > 1) {
    return {
      artist: parts[0],
      title: parts.slice(1).join(' - ') // Au cas où il y a plusieurs tirets
    }
  } else {
    // Pas de séparateur trouvé, utiliser le nom de fichier comme titre
    return {
      artist: 'Unknown Artist',
      title: fileNameWithoutExt
    }
  }
}

export const useAudioStore = defineStore('audio', () => {
  // État
  const tracks = ref<Track[]>([])
  const currentTrackIndex = ref(0)
  const isPlaying = ref(false) // Start with isPlaying false to avoid autoplay errors
  const volume = ref(0.8)
  const isMuted = ref(false)
  const showPlayer = ref(false)
  const isLoading = ref(true)
  const autoplayBlocked = ref(false) // Nouvel état pour suivre si l'autoplay est bloqué

  // Initialisation des pistes
  function initializeTracks() {
    isLoading.value = true
    
    // Convertir les fichiers globaux en tableau de pistes
    const trackList = Object.entries(musicFiles).map(([path, url], index) => {
      const metadata = extractMetadata(path)
      return {
        id: index + 1,
        title: metadata.title,
        artist: metadata.artist,
        src: url
      }
    });
    
    // Si aucun fichier n'est trouvé, utiliser les pistes de démonstration
    if (trackList.length === 0) {
      tracks.value = [
        { id: 1, title: 'Derezzed', artist: 'Daft Punk', src: '/audio/derezzed.mp3' },
        { id: 2, title: 'Solar Sailer', artist: 'Daft Punk', src: '/audio/solar-sailer.mp3' },
        { id: 3, title: 'TRON Legacy (End Titles)', artist: 'Daft Punk', src: '/audio/end-titles.mp3' }
      ];
      console.warn('Aucun fichier audio trouvé. Utilisation des pistes de démonstration.');
    } else {
      tracks.value = trackList;
    }
    
    isLoading.value = false;
  }

  // Tentative d'autoplay avec gestion des permissions du navigateur
  function attemptAutoplay() {
    isPlaying.value = true
    autoplayBlocked.value = false
    
    // Enregistrer la préférence utilisateur dans le localStorage
    try {
      localStorage.setItem('tron_music_autoplay', 'true')
      console.log('Autoplay preference saved:', localStorage.getItem('tron_music_autoplay'))
    } catch (e) {
      console.warn('Impossible de sauvegarder la préférence autoplay', e)
    }
    
    return true
  }
  
  // Marquer l'autoplay comme bloqué par le navigateur
  function setAutoplayBlocked() {
    autoplayBlocked.value = true
    // Don't set isPlaying to false here to preserve the user's intent
    console.log("autoplayBlocked.value :", autoplayBlocked.value)
  }

  // Forcer le démarrage de la lecture
  function forcePlay() {
    isPlaying.value = true
    
    // Changer brièvement de piste pour forcer le rechargement
    if (tracks.value.length > 1) {
      const current = currentTrackIndex.value
      currentTrackIndex.value = (current + 1) % tracks.value.length
      
      setTimeout(() => {
        currentTrackIndex.value = current
      }, 50)
    }
  }

  // Vérifier si l'utilisateur a déjà autorisé l'autoplay précédemment
  function loadAutoplayPreference() {
    try {
      const savedAutoplay = localStorage.getItem('tron_music_autoplay') === 'true'
      if (savedAutoplay) {
        isPlaying.value = true
      }
    } catch (e) {
      console.warn('Impossible de récupérer la préférence autoplay', e)
    }
  }

  // Getters
  const currentTrack = computed(() => tracks.value[currentTrackIndex.value] || null)
  
  // Actions
  function play() {
    isPlaying.value = true
    next() // Passer à la piste suivante si nécessaire
    console.log(isPlaying.value)
  }
  
  function pause() {
    isPlaying.value = false
  }
  
  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }
  
  function next() {
    if (tracks.value.length === 0) return
    currentTrackIndex.value = (currentTrackIndex.value + 1) % tracks.value.length
  }
  
  function previous() {
    if (tracks.value.length === 0) return
    currentTrackIndex.value = currentTrackIndex.value === 0 
      ? tracks.value.length - 1 
      : currentTrackIndex.value - 1
  }
  
  function setVolume(value: number) {
    volume.value = Math.max(0, Math.min(1, value))
  }
  
  function toggleMute() {
    isMuted.value = !isMuted.value
  }
  
  function togglePlayer() {
    showPlayer.value = !showPlayer.value
  }

  // Charger les préférences dès l'initialisation
  loadAutoplayPreference()
  
  // Initialiser les pistes immédiatement
  initializeTracks()

  return {
    tracks,
    currentTrackIndex,
    isPlaying,
    volume,
    isMuted,
    showPlayer,
    isLoading,
    autoplayBlocked,
    currentTrack,
    play,
    pause,
    togglePlay,
    next,
    previous,
    setVolume,
    toggleMute,
    togglePlayer,
    initializeTracks,
    attemptAutoplay,
    setAutoplayBlocked,
    forcePlay
  }
})
