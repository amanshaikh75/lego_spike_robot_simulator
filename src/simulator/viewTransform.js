// Pure world<->screen coordinate math for the top-down FieldView (Phase 2).
//
// Two frames are involved:
//   World  — millimetres. +x right, +y "north" (the robot's initial forward
//            direction). Origin is where the robot started / last reset. This is
//            the frame of state.position.
//   Screen — CSS pixels on the canvas. +x right, +y DOWN, origin at the top-left
//            corner (the usual canvas convention).
//
// A camera frames the world on screen:
//   { centerXmm, centerYmm } — the world point shown at the centre of the canvas
//   pxPerMm                  — zoom, in screen pixels per world millimetre
//
// Because world +y is up and screen +y is down, the y axis flips between frames
// while x keeps its direction. Yaw is clockwise-positive with 0 = facing +y (up
// on screen), matching state.yaw and the real SPIKE motion sensor.
//
// Everything here is pure and DOM-free so it can be unit-tested without a canvas
// (mirroring the kinematics module's tested-math / thin-component split).

// Convert a length in millimetres to screen pixels at the camera's zoom.
export function mmToPx(mm, camera) {
  return mm * camera.pxPerMm
}

// Convert a length in screen pixels back to millimetres at the camera's zoom.
export function pxToMm(px, camera) {
  return px / camera.pxPerMm
}

// Map a world point {x, y} (mm) to a screen point {x, y} (px) on a canvas of the
// given size {width, height} (px). The camera centre lands at the canvas centre;
// the y axis flips (world up -> screen up).
export function worldToScreen({ x, y }, camera, { width, height }) {
  return {
    x: width / 2 + (x - camera.centerXmm) * camera.pxPerMm,
    y: height / 2 - (y - camera.centerYmm) * camera.pxPerMm
  }
}

// Inverse of worldToScreen: map a screen point {x, y} (px) back to world mm.
export function screenToWorld({ x, y }, camera, { width, height }) {
  return {
    x: camera.centerXmm + (x - width / 2) / camera.pxPerMm,
    y: camera.centerYmm - (y - height / 2) / camera.pxPerMm
  }
}

// Unit vector, in SCREEN space, pointing where a robot at heading `yawDegrees`
// faces. Yaw 0 faces +y world = up on screen = (0, -1); yaw 90 (clockwise) faces
// +x world = right = (1, 0). So x = sin(yaw), y = -cos(yaw).
export function headingToScreenVector(yawDegrees) {
  const rad = (yawDegrees * Math.PI) / 180
  return { x: Math.sin(rad), y: -Math.cos(rad) }
}

// Rotation (radians) to pass to canvas ctx.rotate() so a shape drawn pointing
// "up" in local coordinates (its nose toward -y) ends up facing `yawDegrees`.
// Canvas positive rotation is clockwise on screen, which matches our
// clockwise-positive yaw, so this is a direct degrees->radians conversion.
export function yawToCanvasRotation(yawDegrees) {
  return (yawDegrees * Math.PI) / 180
}
