import { reactive, readonly, watch } from 'vue'
import { deltaYawDegrees, normalizeDecidegrees, positionDelta, yawToQuaternion } from '../simulator/kinematics'
import { parseConfig, parseConfigJson } from '../simulator/config'

// Motor port constants
export const PORTS = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5
}

// Motor direction constants
export const DIRECTION = {
  SHORTEST_PATH: 0,
  LONGEST_PATH: 1,
  CLOCKWISE: 2,
  COUNTERCLOCKWISE: 3
}

// Motor stop action constants (match SPIKE 3 numeric values)
export const STOP_ACTION = {
  COAST: 0,
  BRAKE: 1,
  HOLD: 2,
  CONTINUE: 3,
  SMART_COAST: 4,
  SMART_BRAKE: 5
}

// Motor pair slot constants (match SPIKE 3 numeric values)
export const PAIRS = {
  PAIR_1: 0,
  PAIR_2: 1,
  PAIR_3: 2
}

// motion_sensor face constants (which face points up). Values match SPIKE 3.
export const FACES = {
  TOP: 0,
  FRONT: 1,
  RIGHT: 2,
  BOTTOM: 3,
  BACK: 4,
  LEFT: 5
}

// Default robot geometry, used by the kinematics layer to derive yaw from
// drive-wheel rotation. Values match the standard SPIKE wheel (see project plan).
const DEFAULT_CONFIG = {
  wheelDiameterMm: 56,
  axleTrackMm: 112,
  drivebaseSlot: PAIRS.PAIR_1
}

// Create initial motor state
function createMotorState() {
  return {
    velocity: 0,
    absolutePosition: 0,
    relativePosition: 0,
    running: false
  }
}

// Validate that a value is one of the defined motor ports.
// Throws if the value is not an integer or is outside the known PORTS set.
function assertValidPort(port) {
  if (!Number.isInteger(port) || !Object.values(PORTS).includes(port)) {
    throw new Error(`Invalid port: ${port}`)
  }
}

// Validate that a value is one of the defined motor pair slots.
function assertValidPair(pair) {
  if (!Number.isInteger(pair) || !Object.values(PAIRS).includes(pair)) {
    throw new Error(`Invalid pair: ${pair}`)
  }
}

function portName(port) {
  return Object.keys(PORTS).find(key => PORTS[key] === port)
}

function pairName(pair) {
  return Object.keys(PAIRS).find(key => PAIRS[key] === pair)
}

// Global robot state
const state = reactive({
  motors: {
    [PORTS.A]: createMotorState(),
    [PORTS.B]: createMotorState(),
    [PORTS.C]: createMotorState(),
    [PORTS.D]: createMotorState(),
    [PORTS.E]: createMotorState(),
    [PORTS.F]: createMotorState()
  },
  motorPairs: {
    [PAIRS.PAIR_1]: null,
    [PAIRS.PAIR_2]: null,
    [PAIRS.PAIR_3]: null
  },
  // Simulated IMU heading in degrees, clockwise-positive. Accumulated from
  // drivebase wheel movement by the watcher below; read via motion_sensor.
  yaw: 0,
  // Estimated robot position in millimetres, integrated from drivebase wheel
  // movement (top-down frame: +x right, +y the initial forward direction).
  // Dead-reckoned for the dashboard; not part of the SPIKE API.
  position: { x: 0, y: 0 },
  config: { ...DEFAULT_CONFIG },
  logs: []
})

// When true, relativePosition changes do not accumulate yaw. Used by
// reset_relative_position, which shifts a motor's encoder baseline without
// physically moving the wheel (so the robot's heading must not change).
let yawSuppressed = false

// Accumulated drive-wheel rotation (degrees) since the last position
// integration. The synchronous yaw watcher fills these (it already ignores
// encoder resets); the post-flush position watcher below consumes them. Routing
// position through accumulators lets each tick's left+right motion be integrated
// as one step, which avoids the spurious sideways drift that per-wheel
// integration produces (yaw is linear in the wheel deltas and so is unaffected,
// but position uses sin/cos and is not).
let driveAccumLeft = 0
let driveAccumRight = 0

