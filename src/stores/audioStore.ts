import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Track {
  id: number
  title: string
  artist: string
  src: string
  order?: number // Propriété pour l'ordre personnalisé
}

// Utiliser l'API globale de Vite pour obtenir tous les fichiers audio
// Note: Ce code s'exécute à la compilation, pas à l'exécution
const musicFiles = import.meta.glob('/public/audio/music/**/*.{mp3,ogg,wav}', { eager: true, as: 'url' })

// Fonction pour extraire les métadonnées à partir du nom de fichier
// Format supposé: "Artist - Title.mp3" ou simplement "Title.mp3"
function extractMetadata(filePath: string): { title: string, artist: string } {
  // Extraire juste le nom du fichier (sans chemin ni extension)
  const fileName = filePath.split('/').pop() || ''
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

// Fonction pour charger un ordre personnalisé depuis localStorage ou un fichier de configuration
function loadCustomOrder(): Record<string, number> {
  try {
    // Tenter de charger depuis localStorage
    const savedOrder = localStorage.getItem('tron_music_order')
    if (savedOrder) {
      return JSON.parse(savedOrder)
    }
  } catch (e) {
    console.warn('Impossible de récupérer l\'ordre personnalisé', e)
  }
  
  // Ordre par défaut
  return {}
}

export const useAudioStore = defineStore('audio', () => {
  // État
  const tracks = ref<Track[]>([])
  const currentTrackIndex = ref(0)
  const isPlaying = ref(false) // Start with isPlaying false to avoid autoplay errors
  const volume = ref(0.5)
  const isMuted = ref(false)
  const showPlayer = ref(false)
  const isLoading = ref(true)
  const autoplayBlocked = ref(false) // Nouvel état pour suivre si l'autoplay est bloqué

  // Variable pour stocker l'ordre personnalisé
  const customOrder = ref<Record<string, number>>(loadCustomOrder())

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
    
    // Appliquer les ordres personnalisés si existants
    applySavedOrder();
    
    isLoading.value = false;
  }

  // Fonction pour sauvegarder l'ordre personnalisé
  function saveCustomOrder() {
    try {
      localStorage.setItem('tron_music_order', JSON.stringify(customOrder.value))
      console.log('Ordre personnalisé sauvegardé')
    } catch (e) {
      console.warn('Impossible de sauvegarder l\'ordre personnalisé', e)
    }
  }
  
  // Fonction pour appliquer l'ordre sauvegardé
  function applySavedOrder() {
    // Pas besoin de trier si aucune piste
    if (tracks.value.length === 0) return;
    
    const currentTrackSrc = currentTrack.value?.src;
    
    // Assigner des ordres aux pistes basés sur customOrder
    tracks.value.forEach((track, index) => {
      // Identifiants possibles pour la piste
      const id1 = track.title.toLowerCase();
      const id2 = track.src.split('/').pop()?.toLowerCase() || '';
      
      if (customOrder.value[id1] !== undefined) {
        track.order = customOrder.value[id1];
      } else if (id2 && customOrder.value[id2] !== undefined) {
        track.order = customOrder.value[id2];
      } else {
        // Ordre par défaut basé sur la position originale
        track.order = index * 10; // Multiplie par 10 pour permettre des insertions entre les pistes
      }
    });
    
    // Trier les pistes par ordre
    tracks.value.sort((a, b) => {
      return (a.order || 0) - (b.order || 0);
    });
    
    // Réindexer les IDs
    tracks.value = tracks.value.map((track, index) => ({
      ...track,
      id: index + 1
    }));
    
    // Retrouver l'index de la piste courante si elle existait
    if (currentTrackSrc) {
      const newIndex = tracks.value.findIndex(t => t.src === currentTrackSrc);
      if (newIndex !== -1) {
        currentTrackIndex.value = newIndex;
      }
    }
  }
  
  // Fonction pour définir l'ordre d'une piste
  function setTrackOrder(trackTitle: string, order: number) {
    customOrder.value[trackTitle.toLowerCase()] = order
    saveCustomOrder()
    
    // Réappliquer le tri
    applySavedOrder()
  }
  
  // Fonction pour déplacer une piste vers le haut ou le bas dans la liste
  function moveTrack(index: number, direction: 'up' | 'down') {
    console.log(`Déplacement de la piste ${index} ${direction}`);
    
    if (tracks.value.length <= 1) return;
    
    const newIndex = direction === 'up' 
      ? Math.max(0, index - 1)
      : Math.min(tracks.value.length - 1, index + 1);
    
    if (newIndex === index) return;
    
    // Sauvegarder la piste courante
    const currentTrackSrc = currentTrack.value?.src;
    
    // Échanger les pistes
    const pistes = [...tracks.value];
    const temp = pistes[index];
    pistes[index] = pistes[newIndex];
    pistes[newIndex] = temp;
    
    // Mettre à jour l'ordre personnalisé
    const newOrder: Record<string, number> = {};
    pistes.forEach((piste, idx) => {
      newOrder[piste.title.toLowerCase()] = idx * 10;
    });
    
    // Mise à jour de l'état
    customOrder.value = newOrder;
    tracks.value = pistes;
    
    // Retrouver l'index de la piste courante
    if (currentTrackSrc) {
      const updatedIndex = pistes.findIndex(t => t.src === currentTrackSrc);
      if (updatedIndex !== -1) {
        currentTrackIndex.value = updatedIndex;
      }
    }
    
    // Sauvegarder l'ordre personnalisé
    saveCustomOrder();
    
    console.log('Track moved successfully. New order:', pistes.map(t => t.title));
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
    forcePlay,
    customOrder,
    setTrackOrder,
    moveTrack,
    saveCustomOrder,
    applySavedOrder
  }
})
