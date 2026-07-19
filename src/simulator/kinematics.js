// Differential-drive kinematics for the simulated robot.
//
// These are pure functions: they turn motor rotation (in degrees) into robot
// motion (a change in heading), with no notion of forces, mass, or time. That
// is all Phase 1 needs — yaw is derived purely from how far each drive wheel
// has turned.
//
// Sign convention: yaw is CLOCKWISE-positive, matching the real SPIKE Prime
// motion sensor (turning the robot to the right increases yaw). This is the
// opposite sign of the standard math convention, and is why the formula below
// is (left - right) rather than the (right - left) sketched in the project plan.

// Distance a wheel travels in one full rotation, in millimetres.
export function wheelCircumference(wheelDiameterMm) {
  return Math.PI * wheelDiameterMm
}

// Linear distance (mm) a wheel travels for a given rotation in degrees.
export function arcDistance(degrees, wheelDiameterMm) {
  return (degrees / 360) * wheelCircumference(wheelDiameterMm)
}

// Change in robot heading (degrees, clockwise-positive) produced by the two
// drive wheels rotating leftDegrees and rightDegrees respectively.
//
//   delta_yaw_rad = (left_distance - right_distance) / axle_track
//
// The wider the axle track, the less a given wheel difference turns the robot.
export function deltaYawDegrees(leftDegrees, rightDegrees, { wheelDiameterMm, axleTrackMm }) {
  if (!(axleTrackMm > 0)) {
    throw new Error(`Invalid axleTrackMm: ${axleTrackMm}`)
  }
  const leftDistance = arcDistance(leftDegrees, wheelDiameterMm)
  const rightDistance = arcDistance(rightDegrees, wheelDiameterMm)
  const deltaYawRad = (leftDistance - rightDistance) / axleTrackMm
  return (deltaYawRad * 180) / Math.PI
}

// Forward (translational) distance the robot's centre travels in a tick where
// the left and right wheels rotate leftDegrees/rightDegrees. It is the mean of
// the two wheel arcs (a turning robot's centre advances by the average).
export function forwardDistance(leftDegrees, rightDegrees, wheelDiameterMm) {
  return (
    arcDistance(leftDegrees, wheelDiameterMm) +
    arcDistance(rightDegrees, wheelDiameterMm)
  ) / 2
}

// Displacement {dx, dy} in mm of the robot centre for a tick in which the drive
// wheels rotate leftDegrees/rightDegrees, starting from heading `headingDegrees`
// (clockwise-positive, 0 = facing +Y). The integration uses the heading at the
// midpoint of the tick (start heading + half the tick's yaw change), which keeps
// curved paths accurate without needing sub-stepping.
//
// In the top-down frame, +X points right and +Y points "north" (the robot's
// initial forward direction). A clockwise heading of 90° therefore faces +X, so
// dx uses sin(heading) and dy uses cos(heading).
export function positionDelta(leftDegrees, rightDegrees, headingDegrees, config) {
  const distance = forwardDistance(leftDegrees, rightDegrees, config.wheelDiameterMm)
  const deltaYaw = deltaYawDegrees(leftDegrees, rightDegrees, config)
  const midRad = ((headingDegrees + deltaYaw / 2) * Math.PI) / 180
  return { dx: distance * Math.sin(midRad), dy: distance * Math.cos(midRad) }
}

// Normalize an angle in degrees to the half-open range (-180, 180].
export function normalizeDegrees(degrees) {
  let d = ((degrees % 360) + 360) % 360 // [0, 360)
  if (d > 180) d -= 360
  return d
}

// Normalize an angle in decidegrees to the half-open range (-1800, 1800],
// matching the range reported by motion_sensor.tilt_angles().
export function normalizeDecidegrees(decidegrees) {
  let d = ((decidegrees % 3600) + 3600) % 3600 // [0, 3600)
  if (d > 1800) d -= 3600
  return d
}

// Unit quaternion (w, x, y, z) for a rotation of `yawDegrees` about the
// vertical (z) axis, with pitch and roll assumed zero.
export function yawToQuaternion(yawDegrees) {
  const half = (yawDegrees * Math.PI) / 180 / 2
  return [Math.cos(half), 0, 0, Math.sin(half)]
}
