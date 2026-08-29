import { describe, it, expect } from 'vitest'
import {
  mmToPx,
  pxToMm,
  worldToScreen,
  screenToWorld,
  headingToScreenVector,
  yawToCanvasRotation
} from './viewTransform'

// A canvas 400x300 with a centred camera at 1 px/mm: the world origin maps to
// the canvas centre (200, 150).
const SIZE = { width: 400, height: 300 }
const CENTERED = { centerXmm: 0, centerYmm: 0, pxPerMm: 1 }

describe('mmToPx / pxToMm', () => {
  it('scale by pxPerMm', () => {
    expect(mmToPx(100, { pxPerMm: 0.5 })).toBe(50)
    expect(pxToMm(50, { pxPerMm: 0.5 })).toBe(100)
  })

  it('round-trip', () => {
    expect(pxToMm(mmToPx(112, { pxPerMm: 0.37 }), { pxPerMm: 0.37 })).toBeCloseTo(112, 9)
  })
})

describe('worldToScreen', () => {
  it('maps the camera centre to the canvas centre', () => {
    expect(worldToScreen({ x: 0, y: 0 }, CENTERED, SIZE)).toEqual({ x: 200, y: 150 })
  })

  it('sends +x world to the right on screen', () => {
    expect(worldToScreen({ x: 10, y: 0 }, CENTERED, SIZE)).toEqual({ x: 210, y: 150 })
  })

  it('sends +y world UP on screen (smaller screen y)', () => {
    expect(worldToScreen({ x: 0, y: 10 }, CENTERED, SIZE)).toEqual({ x: 200, y: 140 })
  })

  it('scales by pxPerMm', () => {
    const cam = { centerXmm: 0, centerYmm: 0, pxPerMm: 2 }
    expect(worldToScreen({ x: 10, y: 5 }, cam, SIZE)).toEqual({ x: 220, y: 140 })
  })

  it('offsets by the camera centre', () => {
    const cam = { centerXmm: 10, centerYmm: 10, pxPerMm: 1 }
    // The camera's own centre always maps to the canvas centre.
    expect(worldToScreen({ x: 10, y: 10 }, cam, SIZE)).toEqual({ x: 200, y: 150 })
    expect(worldToScreen({ x: 0, y: 0 }, cam, SIZE)).toEqual({ x: 190, y: 160 })
  })
})

describe('screenToWorld', () => {
  it('maps the canvas centre to the camera centre', () => {
    expect(screenToWorld({ x: 200, y: 150 }, CENTERED, SIZE)).toEqual({ x: 0, y: 0 })
  })

  it('inverts worldToScreen (round-trip)', () => {
    const cam = { centerXmm: -37, centerYmm: 128, pxPerMm: 0.42 }
    const world = { x: 314, y: -159 }
    const back = screenToWorld(worldToScreen(world, cam, SIZE), cam, SIZE)
    expect(back.x).toBeCloseTo(world.x, 9)
    expect(back.y).toBeCloseTo(world.y, 9)
  })
})

describe('headingToScreenVector', () => {
  it('faces up on screen at yaw 0 (north)', () => {
    const v = headingToScreenVector(0)
    expect(v.x).toBeCloseTo(0, 9)
    expect(v.y).toBeCloseTo(-1, 9)
  })

  it('faces right at yaw 90 (clockwise, +x world)', () => {
    const v = headingToScreenVector(90)
    expect(v.x).toBeCloseTo(1, 9)
    expect(v.y).toBeCloseTo(0, 9)
  })

  it('faces down at yaw 180', () => {
    const v = headingToScreenVector(180)
    expect(v.x).toBeCloseTo(0, 9)
    expect(v.y).toBeCloseTo(1, 9)
  })

  it('faces left at yaw 270', () => {
    const v = headingToScreenVector(270)
    expect(v.x).toBeCloseTo(-1, 9)
    expect(v.y).toBeCloseTo(0, 9)
  })

  it('is a unit vector at an arbitrary angle', () => {
    const v = headingToScreenVector(37)
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 9)
  })
})

describe('yawToCanvasRotation', () => {
  it('converts degrees to radians directly (clockwise matches canvas)', () => {
    expect(yawToCanvasRotation(0)).toBe(0)
    expect(yawToCanvasRotation(90)).toBeCloseTo(Math.PI / 2, 9)
    expect(yawToCanvasRotation(180)).toBeCloseTo(Math.PI, 9)
  })
})
