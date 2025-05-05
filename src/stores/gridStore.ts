import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGridStore = defineStore('grid', () => {
  // État
  const gridAccessed = ref(false)
  const remanenceFound = ref(false)
  const remanenceIsolated = ref(false)
  const countdownStarted = ref(false)
  const timeRemaining = ref(60 * 60) // 60 minutes en secondes
  const isSurging = ref(false)
  let countdownInterval: number | null = null

  // Getters
  const formattedTime = computed(() => {
    if (!countdownStarted.value) return '';
    
    const minutes = Math.floor(timeRemaining.value / 60);
    const seconds = timeRemaining.value % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  })

  // Actions
  function triggerSurge(withMessage = false, terminalContentCallback: ((message: string) => void) | null = null) {
    if (isSurging.value) return;
    
    isSurging.value = true;
    
    if (withMessage && terminalContentCallback && Math.random() > 0.7) {
      terminalContentCallback('');
      terminalContentCallback('>> SYSTÈME INSTABLE - DÉTECTION DE PROGRAMMES HOSTILES <<');
      terminalContentCallback('>> CLU APPROCHE - BOUCLE DE TEMPS RESTANT: ' + formattedTime.value + ' <<');
      terminalContentCallback('');
    }
    
    setTimeout(() => {
      isSurging.value = false;
    }, 2000);
  }

  function startCountdown(terminalContentCallback: ((message: string) => void) | null = null) {
    if (countdownStarted.value) return;
    
    countdownStarted.value = true;
    gridAccessed.value = true;
    
    if (terminalContentCallback) {
      terminalContentCallback('');
      terminalContentCallback('>> ALERTE SYSTÈME CRITIQUE <<');
      terminalContentCallback('>> BRÈCHE AVEC LA GRILLE OUVERTE <<');
      terminalContentCallback('>> CE N\'EST QU\'UNE QUESTION DE TEMPS AVANT QUE CLU ARRIVE <<');
      terminalContentCallback('');
    }
    
    isSurging.value = true;
    setTimeout(() => {
      isSurging.value = false;
    }, 2000);
    
    countdownInterval = window.setInterval(() => {
      timeRemaining.value--;
      
      if (Math.random() < 0.005) {
        triggerSurge(true, terminalContentCallback);
      }
      
      if (timeRemaining.value <= 0) {
        if (countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
        
        if (terminalContentCallback) {
          terminalContentCallback('');
          terminalContentCallback('>> ALERTE INTRUSION <<');
          terminalContentCallback('>> CLU A PÉNÉTRÉ LE SYSTÈME <<');
          terminalContentCallback('>> SÉQUENCE DE DÉRÉSOLUTION INITIÉE <<');
          terminalContentCallback('');
        }
        
        isSurging.value = true;
      }
    }, 1000);
  }

  function setRemanenceFound() {
    remanenceFound.value = true;
  }

  function stopCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  return {
    gridAccessed,
    remanenceFound,
    remanenceIsolated,
    countdownStarted,
    timeRemaining,
    isSurging,
    formattedTime,
    triggerSurge,
    startCountdown,
    setRemanenceFound,
    stopCountdown
  }
})