// Continuously accumulate yaw from the configured drivebase's wheel movement.
//
// This is the "Option A" continuous-accumulation model: a synchronous watcher
// fires on every relativePosition change, feeds the per-tick wheel deltas into
// the kinematics formula, and adds the result to state.yaw. Because it runs
// synchronously, tilt_angles() is correct at any instant, including mid-move.
watch(
  () => Object.values(PORTS).map(port => state.motors[port].relativePosition),
  (newPositions, oldPositions) => {
    if (yawSuppressed || !oldPositions) return
    const slot = state.motorPairs[state.config.drivebaseSlot]
    if (!slot) return
    // Port numbers (0-5) double as indices into the position arrays.
    const leftDelta = newPositions[slot.left] - oldPositions[slot.left]
    const rightDelta = newPositions[slot.right] - oldPositions[slot.right]
    if (leftDelta === 0 && rightDelta === 0) return
    // Accumulate this fire's wheel motion for the position watcher, then advance
    // the heading. (A single tick updates the two wheels as two separate
    // mutations, so this watcher fires once per wheel; the accumulators let the
    // position watcher recombine them.)
    driveAccumLeft += leftDelta
    driveAccumRight += rightDelta
    state.yaw += deltaYawDegrees(leftDelta, rightDelta, state.config)
  },
  { flush: 'sync' }
)

// Integrate robot position once per flush from the accumulated drive-wheel
// motion. This runs after the synchronous yaw watcher, so state.yaw already
// includes this batch's turn; we subtract it back out to recover the heading at
// the start of the batch and integrate along the arc's midpoint. Because it is
// post-flush, the left and right wheel updates within a tick are combined into a
// single step — driving straight produces no sideways drift, and a pure pivot
// produces no translation. Encoder resets never reach here: the sync watcher
// skips them, so the accumulators stay at zero.
watch(
  () => Object.values(PORTS).map(port => state.motors[port].relativePosition),
  () => {
    if (driveAccumLeft === 0 && driveAccumRight === 0) return
    const headingBefore =
      state.yaw - deltaYawDegrees(driveAccumLeft, driveAccumRight, state.config)
    const { dx, dy } = positionDelta(driveAccumLeft, driveAccumRight, headingBefore, state.config)
    state.position.x += dx
    state.position.y += dy
    driveAccumLeft = 0
    driveAccumRight = 0
  },
  { flush: 'post' }
)

// Motor control functions
export function motorRun(port, velocity) {
  assertValidPort(port)
  state.motors[port].velocity = velocity
  state.motors[port].running = true

  const portName = Object.keys(PORTS).find(key => PORTS[key] === port)
  addLog(`Motor ${portName} running at ${velocity} deg/sec`)
}

export function motorStop(port) {
  assertValidPort(port)
  state.motors[port].velocity = 0
  state.motors[port].running = false

  const portName = Object.keys(PORTS).find(key => PORTS[key] === port)
  addLog(`Motor ${portName} stopped`)
}

export function motorVelocity(port) {
  assertValidPort(port)
  return state.motors[port].velocity
}

export function motorAbsolutePosition(port) {
  assertValidPort(port)
  return state.motors[port].absolutePosition
}

export function motorRelativePosition(port) {
  assertValidPort(port)
  return state.motors[port].relativePosition
}

