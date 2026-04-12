import { describe, it, expect, beforeEach } from 'vitest'
import {
  PORTS,
  DIRECTION,
  STOP_ACTION,
  motorRun,
  motorStop,
  motorVelocity,
  motorAbsolutePosition,
  motorRelativePosition,
  motorRunForTime,
  motorRunToAbsolutePosition,
  motorRunToRelativePosition,
  motorResetRelativePosition,
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

describe('motorRunForTime', () => {
  it('sets velocity and running state during execution', async () => {
    const promise = motorRunForTime(PORTS.A, 200, 360)

    const { state } = useRobotState()
    expect(state.motors[PORTS.A].velocity).toBe(360)
    expect(state.motors[PORTS.A].running).toBe(true)

    await promise
  })

  it('resolves after the specified duration and stops the motor', async () => {
    await motorRunForTime(PORTS.A, 200, 360)

    const { state } = useRobotState()
    expect(state.motors[PORTS.A].velocity).toBe(0)
    expect(state.motors[PORTS.A].running).toBe(false)
  })

  it('updates relative position based on velocity and time', async () => {
    // 360 deg/sec for 500ms = 180 degrees
    await motorRunForTime(PORTS.A, 500, 360)

    const relPos = motorRelativePosition(PORTS.A)
    expect(relPos).toBeCloseTo(180, 0)
  })

  it('updates absolute position with wrapping', async () => {
    // 360 deg/sec for 1500ms = 540 degrees -> absolute should wrap to 180
    await motorRunForTime(PORTS.A, 1500, 360)

    const absPos = motorAbsolutePosition(PORTS.A)
    expect(absPos).toBeCloseTo(180, 0)
  })

  it('handles negative velocity', async () => {
    await motorRunForTime(PORTS.A, 500, -360)

    const relPos = motorRelativePosition(PORTS.A)
    expect(relPos).toBeCloseTo(-180, 0)
  })

  it('logs start and completion messages', async () => {
    await motorRunForTime(PORTS.A, 200, 360)

    const { state } = useRobotState()
    const messages = state.logs.map(l => l.message)
    expect(messages).toContain('Motor A running for 200ms at 360 deg/sec')
    expect(messages).toContain('Motor A completed 200ms run')
  })

  it('throws on invalid port', () => {
    expect(() => motorRunForTime(-1, 200, 360)).toThrow('Invalid port: -1')
    expect(() => motorRunForTime(6, 200, 360)).toThrow('Invalid port: 6')
  })
})

describe('DIRECTION', () => {
  it('defines direction constants', () => {
    expect(DIRECTION.SHORTEST_PATH).toBe(0)
    expect(DIRECTION.LONGEST_PATH).toBe(1)
    expect(DIRECTION.CLOCKWISE).toBe(2)
    expect(DIRECTION.COUNTERCLOCKWISE).toBe(3)
  })
})

describe('STOP_ACTION', () => {
  it('defines all SPIKE 3 stop action constants', () => {
    expect(STOP_ACTION.COAST).toBe(0)
    expect(STOP_ACTION.BRAKE).toBe(1)
    expect(STOP_ACTION.HOLD).toBe(2)
    expect(STOP_ACTION.CONTINUE).toBe(3)
    expect(STOP_ACTION.SMART_COAST).toBe(4)
    expect(STOP_ACTION.SMART_BRAKE).toBe(5)
  })

  it('has unique values for each constant', () => {
    const values = Object.values(STOP_ACTION)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('is exported from the useRobotState composable', () => {
    const { STOP_ACTION: fromComposable } = useRobotState()
    expect(fromComposable).toBe(STOP_ACTION)
  })
})

describe('motorRunToAbsolutePosition', () => {
  it('moves clockwise via shortest path when target is ahead', async () => {
    // Current pos = 0, target = 90 → shortest path is 90° clockwise
    await motorRunToAbsolutePosition(PORTS.A, 90, 360)

    expect(motorAbsolutePosition(PORTS.A)).toBe(90)
    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(false)
    expect(state.motors[PORTS.A].velocity).toBe(0)
  })

  it('moves counterclockwise via shortest path when target is behind', async () => {
    // Set position to 10, target = 350 → shortest path is 20° counterclockwise
    // First move to position 10
    await motorRunToAbsolutePosition(PORTS.A, 10, 360)
    resetState()
    // Manually set absolute position to 10 for a clean test
    const { state } = useRobotState()
    state // readonly, so let's use a different approach

    // Move to 10 first
    await motorRunToAbsolutePosition(PORTS.A, 10, 360)
    const relBefore = motorRelativePosition(PORTS.A)

    // Now move to 350; shortest path is -20° (counterclockwise)
    await motorRunToAbsolutePosition(PORTS.A, 350, 360)

    expect(motorAbsolutePosition(PORTS.A)).toBe(350)
    const relAfter = motorRelativePosition(PORTS.A)
    expect(relAfter - relBefore).toBeCloseTo(-20, 0)
  })

  it('uses CLOCKWISE direction', async () => {
    // Current pos = 0, target = 350 → clockwise is 350°
    await motorRunToAbsolutePosition(PORTS.A, 350, 360, DIRECTION.CLOCKWISE)

    expect(motorAbsolutePosition(PORTS.A)).toBe(350)
    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(350, 0)
  })

  it('uses COUNTERCLOCKWISE direction', async () => {
    // Current pos = 0, target = 90 → counterclockwise is -270°
    await motorRunToAbsolutePosition(PORTS.A, 90, 360, DIRECTION.COUNTERCLOCKWISE)

    expect(motorAbsolutePosition(PORTS.A)).toBe(90)
    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(-270, 0)
  })

  it('uses LONGEST_PATH direction', async () => {
    // Current pos = 0, target = 90 → longest path is 270° counterclockwise
    await motorRunToAbsolutePosition(PORTS.A, 90, 360, DIRECTION.LONGEST_PATH)

    expect(motorAbsolutePosition(PORTS.A)).toBe(90)
    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(-270, 0)
  })

  it('resolves immediately when already at target position', async () => {
    // Already at 0, target = 0
    await motorRunToAbsolutePosition(PORTS.A, 0, 360)

    expect(motorAbsolutePosition(PORTS.A)).toBe(0)
    const { state } = useRobotState()
    const messages = state.logs.map(l => l.message)
    expect(messages).toContain('Motor A already at position 0')
  })

  it('updates relative position cumulatively', async () => {
    await motorRunToAbsolutePosition(PORTS.A, 90, 360)
    await motorRunToAbsolutePosition(PORTS.A, 180, 360)

    expect(motorAbsolutePosition(PORTS.A)).toBe(180)
    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(180, 0)
  })

  it('logs start and completion messages', async () => {
    await motorRunToAbsolutePosition(PORTS.A, 90, 360)

    const { state } = useRobotState()
    const messages = state.logs.map(l => l.message)
    expect(messages).toContain('Motor A running to absolute position 90 at 360 deg/sec')
    expect(messages).toContain('Motor A reached absolute position 90')
  })

  it('throws on invalid port', () => {
    expect(() => motorRunToAbsolutePosition(-1, 90, 360)).toThrow('Invalid port: -1')
    expect(() => motorRunToAbsolutePosition(6, 90, 360)).toThrow('Invalid port: 6')
  })

  it('sets velocity and running state during execution', async () => {
    const promise = motorRunToAbsolutePosition(PORTS.A, 180, 360)

    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(true)
    expect(state.motors[PORTS.A].velocity).toBe(360)

    await promise
  })
})

describe('motorRunToRelativePosition', () => {
  it('moves forward when target is ahead of current relative position', async () => {
    await motorRunToRelativePosition(PORTS.A, 180, 360)

    expect(motorRelativePosition(PORTS.A)).toBe(180)
    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(false)
    expect(state.motors[PORTS.A].velocity).toBe(0)
  })

  it('moves backward when target is behind current relative position', async () => {
    // Move to +180 first
    await motorRunToRelativePosition(PORTS.A, 180, 360)
    // Then move back to +90 (should move -90)
    await motorRunToRelativePosition(PORTS.A, 90, 360)

    expect(motorRelativePosition(PORTS.A)).toBe(90)
  })

  it('supports negative target positions', async () => {
    await motorRunToRelativePosition(PORTS.A, -90, 360)

    expect(motorRelativePosition(PORTS.A)).toBe(-90)
  })

  it('updates absolute position with wrapping', async () => {
    // Move to relative 540 → absolute should wrap to 180
    await motorRunToRelativePosition(PORTS.A, 540, 360)

    expect(motorAbsolutePosition(PORTS.A)).toBeCloseTo(180, 0)
    expect(motorRelativePosition(PORTS.A)).toBe(540)
  })

  it('does not wrap relative position', async () => {
    // Relative positions should accumulate, not wrap
    await motorRunToRelativePosition(PORTS.A, 720, 360)

    expect(motorRelativePosition(PORTS.A)).toBe(720)
  })

  it('resolves immediately when already at target position', async () => {
    await motorRunToRelativePosition(PORTS.A, 0, 360)

    expect(motorRelativePosition(PORTS.A)).toBe(0)
    const { state } = useRobotState()
    const messages = state.logs.map(l => l.message)
    expect(messages).toContain('Motor A already at relative position 0')
  })

  it('logs start and completion messages', async () => {
    await motorRunToRelativePosition(PORTS.A, 90, 360)

    const { state } = useRobotState()
    const messages = state.logs.map(l => l.message)
    expect(messages).toContain('Motor A running to relative position 90 at 360 deg/sec')
    expect(messages).toContain('Motor A reached relative position 90')
  })

  it('sets velocity and running state during execution', async () => {
    const promise = motorRunToRelativePosition(PORTS.A, 360, 360)

    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(true)
    expect(state.motors[PORTS.A].velocity).toBe(360)

    await promise
  })

  it('uses negative velocity direction when moving backward', async () => {
    // Move to +90 first
    await motorRunToRelativePosition(PORTS.A, 90, 360)
    // Kick off move back to 0; velocity should be negative during travel
    const promise = motorRunToRelativePosition(PORTS.A, 0, 360)

    const { state } = useRobotState()
    expect(state.motors[PORTS.A].velocity).toBe(-360)

    await promise
  })

  it('updates relative position cumulatively across calls', async () => {
    await motorRunToRelativePosition(PORTS.A, 90, 360)
    await motorRunToRelativePosition(PORTS.A, 270, 360)

    expect(motorRelativePosition(PORTS.A)).toBe(270)
  })

  it('throws on invalid port', () => {
    expect(() => motorRunToRelativePosition(-1, 90, 360)).toThrow('Invalid port: -1')
    expect(() => motorRunToRelativePosition(6, 90, 360)).toThrow('Invalid port: 6')
  })
})

describe('motorResetRelativePosition', () => {
  it('sets the relative position to the given value', () => {
    motorResetRelativePosition(PORTS.A, 500)
    expect(motorRelativePosition(PORTS.A)).toBe(500)
  })

  it('supports negative values', () => {
    motorResetRelativePosition(PORTS.A, -250)
    expect(motorRelativePosition(PORTS.A)).toBe(-250)
  })

  it('supports zero to clear accumulated position', async () => {
    await motorRunToRelativePosition(PORTS.A, 180, 360)
    expect(motorRelativePosition(PORTS.A)).toBe(180)

    motorResetRelativePosition(PORTS.A, 0)
    expect(motorRelativePosition(PORTS.A)).toBe(0)
  })

  it('does not change absolute position', async () => {
    // Move to absolute position 90 via a relative move of 90
    await motorRunToRelativePosition(PORTS.A, 90, 360)
    const absBefore = motorAbsolutePosition(PORTS.A)

    motorResetRelativePosition(PORTS.A, 0)

    expect(motorAbsolutePosition(PORTS.A)).toBe(absBefore)
  })

  it('does not change motor velocity or running state', () => {
    motorRun(PORTS.A, 500)
    motorResetRelativePosition(PORTS.A, 100)

    expect(motorVelocity(PORTS.A)).toBe(500)
    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(true)
  })

  it('affects only the specified port', () => {
    motorResetRelativePosition(PORTS.A, 42)
    expect(motorRelativePosition(PORTS.A)).toBe(42)
    expect(motorRelativePosition(PORTS.B)).toBe(0)
    expect(motorRelativePosition(PORTS.C)).toBe(0)
  })

  it('logs a descriptive message', () => {
    motorResetRelativePosition(PORTS.B, 123)

    const { state } = useRobotState()
    const lastLog = state.logs[state.logs.length - 1]
    expect(lastLog.message).toBe('Motor B relative position reset to 123')
  })

  it('allows subsequent run_to_relative_position to use the new baseline', async () => {
    motorResetRelativePosition(PORTS.A, 1000)
    await motorRunToRelativePosition(PORTS.A, 1090, 360)

    expect(motorRelativePosition(PORTS.A)).toBe(1090)
  })

  it('throws on invalid port', () => {
    expect(() => motorResetRelativePosition(-1, 0)).toThrow('Invalid port: -1')
    expect(() => motorResetRelativePosition(6, 0)).toThrow('Invalid port: 6')
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

describe('port validation', () => {
  // assertValidPort is private; exercise it via motorRun. Every motor function
  // uses the same helper, so these cases apply uniformly across the module.

  it('rejects negative integers', () => {
    expect(() => motorRun(-1, 100)).toThrow('Invalid port: -1')
  })

  it('rejects integers above the valid range', () => {
    expect(() => motorRun(6, 100)).toThrow('Invalid port: 6')
    expect(() => motorRun(100, 100)).toThrow('Invalid port: 100')
  })

  it('rejects non-integer numbers', () => {
    expect(() => motorRun(2.5, 100)).toThrow('Invalid port: 2.5')
    expect(() => motorRun(0.1, 100)).toThrow('Invalid port: 0.1')
  })

  it('rejects NaN', () => {
    expect(() => motorRun(NaN, 100)).toThrow('Invalid port: NaN')
  })

  it('rejects non-number types', () => {
    expect(() => motorRun('A', 100)).toThrow('Invalid port: A')
    expect(() => motorRun(null, 100)).toThrow('Invalid port: null')
    expect(() => motorRun(undefined, 100)).toThrow('Invalid port: undefined')
    expect(() => motorRun({}, 100)).toThrow('Invalid port:')
  })

  it('accepts every value defined in PORTS', () => {
    for (const port of Object.values(PORTS)) {
      expect(() => motorRun(port, 100)).not.toThrow()
    }
  })

  it('applies to every motor function that takes a port', () => {
    expect(() => motorStop(2.5)).toThrow('Invalid port: 2.5')
    expect(() => motorVelocity('A')).toThrow('Invalid port: A')
    expect(() => motorAbsolutePosition(6)).toThrow('Invalid port: 6')
    expect(() => motorRelativePosition(-1)).toThrow('Invalid port: -1')
    expect(() => motorRunForTime(null, 100, 360)).toThrow('Invalid port: null')
    expect(() => motorRunToAbsolutePosition(NaN, 90, 360)).toThrow('Invalid port: NaN')
    expect(() => motorRunToRelativePosition(2.5, 90, 360)).toThrow('Invalid port: 2.5')
    expect(() => motorResetRelativePosition(6, 0)).toThrow('Invalid port: 6')
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
