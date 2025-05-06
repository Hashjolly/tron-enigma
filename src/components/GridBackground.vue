<script setup lang="ts">

</script>

<template>
  <div class="grid-background">
    <video autoplay loop muted playsinline>
      <source src="/videos/gridGif.mp4" type="video/mp4">
    </video>
  </div>
</template>

<style scoped>
.grid-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}

.grid-background img,
.grid-background video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.performance-mode img,
.performance-mode video {
  image-rendering: pixelated;
  filter: brightness(0.9) contrast(0.9);
}
</style>