export function motorRunForDegrees(port, degrees, velocity) {
  assertValidPort(port)
  const portName = Object.keys(PORTS).find(key => PORTS[key] === port)
  const absDegrees = Math.abs(degrees)
  const direction = degrees >= 0 ? 1 : -1
  const absVelocity = Math.abs(velocity)
  const durationMs = (absDegrees / absVelocity) * 1000

  state.motors[port].velocity = absVelocity * direction
  state.motors[port].running = true
  addLog(`Motor ${portName} running for ${degrees} degrees at ${velocity} deg/sec`)

  return new Promise((resolve) => {
    const startPosition = state.motors[port].relativePosition
    const startAbsPosition = state.motors[port].absolutePosition
    const startTime = performance.now()

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      const movedDegrees = absDegrees * progress * direction

      state.motors[port].relativePosition = startPosition + movedDegrees
      state.motors[port].absolutePosition = ((startAbsPosition + movedDegrees) % 360 + 360) % 360

      if (progress >= 1) {
        clearInterval(interval)
        state.motors[port].velocity = 0
        state.motors[port].running = false
        addLog(`Motor ${portName} completed ${degrees} degrees`)
        resolve()
      }
    }, 50)
  })
}

export function motorRunForTime(port, duration, velocity) {
  assertValidPort(port)
  const portName = Object.keys(PORTS).find(key => PORTS[key] === port)
  const direction = velocity >= 0 ? 1 : -1
  const absVelocity = Math.abs(velocity)

  state.motors[port].velocity = velocity
  state.motors[port].running = true
  addLog(`Motor ${portName} running for ${duration}ms at ${velocity} deg/sec`)

  return new Promise((resolve) => {
    const startPosition = state.motors[port].relativePosition
    const startAbsPosition = state.motors[port].absolutePosition
    const startTime = performance.now()

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const movedDegrees = absVelocity * (elapsed / 1000) * direction

      if (progress >= 1) {
        const totalDegrees = absVelocity * (duration / 1000) * direction
        state.motors[port].relativePosition = startPosition + totalDegrees
        state.motors[port].absolutePosition = ((startAbsPosition + totalDegrees) % 360 + 360) % 360
        clearInterval(interval)
        state.motors[port].velocity = 0
        state.motors[port].running = false
        addLog(`Motor ${portName} completed ${duration}ms run`)
        resolve()
      } else {
        state.motors[port].relativePosition = startPosition + movedDegrees
        state.motors[port].absolutePosition = ((startAbsPosition + movedDegrees) % 360 + 360) % 360
      }
    }, 50)
  })
}

export function motorResetRelativePosition(port, position) {
  assertValidPort(port)
  const portName = Object.keys(PORTS).find(key => PORTS[key] === port)
  // Resetting the encoder baseline must not turn the robot, so suppress yaw
  // accumulation for this synchronous assignment.
  yawSuppressed = true
  state.motors[port].relativePosition = position
  yawSuppressed = false
  addLog(`Motor ${portName} relative position reset to ${position}`)
}

export function motorRunToRelativePosition(port, position, velocity) {
  assertValidPort(port)
  const portName = Object.keys(PORTS).find(key => PORTS[key] === port)
  const currentRelPos = state.motors[port].relativePosition
  const degreesToMove = position - currentRelPos
  const absVelocity = Math.abs(velocity)

  if (degreesToMove === 0) {
    addLog(`Motor ${portName} already at relative position ${position}`)
    return Promise.resolve()
  }

  const absDegrees = Math.abs(degreesToMove)
  const moveDirection = degreesToMove >= 0 ? 1 : -1
  const durationMs = (absDegrees / absVelocity) * 1000

  state.motors[port].velocity = absVelocity * moveDirection
  state.motors[port].running = true
  addLog(`Motor ${portName} running to relative position ${position} at ${velocity} deg/sec`)

  return new Promise((resolve) => {
    const startRelPosition = state.motors[port].relativePosition
    const startAbsPosition = state.motors[port].absolutePosition
    const startTime = performance.now()

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      const movedDegrees = absDegrees * progress * moveDirection

      state.motors[port].relativePosition = startRelPosition + movedDegrees
      state.motors[port].absolutePosition = ((startAbsPosition + movedDegrees) % 360 + 360) % 360

      if (progress >= 1) {
        clearInterval(interval)
        // Snap to exact target position
        state.motors[port].relativePosition = position
        state.motors[port].absolutePosition = ((startAbsPosition + degreesToMove) % 360 + 360) % 360
        state.motors[port].velocity = 0
        state.motors[port].running = false
        addLog(`Motor ${portName} reached relative position ${position}`)
        resolve()
      }
    }, 50)
  })
}

