<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { worldToScreen, screenToWorld, yawToCanvasRotation } from '../simulator/viewTransform'

const props = defineProps({
  state: {
    type: Object,
    required: true
  }
})

const canvasRef = ref(null)
const containerRef = ref(null)

// Reference grid spacing, in millimetres.
const GRID_MM = 100

// Fixed camera for Milestone 2.1 — origin centred, a gentle zoom-out so a robot
// that drives a few hundred mm stays on screen. Pan/zoom controls arrive in
// Milestone 2.3, at which point this becomes reactive.
const camera = { centerXmm: 0, centerYmm: 0, pxPerMm: 0.5 }

// CSS-pixel canvas size, measured from the container on mount / resize.
let cssWidth = 0
let cssHeight = 0
// Pending requestAnimationFrame id, used to coalesce redraws to one per frame.
let rafId = 0

// Size the canvas backing store to the container, accounting for devicePixelRatio
// so lines stay crisp on HiDPI displays, then redraw.
function resize() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return
  const dpr = window.devicePixelRatio || 1
  cssWidth = container.clientWidth
  cssHeight = container.clientHeight
  canvas.width = Math.round(cssWidth * dpr)
  canvas.height = Math.round(cssHeight * dpr)
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`
  draw()
}

// Coalesce reactive updates (position/yaw change on the ~50ms move ticks) into
// at most one draw per animation frame.
function scheduleDraw() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    draw()
  })
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas || cssWidth === 0 || cssHeight === 0) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const size = { width: cssWidth, height: cssHeight }

  // Work in CSS pixels: scale the whole context by dpr once.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssWidth, cssHeight)
  ctx.fillStyle = '#fbfcfd'
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  drawGrid(ctx, size)
  drawAxes(ctx, size)
  drawOrigin(ctx, size)
  drawRobot(ctx, size)
}

// Grid lines at every GRID_MM across the currently visible world region.
function drawGrid(ctx, size) {
  const topLeft = screenToWorld({ x: 0, y: 0 }, camera, size)
  const bottomRight = screenToWorld({ x: size.width, y: size.height }, camera, size)
  const minX = Math.min(topLeft.x, bottomRight.x)
  const maxX = Math.max(topLeft.x, bottomRight.x)
  const minY = Math.min(topLeft.y, bottomRight.y)
  const maxY = Math.max(topLeft.y, bottomRight.y)

  ctx.strokeStyle = '#e9ecef'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = Math.ceil(minX / GRID_MM) * GRID_MM; x <= maxX; x += GRID_MM) {
    const top = worldToScreen({ x, y: maxY }, camera, size)
    const bottom = worldToScreen({ x, y: minY }, camera, size)
    ctx.moveTo(Math.round(top.x) + 0.5, top.y)
    ctx.lineTo(Math.round(bottom.x) + 0.5, bottom.y)
  }
  for (let y = Math.ceil(minY / GRID_MM) * GRID_MM; y <= maxY; y += GRID_MM) {
    const left = worldToScreen({ x: minX, y }, camera, size)
    const right = worldToScreen({ x: maxX, y }, camera, size)
    ctx.moveTo(left.x, Math.round(left.y) + 0.5)
    ctx.lineTo(right.x, Math.round(right.y) + 0.5)
  }
  ctx.stroke()
}

// The world x and y axes (world x=0 and y=0), drawn a touch darker than the grid.
function drawAxes(ctx, size) {
  const origin = worldToScreen({ x: 0, y: 0 }, camera, size)
  ctx.strokeStyle = '#ced4da'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(Math.round(origin.x) + 0.5, 0)
  ctx.lineTo(Math.round(origin.x) + 0.5, size.height)
  ctx.moveTo(0, Math.round(origin.y) + 0.5)
  ctx.lineTo(size.width, Math.round(origin.y) + 0.5)
  ctx.stroke()
}

// A small marker at the world origin (the robot's start / reset position).
function drawOrigin(ctx, size) {
  const o = worldToScreen({ x: 0, y: 0 }, camera, size)
  ctx.fillStyle = '#868e96'
  ctx.beginPath()
  ctx.arc(o.x, o.y, 3, 0, Math.PI * 2)
  ctx.fill()
}

// The robot as an oriented footprint: a body rectangle sized from the axle track
// with a nose triangle marking the heading. Drawn pointing "up" in local space
// (nose toward -y), then rotated by the yaw.
function drawRobot(ctx, size) {
  const pos = worldToScreen(
    { x: props.state.position.x, y: props.state.position.y },
    camera,
    size
  )
  const track = props.state.config.axleTrackMm
  const bodyW = Math.max(track * camera.pxPerMm, 12)
  const bodyL = bodyW * 1.4
  const nose = bodyW * 0.35

  ctx.save()
  ctx.translate(pos.x, pos.y)
  ctx.rotate(yawToCanvasRotation(props.state.yaw))

  ctx.fillStyle = 'rgba(33, 150, 243, 0.85)'
  ctx.strokeStyle = '#1565c0'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.rect(-bodyW / 2, -bodyL / 2, bodyW, bodyL)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#0d47a1'
  ctx.beginPath()
  ctx.moveTo(0, -bodyL / 2 - nose)
  ctx.lineTo(-bodyW / 2, -bodyL / 2)
  ctx.lineTo(bodyW / 2, -bodyL / 2)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

// Redraw whenever the robot's pose or footprint geometry changes.
watch(
  () => [
    props.state.position.x,
    props.state.position.y,
    props.state.yaw,
    props.state.config.axleTrackMm
  ],
  scheduleDraw
)

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="field-view">
    <h3>Field View</h3>
    <div ref="containerRef" class="canvas-container">
      <canvas ref="canvasRef"></canvas>
    </div>
    <p class="hint">Top-down · grid = {{ GRID_MM }} mm · origin = start position · blue nose = heading</p>
  </div>
</template>

<style scoped>
.field-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

h3 {
  margin: 0;
  color: #333;
}

.canvas-container {
  position: relative;
  width: 100%;
  height: 360px;
  background-color: #fbfcfd;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  overflow: hidden;
}

canvas {
  display: block;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: #868e96;
}
</style>
