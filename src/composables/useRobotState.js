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

// Create initial motor state
function createMotorState() {
  return {
    velocity: 0,
    absolutePosition: 0,
    relativePosition: 0,
    running: false
  }
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
  logs: []
})

// Motor control functions
export function motorRun(port, velocity) {
  if (port < 0 || port > 5) {
    throw new Error(`Invalid port: ${port}`)
  }
  state.motors[port].velocity = velocity
  state.motors[port].running = true

  const portName = Object.keys(PORTS).find(key => PORTS[key] === port)
  addLog(`Motor ${portName} running at ${velocity} deg/sec`)
}

export function motorStop(port) {
  if (port < 0 || port > 5) {
    throw new Error(`Invalid port: ${port}`)
  }
  state.motors[port].velocity = 0
  state.motors[port].running = false

  const portName = Object.keys(PORTS).find(key => PORTS[key] === port)
  addLog(`Motor ${portName} stopped`)
}

export function motorVelocity(port) {
  if (port < 0 || port > 5) {
    throw new Error(`Invalid port: ${port}`)
  }
  return state.motors[port].velocity
}

export function motorAbsolutePosition(port) {
  if (port < 0 || port > 5) {
    throw new Error(`Invalid port: ${port}`)
  }
  return state.motors[port].absolutePosition
}

export function motorRelativePosition(port) {
  if (port < 0 || port > 5) {
    throw new Error(`Invalid port: ${port}`)
  }
  return state.motors[port].relativePosition
}

export function motorRunForDegrees(port, degrees, velocity) {
  if (port < 0 || port > 5) {
    throw new Error(`Invalid port: ${port}`)
  }
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
  if (port < 0 || port > 5) {
    throw new Error(`Invalid port: ${port}`)
  }
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
  if (port < 0 || port > 5) {
    throw new Error(`Invalid port: ${port}`)
  }
  const portName = Object.keys(PORTS).find(key => PORTS[key] === port)
  state.motors[port].relativePosition = position
  addLog(`Motor ${portName} relative position reset to ${position}`)
}

export function motorRunToRelativePosition(port, position, velocity) {
  if (port < 0 || port > 5) {
    throw new Error(`Invalid port: ${port}`)
  }
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
  if (port < 0 || port > 5) {
    throw new Error(`Invalid port: ${port}`)
  }
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
  clearLogs()
}

// Composable export
export function useRobotState() {
  return {
    state: readonly(state),
    PORTS,
    DIRECTION,
    STOP_ACTION,
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
    addLog,
    clearLogs,
    resetState
  }
}