export function motorRunToAbsolutePosition(port, position, velocity, direction = DIRECTION.SHORTEST_PATH) {
  assertValidPort(port)
  const portName = Object.keys(PORTS).find(key => PORTS[key] === port)
  const currentAbsPos = state.motors[port].absolutePosition
  const absVelocity = Math.abs(velocity)

  // Calculate clockwise and counterclockwise distances
  const cwDistance = (position - currentAbsPos + 360) % 360
  const ccwDistance = (currentAbsPos - position + 360) % 360

  let degreesToMove
  if (direction === DIRECTION.CLOCKWISE) {
    degreesToMove = cwDistance === 0 ? 0 : cwDistance
  } else if (direction === DIRECTION.COUNTERCLOCKWISE) {
    degreesToMove = ccwDistance === 0 ? 0 : -ccwDistance
  } else if (direction === DIRECTION.LONGEST_PATH) {
    degreesToMove = cwDistance >= ccwDistance ? cwDistance : -ccwDistance
  } else {
    // SHORTEST_PATH (default)
    degreesToMove = cwDistance <= ccwDistance ? cwDistance : -ccwDistance
  }

  if (degreesToMove === 0) {
    addLog(`Motor ${portName} already at position ${position}`)
    return Promise.resolve()
  }

  const absDegrees = Math.abs(degreesToMove)
  const moveDirection = degreesToMove >= 0 ? 1 : -1
  const durationMs = (absDegrees / absVelocity) * 1000

  state.motors[port].velocity = absVelocity * moveDirection
  state.motors[port].running = true
  addLog(`Motor ${portName} running to absolute position ${position} at ${velocity} deg/sec`)

  return new Promise((resolve) => {
    const startRelPosition = state.motors[port].relativePosition
    const startAbsPosition = state.motors[port].absolutePosition
    const startTime = performance.now()

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      const movedDegrees = absDegrees * progress * moveDirection

      state.motors[port].relativePosition = startRelPosition + movedDegrees
      state.motors[port].absolutePosition = ((startAbsPosition + movedDegrees) % 360 + 360) % 360

      if (progress >= 1) {
        clearInterval(interval)
        // Snap to exact target position
        state.motors[port].absolutePosition = position
        state.motors[port].relativePosition = startRelPosition + degreesToMove
        state.motors[port].velocity = 0
        state.motors[port].running = false
        addLog(`Motor ${portName} reached absolute position ${position}`)
        resolve()
      }
    }, 50)
  })
}

// Motor pair bookkeeping
export function motorPairPair(pair, leftPort, rightPort) {
  assertValidPair(pair)
  assertValidPort(leftPort)
  assertValidPort(rightPort)
  if (leftPort === rightPort) {
    throw new Error(`Cannot pair motor ${portName(leftPort)} with itself`)
  }
  for (const [slot, existing] of Object.entries(state.motorPairs)) {
    if (Number(slot) === pair || !existing) continue
    if (existing.left === leftPort || existing.right === leftPort ||
        existing.left === rightPort || existing.right === rightPort) {
      throw new Error(`Motor already in use by ${pairName(Number(slot))}`)
    }
  }
  state.motorPairs[pair] = { left: leftPort, right: rightPort }
  addLog(`Paired ${pairName(pair)}: left=${portName(leftPort)}, right=${portName(rightPort)}`)
}

