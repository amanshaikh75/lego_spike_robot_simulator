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
    motorRun,
    motorStop,
    motorVelocity,
    motorAbsolutePosition,
    motorRelativePosition,
    addLog,
    clearLogs,
    resetState
  }
}
