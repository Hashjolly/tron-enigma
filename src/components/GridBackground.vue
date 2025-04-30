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

// Ajout d'une variable pour suivre le temps pour l'animation
let lastTimestamp = 0
const animationSpeed = 500 // Vitesse d'animation des lignes horizontales

const drawGrid = (time: number) => {
  if (!ctx || !canvasRef.value) return

  const width = canvasRef.value.width
  const height = canvasRef.value.height
  
  // Calculer le delta de temps pour l'animation
  const deltaTime = time - lastTimestamp
  lastTimestamp = time
  
  // Couleur bleue néon TRON
  const tronBlue = '0, 216, 255'
  
  // Effacer le canvas
  ctx.clearRect(0, 0, width, height)
  
  // Fond noir pour meilleur contraste
  ctx.fillStyle = 'rgb(0, 5, 15)'
  ctx.fillRect(0, 0, width, height)
  
  // Dessiner la ligne horizontale au milieu de l'écran
  const middleY = height / 1.6
  const vanishingPointX = width / 2  // Point de chute au milieu
  const vanishingPointY = height  // Point de chute situé à 90% de la hauteur
  
  // Effet de lueur (glow)
  ctx.shadowColor = `rgba(${tronBlue}, 1)`
  ctx.shadowBlur = 15
  
  // Ligne principale horizontale
  ctx.beginPath()
  ctx.strokeStyle = `rgba(${tronBlue}, 1)`
  ctx.lineWidth = 2
  ctx.moveTo(0, middleY)
  ctx.lineTo(width, middleY)
  ctx.stroke()
  
  // Ligne intérieure plus brillante
  ctx.beginPath()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.moveTo(0, middleY)
  ctx.lineTo(width, middleY)
  ctx.stroke()
  
  // NOUVELLES LIGNES HORIZONTALES ANIMÉES
  // Paramètres pour les lignes horizontales
  const initialSpacing = 2 // Espacement initial près de l'horizon
  const totalLines = 35 // Nombre de lignes à dessiner
  const expansionFactor = 8.0 // Facteur d'expansion de l'espacement (plus grand = écart plus rapide)
  
  // Offset d'animation basé sur le temps
  const offset = (time / animationSpeed) % initialSpacing
  
  // Dessiner les lignes horizontales avec espacement progressif
  ctx.beginPath()
  ctx.lineWidth = 2
  ctx.strokeStyle = `rgba(${tronBlue}, 0.7)`
  ctx.shadowBlur = 8
  
  let currentY = middleY + offset // Commencer à partir de la ligne horizontale
  let currentSpacing = initialSpacing
  
  for (let i = 0; i < totalLines; i++) {
    // Ne pas dessiner si on dépasse le bas de l'écran
    if (currentY > height) break
    
    // Dessiner la ligne horizontale
    ctx.beginPath()
    
    // Opacité dégradée en s'éloignant de l'horizon
    const distanceRatio = (currentY - middleY) / (height - middleY)
    const opacity = 1
    
    ctx.strokeStyle = `rgba(${tronBlue}, ${opacity})`
    ctx.lineWidth = 1 + distanceRatio * 1.5 // Lignes plus épaisses en descendant
    
    ctx.moveTo(0, currentY)
    ctx.lineTo(width, currentY)
    ctx.stroke()
    
    // Calculer l'espacement pour la prochaine ligne
    // L'espacement augmente de façon exponentielle
    currentSpacing = initialSpacing * Math.pow(1 + (distanceRatio * expansionFactor), 1.9)
    currentY += currentSpacing
  }
  
  // Ajouter les lignes verticales qui convergent vers le point de chute
  const numVerticalLines = 50  // Nombre de lignes verticales
  const spacing = width / numVerticalLines  // Espacement entre les lignes
  
  for (let i = 0; i <= numVerticalLines; i++) {
    if (i === 0 || i === 1) continue // Skip the first line to avoid duplication
    let x = (width / 2) - spacing * i * i
    if (i === 2) {
      x = ((width / 2) - spacing * i * i) + 25
    }
    
    // Calculer l'opacité en fonction de la distance du centre
    const distanceFromCenter = Math.abs((x / width) - 0.5)
    const opacity = 1
    
    // Effet de lueur pour la ligne verticale
    ctx.shadowColor = `rgba(${tronBlue}, ${opacity})`
    ctx.shadowBlur = 10
    
    // Ligne verticale principale
    ctx.beginPath()
    ctx.strokeStyle = `rgba(${tronBlue}, ${opacity})`
    ctx.lineWidth = 1.5  // Lignes plus fines en s'éloignant du centre
    
    // Partir de la ligne horizontale
    ctx.moveTo(vanishingPointX, middleY)
    
    // Aller vers le point de chute
    ctx.lineTo(x, vanishingPointY)
    ctx.stroke()
    
    // Ligne intérieure plus brillante (uniquement pour les lignes centrales)
    if (distanceFromCenter < 0.2) {
      ctx.beginPath()
      ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - distanceFromCenter * 5) * 0.7})`
      ctx.lineWidth = 0.5
      ctx.moveTo(vanishingPointX, middleY)
      ctx.lineTo(x, vanishingPointY)
      ctx.stroke()
    }
  }
  for (let i = 0; i <= numVerticalLines; i++) {
    if (i === 0 || i === 1) continue // Skip the first line to avoid duplication
    let x = (width / 2) + spacing * i * i
    if (i === 2) {
      x = ((width / 2) + spacing * i * i) - 25
    }
    
    // Calculer l'opacité en fonction de la distance du centre
    const distanceFromCenter = Math.abs((x / width) - 0.5)
    const opacity = 1
    
    // Effet de lueur pour la ligne verticale
    ctx.shadowColor = `rgba(${tronBlue}, ${opacity})`
    ctx.shadowBlur = 10
    
    // Ligne verticale principale
    ctx.beginPath()
    ctx.strokeStyle = `rgba(${tronBlue}, ${opacity})`
    ctx.lineWidth = 1.5  // Lignes plus fines en s'éloignant du centre
    
    // Partir de la ligne horizontale
    ctx.moveTo(vanishingPointX, middleY)
    
    // Aller vers le point de chute
    ctx.lineTo(x, vanishingPointY)
    ctx.stroke()
    
    // Ligne intérieure plus brillante (uniquement pour les lignes centrales)
    if (distanceFromCenter < 0.2) {
      ctx.beginPath()
      ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - distanceFromCenter * 5) * 0.7})`
      ctx.lineWidth = 0.5
      ctx.moveTo(vanishingPointX, middleY)
      ctx.lineTo(x, vanishingPointY)
      ctx.stroke()
    }
  }
}

const animate = (timestamp = 0) => {
  if (!ctx || !canvasRef.value) return
  
  drawGrid(timestamp)
  
  animationFrameId = requestAnimationFrame(animate)
}

const handleResize = () => {
  if (!canvasRef.value || !ctx) return
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight
  drawGrid(0)
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
  <canvas ref="canvasRef" class="tron-canvas"></canvas>
</template>

<style scoped>
.tron-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  background: rgb(0, 5, 15);
}
</style>