export function motorPairUnpair(pair) {
  assertValidPair(pair)
  if (!state.motorPairs[pair]) {
    throw new Error(`${pairName(pair)} is not paired`)
  }
  state.motorPairs[pair] = null
  addLog(`Unpaired ${pairName(pair)}`)
}

function assertPaired(pair) {
  assertValidPair(pair)
  const slot = state.motorPairs[pair]
  if (!slot) {
    throw new Error(`${pairName(pair)} is not paired`)
  }
  return slot
}

// Apply left/right velocities to a pair's underlying motors without per-motor logging.
function applyPairVelocities(slot, leftVelocity, rightVelocity) {
  state.motors[slot.left].velocity = leftVelocity
  state.motors[slot.left].running = leftVelocity !== 0
  state.motors[slot.right].velocity = rightVelocity
  state.motors[slot.right].running = rightVelocity !== 0
}

// Compute left/right velocities from a steering value in [-100, 100].
// steering=0 drives straight; ±50 stops the inside wheel; ±100 pivots in place.
function steeringToVelocities(steering, velocity) {
  const s = Math.max(-100, Math.min(100, steering))
  if (s >= 0) {
    return { left: velocity, right: velocity * (1 - s / 50) }
  }
  return { left: velocity * (1 + s / 50), right: velocity }
}

export function motorPairMove(pair, steering, velocity) {
  const slot = assertPaired(pair)
  const { left, right } = steeringToVelocities(steering, velocity)
  applyPairVelocities(slot, left, right)
  addLog(`${pairName(pair)} moving at steering=${steering}, velocity=${velocity} (L=${left}, R=${right})`)
}

export function motorPairMoveTank(pair, leftVelocity, rightVelocity) {
  const slot = assertPaired(pair)
  applyPairVelocities(slot, leftVelocity, rightVelocity)
  addLog(`${pairName(pair)} tank: L=${leftVelocity}, R=${rightVelocity}`)
}

export function motorPairStop(pair) {
  const slot = assertPaired(pair)
  applyPairVelocities(slot, 0, 0)
  addLog(`${pairName(pair)} stopped`)
}

export function motorPairMoveForDegrees(pair, degrees, steering, velocity) {
  const slot = assertPaired(pair)
  const name = pairName(pair)
  const direction = degrees >= 0 ? 1 : -1
  const absDegrees = Math.abs(degrees)
  const absVelocity = Math.abs(velocity)

  if (absVelocity === 0) {
    addLog(`${name} move for ${degrees} deg skipped: velocity is 0`)
    return Promise.resolve()
  }

  const { left: leftVel, right: rightVel } = steeringToVelocities(steering, absVelocity)
  const durationMs = (absDegrees / absVelocity) * 1000

  applyPairVelocities(slot, leftVel * direction, rightVel * direction)
  addLog(`${name} move for ${degrees} deg, steering=${steering}, velocity=${velocity}`)

  return new Promise((resolve) => {
    const leftStart = { rel: state.motors[slot.left].relativePosition, abs: state.motors[slot.left].absolutePosition }
    const rightStart = { rel: state.motors[slot.right].relativePosition, abs: state.motors[slot.right].absolutePosition }
    const startTime = performance.now()

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      const leftMoved = (leftVel / absVelocity) * absDegrees * progress * direction
      const rightMoved = (rightVel / absVelocity) * absDegrees * progress * direction

      state.motors[slot.left].relativePosition = leftStart.rel + leftMoved
      state.motors[slot.left].absolutePosition = ((leftStart.abs + leftMoved) % 360 + 360) % 360
      state.motors[slot.right].relativePosition = rightStart.rel + rightMoved
      state.motors[slot.right].absolutePosition = ((rightStart.abs + rightMoved) % 360 + 360) % 360

      if (progress >= 1) {
        clearInterval(interval)
        applyPairVelocities(slot, 0, 0)
        addLog(`${name} completed ${degrees} deg move`)
        resolve()
      }
    }, 50)
  })
}

