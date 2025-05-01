import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MinimizedWindow {
  id: string;
  title: string;
  type: 'terminal' | 'log' | 'other';
  timestamp: number;
}

export const useWindowStore = defineStore('window', () => {
  // State
  const minimizedWindows = ref<MinimizedWindow[]>([])
  
  // Actions
  function minimizeWindow(window: MinimizedWindow) {
    // Remove existing window first if it exists (prevents duplicates)
    minimizedWindows.value = minimizedWindows.value.filter(w => w.id !== window.id)
    
    // Add the window to minimized windows
    minimizedWindows.value.push({
      ...window,
      timestamp: Date.now()
    })
  }
  
  function restoreWindow(id: string) {
    minimizedWindows.value = minimizedWindows.value.filter(w => w.id !== id)
  }
  
  function isWindowMinimized(id: string) {
    return minimizedWindows.value.some(w => w.id === id)
  }
  
  // Clear all minimized windows (useful on app restart)
  function clearMinimizedWindows() {
    minimizedWindows.value = []
  }
  
  return {
    minimizedWindows,
    minimizeWindow,
    restoreWindow,
    isWindowMinimized,
    clearMinimizedWindows
  }
})
