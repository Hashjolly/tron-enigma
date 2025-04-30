<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number = 0
let ctx: CanvasRenderingContext2D | null = null

const initCanvas = () => {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  
  ctx = canvas.getContext('2d')
  if (!ctx) return
  
  animate()
}

const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
  ctx.clearRect(0, 0, width, height)
  
  // Définir un noir plus profond pour le fond
  ctx.fillStyle = 'rgb(1, 5, 10)';
  ctx.fillRect(0, 0, width, height);
  
  // Position de l'horizon plus bas pour correspondre à l'image
  const horizonY = height * 0.65
  
  // Paramètres de la grille ajustés pour correspondre à l'image TRON Legacy
  const cellSize = 80
  const moveSpeed = 0.01
  const gridDepth = 20
  const tronBlue = '0, 198, 255'  // La couleur bleu TRON caractéristique
  
  // Point de fuite central
  const vanishingPointX = width / 2
  const vanishingPointY = horizonY
  
  // Décalage pour l'animation
  const offsetZ = (time * moveSpeed) % cellSize
  
  // Lignes horizontales en perspective
  for (let z = 0; z < gridDepth; z++) {
    const depth = z + offsetZ / cellSize
    const y = horizonY + (height - horizonY) * (depth / gridDepth)
    console.log(y)
    
    // Ajuster l'opacité pour obtenir l'effet de profondeur
    const opacity = 0.2 + 0.6 * (1 - depth / gridDepth)
    ctx.lineWidth = 1.5 // Lignes plus fines comme dans l'image
    ctx.strokeStyle = `rgba(${tronBlue}, ${opacity})`
    
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  // Lignes verticales en perspective (convergeant vers le point de fuite)
  const gridWidth = 50 // Moins de lignes pour correspondre à l'image
  const baseWidth = width * 4 // Base plus large pour une meilleure perspective
  
  for (let i = -gridWidth / 2; i <= gridWidth / 2; i++) {
    const baseX = vanishingPointX + i * (baseWidth / gridWidth)
    const endX = vanishingPointX + (i * 40)

    const opacity = 0.2 + 0.6 * (1 - Math.abs(i) / (gridWidth / 2))
    ctx.lineWidth = 1.5 // Épaisseur constante pour toutes les lignes verticales
    ctx.strokeStyle = `rgba(${tronBlue}, ${opacity})`
    
    ctx.beginPath()
    ctx.moveTo(baseX, height)
    ctx.lineTo(endX, vanishingPointY)
    ctx.stroke()
  }
  
  // Ajouter le dégradé subtil au-dessus de l'horizon pour l'effet de brume
  const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGradient.addColorStop(0, 'rgba(0, 10, 25, 0.8)');
  skyGradient.addColorStop(0.7, 'rgba(0, 20, 40, 0.6)');
  skyGradient.addColorStop(1, `rgba(${tronBlue}, 0.15)`); // Légère lueur à l'horizon
  
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, horizonY);
  
  // Léger effet de lueur à l'horizon
  const horizonGlow = ctx.createLinearGradient(0, horizonY - 2, 0, horizonY + 5);
  horizonGlow.addColorStop(0, `rgba(${tronBlue}, 0)`);
  horizonGlow.addColorStop(0.5, `rgba(${tronBlue}, 0.15)`);
  horizonGlow.addColorStop(1, `rgba(${tronBlue}, 0)`);
  
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, horizonY - 2, width, 7);
  
  // Ligne d'horizon plus prononcée
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(${tronBlue}, 0.4)`;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(width, horizonY);
  ctx.stroke();
}

const animate = () => {
  if (!ctx || !canvasRef.value) return
  
  const time = performance.now()
  drawGrid(ctx, canvasRef.value.width, canvasRef.value.height, time)
  
  animationFrameId = requestAnimationFrame(animate)
}

const handleResize = () => {
  if (!canvasRef.value || !ctx) return
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight
}

onMounted(() => {
  initCanvas()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  cancelAnimationFrame(animationFrameId)
})
</script>

<template>
  <canvas 
    ref="canvasRef" 
    class="grid-background">
  </canvas>
</template>

<style scoped>
.grid-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background-color: rgb(1, 5, 10); /* Noir plus foncé pour correspondre à l'image */
}
</style>