export function motorPairMoveForTime(pair, duration, steering, velocity) {
  const slot = assertPaired(pair)
  const name = pairName(pair)
  const { left: leftVel, right: rightVel } = steeringToVelocities(steering, velocity)

  applyPairVelocities(slot, leftVel, rightVel)
  addLog(`${name} move for ${duration}ms, steering=${steering}, velocity=${velocity}`)

  return new Promise((resolve) => {
    const leftStart = { rel: state.motors[slot.left].relativePosition, abs: state.motors[slot.left].absolutePosition }
    const rightStart = { rel: state.motors[slot.right].relativePosition, abs: state.motors[slot.right].absolutePosition }
    const startTime = performance.now()

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      if (progress >= 1) {
        const leftTotal = leftVel * (duration / 1000)
        const rightTotal = rightVel * (duration / 1000)
        state.motors[slot.left].relativePosition = leftStart.rel + leftTotal
        state.motors[slot.left].absolutePosition = ((leftStart.abs + leftTotal) % 360 + 360) % 360
        state.motors[slot.right].relativePosition = rightStart.rel + rightTotal
        state.motors[slot.right].absolutePosition = ((rightStart.abs + rightTotal) % 360 + 360) % 360
        clearInterval(interval)
        applyPairVelocities(slot, 0, 0)
        addLog(`${name} completed ${duration}ms move`)
        resolve()
      } else {
        const leftMoved = leftVel * (elapsed / 1000)
        const rightMoved = rightVel * (elapsed / 1000)
        state.motors[slot.left].relativePosition = leftStart.rel + leftMoved
        state.motors[slot.left].absolutePosition = ((leftStart.abs + leftMoved) % 360 + 360) % 360
        state.motors[slot.right].relativePosition = rightStart.rel + rightMoved
        state.motors[slot.right].absolutePosition = ((rightStart.abs + rightMoved) % 360 + 360) % 360
      }
    }, 50)
  })
}

export function motorPairMoveTankForDegrees(pair, degrees, leftVelocity, rightVelocity) {
  const slot = assertPaired(pair)
  const name = pairName(pair)
  const absDegrees = Math.abs(degrees)
  const absLeftVel = Math.abs(leftVelocity)
  const absRightVel = Math.abs(rightVelocity)
  const leftDir = leftVelocity >= 0 ? 1 : -1
  const rightDir = rightVelocity >= 0 ? 1 : -1
  const leftDuration = absLeftVel > 0 ? (absDegrees / absLeftVel) * 1000 : 0
  const rightDuration = absRightVel > 0 ? (absDegrees / absRightVel) * 1000 : 0
  const totalDuration = Math.max(leftDuration, rightDuration)

  if (totalDuration === 0) {
    addLog(`${name} tank for ${degrees} deg skipped: both velocities are 0`)
    return Promise.resolve()
  }

  applyPairVelocities(slot, leftVelocity, rightVelocity)
  addLog(`${name} tank for ${degrees} deg: L=${leftVelocity}, R=${rightVelocity}`)

  return new Promise((resolve) => {
    const leftStart = { rel: state.motors[slot.left].relativePosition, abs: state.motors[slot.left].absolutePosition }
    const rightStart = { rel: state.motors[slot.right].relativePosition, abs: state.motors[slot.right].absolutePosition }
    const startTime = performance.now()

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const leftMoved = absLeftVel > 0 ? absDegrees * Math.min(elapsed / leftDuration, 1) * leftDir : 0
      const rightMoved = absRightVel > 0 ? absDegrees * Math.min(elapsed / rightDuration, 1) * rightDir : 0

      state.motors[slot.left].relativePosition = leftStart.rel + leftMoved
      state.motors[slot.left].absolutePosition = ((leftStart.abs + leftMoved) % 360 + 360) % 360
      state.motors[slot.right].relativePosition = rightStart.rel + rightMoved
      state.motors[slot.right].absolutePosition = ((rightStart.abs + rightMoved) % 360 + 360) % 360

      if (elapsed >= totalDuration) {
        clearInterval(interval)
        // Snap each motor to its exact final position
        if (absLeftVel > 0) {
          const leftFinal = absDegrees * leftDir
          state.motors[slot.left].relativePosition = leftStart.rel + leftFinal
          state.motors[slot.left].absolutePosition = ((leftStart.abs + leftFinal) % 360 + 360) % 360
        }
        if (absRightVel > 0) {
          const rightFinal = absDegrees * rightDir
          state.motors[slot.right].relativePosition = rightStart.rel + rightFinal
          state.motors[slot.right].absolutePosition = ((rightStart.abs + rightFinal) % 360 + 360) % 360
        }
        applyPairVelocities(slot, 0, 0)
        addLog(`${name} tank completed ${degrees} deg`)
        resolve()
      }
    }, 50)
  })
}

