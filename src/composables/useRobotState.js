import { reactive, readonly } from 'vue'

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
  logs: []
})

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
  state.motors[port].relativePosition = position
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
    addLog,
    clearLogs,
    resetState
  }
}
