<script setup lang="ts">
import { RouterView } from 'vue-router'
import GridBackground from './components/GridBackground.vue'
import TronTerminal from './components/TronTerminal.vue'
import TaskBar from './components/TaskBar.vue'
import { ref } from 'vue'

const showTerminal = ref(false)
</script>

<template>
  <div class="tron-container">
    <GridBackground />
    <div class="content">
      <TronTerminal v-if="showTerminal" @close="showTerminal = false" />
    </div>
    <TaskBar @openTerminal="showTerminal = true" />
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
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: var(--tron-background);
  color: var(--tron-text-color);
  font-family: 'Orbitron', 'Arial', sans-serif;
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

@font-face {
  font-family: 'Orbitron';
  src: url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');
}
</style>