export function motorPairMoveTankForTime(pair, duration, leftVelocity, rightVelocity) {
  const slot = assertPaired(pair)
  const name = pairName(pair)

  applyPairVelocities(slot, leftVelocity, rightVelocity)
  addLog(`${name} tank for ${duration}ms: L=${leftVelocity}, R=${rightVelocity}`)

  return new Promise((resolve) => {
    const leftStart = { rel: state.motors[slot.left].relativePosition, abs: state.motors[slot.left].absolutePosition }
    const rightStart = { rel: state.motors[slot.right].relativePosition, abs: state.motors[slot.right].absolutePosition }
    const startTime = performance.now()

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      if (progress >= 1) {
        const leftTotal = leftVelocity * (duration / 1000)
        const rightTotal = rightVelocity * (duration / 1000)
        state.motors[slot.left].relativePosition = leftStart.rel + leftTotal
        state.motors[slot.left].absolutePosition = ((leftStart.abs + leftTotal) % 360 + 360) % 360
        state.motors[slot.right].relativePosition = rightStart.rel + rightTotal
        state.motors[slot.right].absolutePosition = ((rightStart.abs + rightTotal) % 360 + 360) % 360
        clearInterval(interval)
        applyPairVelocities(slot, 0, 0)
        addLog(`${name} tank completed ${duration}ms`)
        resolve()
      } else {
        const leftMoved = leftVelocity * (elapsed / 1000)
        const rightMoved = rightVelocity * (elapsed / 1000)
        state.motors[slot.left].relativePosition = leftStart.rel + leftMoved
        state.motors[slot.left].absolutePosition = ((leftStart.abs + leftMoved) % 360 + 360) % 360
        state.motors[slot.right].relativePosition = rightStart.rel + rightMoved
        state.motors[slot.right].absolutePosition = ((rightStart.abs + rightMoved) % 360 + 360) % 360
      }
    }, 50)
  })
}

// Robot configuration (geometry used by the kinematics layer)
export function setRobotConfig(partial) {
  if (partial == null || typeof partial !== 'object') {
    throw new Error('Robot config must be an object')
  }
  const next = { ...state.config, ...partial }
  if (!(next.wheelDiameterMm > 0)) {
    throw new Error(`Invalid wheelDiameterMm: ${next.wheelDiameterMm}`)
  }
  if (!(next.axleTrackMm > 0)) {
    throw new Error(`Invalid axleTrackMm: ${next.axleTrackMm}`)
  }
  assertValidPair(next.drivebaseSlot)
  state.config = next
  addLog(
    `Robot config: wheelDiameter=${next.wheelDiameterMm}mm, ` +
    `axleTrack=${next.axleTrackMm}mm, drivebase=${pairName(next.drivebaseSlot)}`
  )
}

