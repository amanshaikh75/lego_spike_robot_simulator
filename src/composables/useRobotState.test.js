import { describe, it, expect, beforeEach } from 'vitest'
import {
  PORTS,
  motorRun,
  motorStop,
  motorVelocity,
  motorAbsolutePosition,
  motorRelativePosition,
  addLog,
  clearLogs,
  resetState,
  useRobotState
} from './useRobotState'

beforeEach(() => {
  resetState()
})

describe('PORTS', () => {
  it('defines ports A through F as 0 through 5', () => {
    expect(PORTS.A).toBe(0)
    expect(PORTS.B).toBe(1)
    expect(PORTS.C).toBe(2)
    expect(PORTS.D).toBe(3)
    expect(PORTS.E).toBe(4)
    expect(PORTS.F).toBe(5)
  })
})

describe('motorRun', () => {
  it('sets velocity and logs the correct message', () => {
    motorRun(PORTS.A, 1000)

    expect(motorVelocity(PORTS.A)).toBe(1000)

    const { state } = useRobotState()
    const lastLog = state.logs[state.logs.length - 1]
    expect(lastLog.message).toBe('Motor A running at 1000 deg/sec')
  })

  it('marks the motor as running', () => {
    motorRun(PORTS.B, 500)

    const { state } = useRobotState()
    expect(state.motors[PORTS.B].running).toBe(true)
  })

  it('works for all ports', () => {
    for (const [name, port] of Object.entries(PORTS)) {
      resetState()
      motorRun(port, 200)

      const { state } = useRobotState()
      expect(motorVelocity(port)).toBe(200)
      expect(state.logs[state.logs.length - 1].message).toBe(
        `Motor ${name} running at 200 deg/sec`
      )
    }
  })

  it('handles negative velocity', () => {
    motorRun(PORTS.A, -500)

    expect(motorVelocity(PORTS.A)).toBe(-500)

    const { state } = useRobotState()
    expect(state.logs[state.logs.length - 1].message).toBe(
      'Motor A running at -500 deg/sec'
    )
  })

  it('throws on invalid port', () => {
    expect(() => motorRun(-1, 100)).toThrow('Invalid port: -1')
    expect(() => motorRun(6, 100)).toThrow('Invalid port: 6')
  })
})

describe('motorStop', () => {
  it('sets velocity to 0 and logs stop message', () => {
    motorRun(PORTS.A, 1000)
    motorStop(PORTS.A)

    expect(motorVelocity(PORTS.A)).toBe(0)

    const { state } = useRobotState()
    const lastLog = state.logs[state.logs.length - 1]
    expect(lastLog.message).toBe('Motor A stopped')
  })

  it('marks the motor as not running', () => {
    motorRun(PORTS.A, 1000)
    motorStop(PORTS.A)

    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(false)
  })

  it('throws on invalid port', () => {
    expect(() => motorStop(-1)).toThrow('Invalid port: -1')
    expect(() => motorStop(6)).toThrow('Invalid port: 6')
  })
})

describe('motorVelocity', () => {
  it('returns 0 for a motor that has not been started', () => {
    expect(motorVelocity(PORTS.A)).toBe(0)
  })

  it('returns the current velocity after run', () => {
    motorRun(PORTS.C, 750)
    expect(motorVelocity(PORTS.C)).toBe(750)
  })

  it('throws on invalid port', () => {
    expect(() => motorVelocity(-1)).toThrow('Invalid port: -1')
    expect(() => motorVelocity(6)).toThrow('Invalid port: 6')
  })
})

describe('motorAbsolutePosition', () => {
  it('returns 0 initially', () => {
    expect(motorAbsolutePosition(PORTS.A)).toBe(0)
  })

  it('throws on invalid port', () => {
    expect(() => motorAbsolutePosition(-1)).toThrow('Invalid port: -1')
    expect(() => motorAbsolutePosition(6)).toThrow('Invalid port: 6')
  })
})

describe('motorRelativePosition', () => {
  it('returns 0 initially', () => {
    expect(motorRelativePosition(PORTS.A)).toBe(0)
  })

  it('throws on invalid port', () => {
    expect(() => motorRelativePosition(-1)).toThrow('Invalid port: -1')
    expect(() => motorRelativePosition(6)).toThrow('Invalid port: 6')
  })
})

describe('logging', () => {
  it('addLog appends a timestamped entry', () => {
    addLog('test message')

    const { state } = useRobotState()
    expect(state.logs).toHaveLength(1)
    expect(state.logs[0].message).toBe('test message')
    expect(state.logs[0].timestamp).toBeDefined()
  })

  it('clearLogs removes all log entries', () => {
    addLog('one')
    addLog('two')
    clearLogs()

    const { state } = useRobotState()
    expect(state.logs).toHaveLength(0)
  })
})

describe('resetState', () => {
  it('resets all motors to initial values', () => {
    motorRun(PORTS.A, 1000)
    motorRun(PORTS.B, 500)
    resetState()

    const { state } = useRobotState()
    for (const port of Object.values(PORTS)) {
      expect(state.motors[port].velocity).toBe(0)
      expect(state.motors[port].absolutePosition).toBe(0)
      expect(state.motors[port].relativePosition).toBe(0)
      expect(state.motors[port].running).toBe(false)
    }
  })

  it('clears logs', () => {
    addLog('test')
    resetState()

    const { state } = useRobotState()
    expect(state.logs).toHaveLength(0)
  })
})