// Apply a full robot configuration (the user-facing JSON shape, or a string of
// it). This both sets the robot geometry and pairs the configured drivebase
// motors so the kinematics layer can derive yaw/position. Returns the parsed
// config. Throws (without mutating state) if the config is invalid.
export function applyConfig(jsonOrObject) {
  const parsed = typeof jsonOrObject === 'string'
    ? parseConfigJson(jsonOrObject)
    : parseConfig(jsonOrObject)

  // Re-pair the drivebase slot from scratch so re-applying a config is
  // idempotent; clearing first avoids "already paired" errors.
  state.motorPairs[parsed.drivebaseSlot] = null
  motorPairPair(parsed.drivebaseSlot, parsed.leftMotorPort, parsed.rightMotorPort)
  setRobotConfig({
    wheelDiameterMm: parsed.wheelDiameterMm,
    axleTrackMm: parsed.axleTrackMm,
    drivebaseSlot: parsed.drivebaseSlot
  })
  if (parsed.name) {
    addLog(`Loaded robot configuration: ${parsed.name}`)
  }
  return parsed
}

// motion_sensor functions ---------------------------------------------------
// Yaw is derived from drivebase wheel movement (see the watcher above). Pitch
// and roll are always 0 in Phase 1 — there is no terrain or physics to tilt
// against.

// tilt_angles() → (yaw, pitch, roll) in decidegrees, yaw wrapped to (-1800, 1800].
export function motionTiltAngles() {
  return [normalizeDecidegrees(Math.round(state.yaw * 10)), 0, 0]
}

// reset_yaw(angle) sets the reported yaw to `angle` degrees (default 0).
export function motionResetYaw(angle = 0) {
  state.yaw = angle
  addLog(`Yaw reset to ${angle}`)
}

// acceleration()/angular_velocity() are not simulated in Phase 1 (no physics).
export function motionAcceleration() {
  return [0, 0, 0]
}

export function motionAngularVelocity() {
  return [0, 0, 0]
}

// quaternion() derived from yaw alone (pitch/roll = 0).
export function motionQuaternion() {
  return yawToQuaternion(state.yaw)
}

// up_face() is always TOP with no tilt simulation; stable() is always true.
export function motionUpFace() {
  return FACES.TOP
}

export function motionStable() {
  return true
}

// Logging functions
export function addLog(message) {
  const timestamp = new Date().toLocaleTimeString()
  state.logs.push({ timestamp, message })
}

export function clearLogs() {
  state.logs.splice(0, state.logs.length)
}

// Reset robot state
export function resetState() {
  for (const port of Object.values(PORTS)) {
    state.motors[port] = createMotorState()
  }
  for (const pair of Object.values(PAIRS)) {
    state.motorPairs[pair] = null
  }
  // Reset after motors/pairs so any yaw/position the watcher accrued during
  // reset is discarded; restore default geometry.
  state.yaw = 0
  state.position.x = 0
  state.position.y = 0
  driveAccumLeft = 0
  driveAccumRight = 0
  state.config = { ...DEFAULT_CONFIG }
  clearLogs()
}

// Composable export
export function useRobotState() {
  return {
    state: readonly(state),
    PORTS,
    DIRECTION,
    STOP_ACTION,
    PAIRS,
    FACES,
    motorRun,
    motorStop,
    motorRunForDegrees,
    motorRunForTime,
    motorRunToAbsolutePosition,
    motorRunToRelativePosition,
    motorResetRelativePosition,
    motorVelocity,
    motorAbsolutePosition,
    motorRelativePosition,
    motorPairPair,
    motorPairUnpair,
    motorPairMove,
    motorPairMoveTank,
    motorPairStop,
    motorPairMoveForDegrees,
    motorPairMoveForTime,
    motorPairMoveTankForDegrees,
    motorPairMoveTankForTime,
    setRobotConfig,
    applyConfig,
    motionTiltAngles,
    motionResetYaw,
    motionAcceleration,
    motionAngularVelocity,
    motionQuaternion,
    motionUpFace,
    motionStable,
    addLog,
    clearLogs,
    resetState
  }
}
