import { describe, it, expect, beforeEach } from 'vitest'
import {
  PORTS,
  DIRECTION,
  STOP_ACTION,
  PAIRS,
  FACES,
  motorRun,
  motorStop,
  motorVelocity,
  motorAbsolutePosition,
  motorRelativePosition,
  motorRunForTime,
  motorRunToAbsolutePosition,
  motorRunToRelativePosition,
  motorResetRelativePosition,
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
  motionTiltAngles,
  motionResetYaw,
  motionAcceleration,
  motionAngularVelocity,
  motionQuaternion,
  motionUpFace,
  motionStable,
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

  it('clears all motor pair slots', () => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
    motorPairPair(PAIRS.PAIR_2, PORTS.C, PORTS.D)
    resetState()

    const { state } = useRobotState()
    for (const pair of Object.values(PAIRS)) {
      expect(state.motorPairs[pair]).toBeNull()
    }
  })
})

describe('PAIRS', () => {
  it('defines PAIR_1, PAIR_2, PAIR_3 as 0, 1, 2', () => {
    expect(PAIRS.PAIR_1).toBe(0)
    expect(PAIRS.PAIR_2).toBe(1)
    expect(PAIRS.PAIR_3).toBe(2)
  })

  it('has unique values for each constant', () => {
    const values = Object.values(PAIRS)
    expect(new Set(values).size).toBe(values.length)
  })

  it('is exported from the useRobotState composable', () => {
    const { PAIRS: fromComposable } = useRobotState()
    expect(fromComposable).toBe(PAIRS)
  })
})

describe('motorPairPair', () => {
  it('records the pair in robot state', () => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)

    const { state } = useRobotState()
    expect(state.motorPairs[PAIRS.PAIR_1]).toEqual({
      left: PORTS.A,
      right: PORTS.B
    })
  })

  it('leaves other pair slots untouched', () => {
    motorPairPair(PAIRS.PAIR_2, PORTS.C, PORTS.D)

    const { state } = useRobotState()
    expect(state.motorPairs[PAIRS.PAIR_1]).toBeNull()
    expect(state.motorPairs[PAIRS.PAIR_3]).toBeNull()
  })

  it('logs a descriptive message', () => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)

    const { state } = useRobotState()
    const lastLog = state.logs[state.logs.length - 1]
    expect(lastLog.message).toBe('Paired PAIR_1: left=A, right=B')
  })

  it('allows overwriting an existing pair in the same slot', () => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
    motorPairPair(PAIRS.PAIR_1, PORTS.C, PORTS.D)

    const { state } = useRobotState()
    expect(state.motorPairs[PAIRS.PAIR_1]).toEqual({
      left: PORTS.C,
      right: PORTS.D
    })
  })

  it('rejects pairing a motor with itself', () => {
    expect(() => motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.A)).toThrow(
      'Cannot pair motor A with itself'
    )
  })

  it('rejects a motor already used by another pair slot', () => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)

    expect(() => motorPairPair(PAIRS.PAIR_2, PORTS.A, PORTS.C)).toThrow(
      'Motor already in use by PAIR_1'
    )
    expect(() => motorPairPair(PAIRS.PAIR_2, PORTS.C, PORTS.B)).toThrow(
      'Motor already in use by PAIR_1'
    )
  })

  it('allows reusing a motor after the prior pair is unpaired', () => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
    motorPairUnpair(PAIRS.PAIR_1)

    expect(() => motorPairPair(PAIRS.PAIR_2, PORTS.A, PORTS.C)).not.toThrow()
  })

  it('throws on invalid pair slot', () => {
    expect(() => motorPairPair(-1, PORTS.A, PORTS.B)).toThrow('Invalid pair: -1')
    expect(() => motorPairPair(3, PORTS.A, PORTS.B)).toThrow('Invalid pair: 3')
    expect(() => motorPairPair(1.5, PORTS.A, PORTS.B)).toThrow('Invalid pair: 1.5')
    expect(() => motorPairPair('PAIR_1', PORTS.A, PORTS.B)).toThrow('Invalid pair: PAIR_1')
  })

  it('throws on invalid left port', () => {
    expect(() => motorPairPair(PAIRS.PAIR_1, 6, PORTS.B)).toThrow('Invalid port: 6')
    expect(() => motorPairPair(PAIRS.PAIR_1, 'A', PORTS.B)).toThrow('Invalid port: A')
  })

  it('throws on invalid right port', () => {
    expect(() => motorPairPair(PAIRS.PAIR_1, PORTS.A, -1)).toThrow('Invalid port: -1')
    expect(() => motorPairPair(PAIRS.PAIR_1, PORTS.A, null)).toThrow('Invalid port: null')
  })
})

describe('motorPairUnpair', () => {
  it('clears the pair from robot state', () => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
    motorPairUnpair(PAIRS.PAIR_1)

    const { state } = useRobotState()
    expect(state.motorPairs[PAIRS.PAIR_1]).toBeNull()
  })

  it('leaves other pair slots untouched', () => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
    motorPairPair(PAIRS.PAIR_2, PORTS.C, PORTS.D)
    motorPairUnpair(PAIRS.PAIR_1)

    const { state } = useRobotState()
    expect(state.motorPairs[PAIRS.PAIR_2]).toEqual({
      left: PORTS.C,
      right: PORTS.D
    })
  })

  it('logs a descriptive message', () => {
    motorPairPair(PAIRS.PAIR_2, PORTS.A, PORTS.B)
    motorPairUnpair(PAIRS.PAIR_2)

    const { state } = useRobotState()
    const lastLog = state.logs[state.logs.length - 1]
    expect(lastLog.message).toBe('Unpaired PAIR_2')
  })

  it('throws when the slot has no pair', () => {
    expect(() => motorPairUnpair(PAIRS.PAIR_1)).toThrow('PAIR_1 is not paired')
  })

  it('throws on invalid pair slot', () => {
    expect(() => motorPairUnpair(-1)).toThrow('Invalid pair: -1')
    expect(() => motorPairUnpair(3)).toThrow('Invalid pair: 3')
    expect(() => motorPairUnpair('PAIR_1')).toThrow('Invalid pair: PAIR_1')
  })
})

describe('motorPairMove', () => {
  beforeEach(() => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
  })

  it('drives both motors at the same velocity when steering is 0', () => {
    motorPairMove(PAIRS.PAIR_1, 0, 500)
    expect(motorVelocity(PORTS.A)).toBe(500)
    expect(motorVelocity(PORTS.B)).toBe(500)
  })

  it('slows the right motor on positive steering', () => {
    motorPairMove(PAIRS.PAIR_1, 50, 500)
    expect(motorVelocity(PORTS.A)).toBe(500)
    expect(motorVelocity(PORTS.B)).toBe(0)
  })

  it('reverses the right motor for a full right pivot', () => {
    motorPairMove(PAIRS.PAIR_1, 100, 500)
    expect(motorVelocity(PORTS.A)).toBe(500)
    expect(motorVelocity(PORTS.B)).toBe(-500)
  })

  it('slows the left motor on negative steering', () => {
    motorPairMove(PAIRS.PAIR_1, -50, 500)
    expect(motorVelocity(PORTS.A)).toBe(0)
    expect(motorVelocity(PORTS.B)).toBe(500)
  })

  it('reverses the left motor for a full left pivot', () => {
    motorPairMove(PAIRS.PAIR_1, -100, 500)
    expect(motorVelocity(PORTS.A)).toBe(-500)
    expect(motorVelocity(PORTS.B)).toBe(500)
  })

  it('clamps steering outside [-100, 100]', () => {
    motorPairMove(PAIRS.PAIR_1, 250, 500)
    expect(motorVelocity(PORTS.A)).toBe(500)
    expect(motorVelocity(PORTS.B)).toBe(-500)
  })

  it('marks both motors as running', () => {
    motorPairMove(PAIRS.PAIR_1, 0, 500)
    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(true)
    expect(state.motors[PORTS.B].running).toBe(true)
  })

  it('logs a descriptive message', () => {
    motorPairMove(PAIRS.PAIR_1, 0, 500)
    const { state } = useRobotState()
    const lastLog = state.logs[state.logs.length - 1]
    expect(lastLog.message).toBe('PAIR_1 moving at steering=0, velocity=500 (L=500, R=500)')
  })

  it('throws when the slot is not paired', () => {
    expect(() => motorPairMove(PAIRS.PAIR_2, 0, 500)).toThrow('PAIR_2 is not paired')
  })

  it('throws on invalid pair slot', () => {
    expect(() => motorPairMove(-1, 0, 500)).toThrow('Invalid pair: -1')
  })
})

describe('motorPairMoveTank', () => {
  beforeEach(() => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
  })

  it('sets the left and right motors to independent velocities', () => {
    motorPairMoveTank(PAIRS.PAIR_1, 300, -200)
    expect(motorVelocity(PORTS.A)).toBe(300)
    expect(motorVelocity(PORTS.B)).toBe(-200)
  })

  it('marks motors as running when velocity is nonzero', () => {
    motorPairMoveTank(PAIRS.PAIR_1, 300, -200)
    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(true)
    expect(state.motors[PORTS.B].running).toBe(true)
  })

  it('marks a motor as not running when its velocity is zero', () => {
    motorPairMoveTank(PAIRS.PAIR_1, 0, 200)
    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(false)
    expect(state.motors[PORTS.B].running).toBe(true)
  })

  it('logs a descriptive message', () => {
    motorPairMoveTank(PAIRS.PAIR_1, 300, -200)
    const { state } = useRobotState()
    const lastLog = state.logs[state.logs.length - 1]
    expect(lastLog.message).toBe('PAIR_1 tank: L=300, R=-200')
  })

  it('throws when the slot is not paired', () => {
    expect(() => motorPairMoveTank(PAIRS.PAIR_2, 100, 100)).toThrow('PAIR_2 is not paired')
  })
})

describe('motorPairStop', () => {
  beforeEach(() => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
    motorPairMove(PAIRS.PAIR_1, 0, 500)
  })

  it('zeroes both motor velocities', () => {
    motorPairStop(PAIRS.PAIR_1)
    expect(motorVelocity(PORTS.A)).toBe(0)
    expect(motorVelocity(PORTS.B)).toBe(0)
  })

  it('marks both motors as not running', () => {
    motorPairStop(PAIRS.PAIR_1)
    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(false)
    expect(state.motors[PORTS.B].running).toBe(false)
  })

  it('logs a descriptive message', () => {
    motorPairStop(PAIRS.PAIR_1)
    const { state } = useRobotState()
    const lastLog = state.logs[state.logs.length - 1]
    expect(lastLog.message).toBe('PAIR_1 stopped')
  })

  it('throws when the slot is not paired', () => {
    expect(() => motorPairStop(PAIRS.PAIR_2)).toThrow('PAIR_2 is not paired')
  })
})

describe('motorPairMoveForDegrees', () => {
  beforeEach(() => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
  })

  it('moves both wheels equally on straight (steering=0)', async () => {
    // 360 deg/sec for 360 deg = 1000ms; both wheels travel 360
    await motorPairMoveForDegrees(PAIRS.PAIR_1, 360, 0, 360)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(360, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(360, 0)
  })

  it('moves the inner wheel proportionally less on positive steering', async () => {
    // steering=50 stops the right wheel; left (reference) travels 360
    await motorPairMoveForDegrees(PAIRS.PAIR_1, 360, 50, 360)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(360, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(0, 0)
  })

  it('pivots in place on full positive steering', async () => {
    // steering=100 → right wheel reverses at same speed; both travel 360 in opposite directions
    await motorPairMoveForDegrees(PAIRS.PAIR_1, 360, 100, 360)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(360, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(-360, 0)
  })

  it('reverses both wheels when degrees is negative', async () => {
    await motorPairMoveForDegrees(PAIRS.PAIR_1, -360, 0, 360)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(-360, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(-360, 0)
  })

  it('zeros both velocities on completion', async () => {
    await motorPairMoveForDegrees(PAIRS.PAIR_1, 180, 0, 360)

    expect(motorVelocity(PORTS.A)).toBe(0)
    expect(motorVelocity(PORTS.B)).toBe(0)
    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(false)
    expect(state.motors[PORTS.B].running).toBe(false)
  })

  it('sets running state and steering-derived velocities during execution', async () => {
    const promise = motorPairMoveForDegrees(PAIRS.PAIR_1, 360, 50, 360)

    const { state } = useRobotState()
    expect(state.motors[PORTS.A].velocity).toBe(360)
    expect(state.motors[PORTS.B].velocity).toBe(0)
    expect(state.motors[PORTS.A].running).toBe(true)

    await promise
  })

  it('updates absolute position with wrapping', async () => {
    // 540 degrees → absolute should wrap to 180
    await motorPairMoveForDegrees(PAIRS.PAIR_1, 540, 0, 360)

    expect(motorAbsolutePosition(PORTS.A)).toBeCloseTo(180, 0)
    expect(motorAbsolutePosition(PORTS.B)).toBeCloseTo(180, 0)
  })

  it('resolves immediately when velocity is 0', async () => {
    await motorPairMoveForDegrees(PAIRS.PAIR_1, 360, 0, 0)

    expect(motorRelativePosition(PORTS.A)).toBe(0)
    expect(motorRelativePosition(PORTS.B)).toBe(0)
    const { state } = useRobotState()
    const messages = state.logs.map(l => l.message)
    expect(messages).toContain('PAIR_1 move for 360 deg skipped: velocity is 0')
  })

  it('logs start and completion messages', async () => {
    await motorPairMoveForDegrees(PAIRS.PAIR_1, 180, 0, 360)

    const { state } = useRobotState()
    const messages = state.logs.map(l => l.message)
    expect(messages).toContain('PAIR_1 move for 180 deg, steering=0, velocity=360')
    expect(messages).toContain('PAIR_1 completed 180 deg move')
  })

  it('throws when the slot is not paired', () => {
    expect(() => motorPairMoveForDegrees(PAIRS.PAIR_2, 360, 0, 360)).toThrow('PAIR_2 is not paired')
  })

  it('throws on invalid pair slot', () => {
    expect(() => motorPairMoveForDegrees(-1, 360, 0, 360)).toThrow('Invalid pair: -1')
  })
})

describe('motorPairMoveForTime', () => {
  beforeEach(() => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
  })

  it('moves both wheels equally on straight (steering=0)', async () => {
    // 360 deg/sec for 500ms = 180 degrees per wheel
    await motorPairMoveForTime(PAIRS.PAIR_1, 500, 0, 360)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(180, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(180, 0)
  })

  it('stops the inside wheel on positive steering=50', async () => {
    await motorPairMoveForTime(PAIRS.PAIR_1, 500, 50, 360)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(180, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(0, 0)
  })

  it('reverses both wheels for negative velocity', async () => {
    await motorPairMoveForTime(PAIRS.PAIR_1, 500, 0, -360)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(-180, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(-180, 0)
  })

  it('zeros both velocities on completion', async () => {
    await motorPairMoveForTime(PAIRS.PAIR_1, 200, 0, 360)

    expect(motorVelocity(PORTS.A)).toBe(0)
    expect(motorVelocity(PORTS.B)).toBe(0)
    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(false)
    expect(state.motors[PORTS.B].running).toBe(false)
  })

  it('sets running state and steering-derived velocities during execution', async () => {
    const promise = motorPairMoveForTime(PAIRS.PAIR_1, 200, 0, 360)

    const { state } = useRobotState()
    expect(state.motors[PORTS.A].velocity).toBe(360)
    expect(state.motors[PORTS.B].velocity).toBe(360)
    expect(state.motors[PORTS.A].running).toBe(true)

    await promise
  })

  it('logs start and completion messages', async () => {
    await motorPairMoveForTime(PAIRS.PAIR_1, 200, 0, 360)

    const { state } = useRobotState()
    const messages = state.logs.map(l => l.message)
    expect(messages).toContain('PAIR_1 move for 200ms, steering=0, velocity=360')
    expect(messages).toContain('PAIR_1 completed 200ms move')
  })

  it('throws when the slot is not paired', () => {
    expect(() => motorPairMoveForTime(PAIRS.PAIR_2, 200, 0, 360)).toThrow('PAIR_2 is not paired')
  })
})

describe('motorPairMoveTankForDegrees', () => {
  beforeEach(() => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
  })

  it('moves each wheel the requested degrees at its own velocity', async () => {
    // Both wheels turn 360 degrees, but at different speeds
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 360, 180)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(360, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(360, 0)
  })

  it('waits for the slower wheel before resolving', async () => {
    // Slower wheel takes 2s; faster takes 1s. After resolve, both should be at target.
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 720, 360)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(360, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(360, 0)
  })

  it('reverses individual wheels based on velocity sign (pivot)', async () => {
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 180, 360, -360)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(180, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(-180, 0)
  })

  it('does not move a wheel whose velocity is 0', async () => {
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 180, 360, 0)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(180, 0)
    expect(motorRelativePosition(PORTS.B)).toBe(0)
  })

  it('zeros both velocities on completion', async () => {
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 180, 360, 360)

    expect(motorVelocity(PORTS.A)).toBe(0)
    expect(motorVelocity(PORTS.B)).toBe(0)
  })

  it('treats degrees magnitude (negative degrees still moves per velocity sign)', async () => {
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, -180, 360, 360)

    // degrees is magnitude; signed direction comes from velocity
    expect(Math.abs(motorRelativePosition(PORTS.A))).toBeCloseTo(180, 0)
    expect(Math.abs(motorRelativePosition(PORTS.B))).toBeCloseTo(180, 0)
  })

  it('resolves immediately when both velocities are 0', async () => {
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 0, 0)

    expect(motorRelativePosition(PORTS.A)).toBe(0)
    expect(motorRelativePosition(PORTS.B)).toBe(0)
    const { state } = useRobotState()
    const messages = state.logs.map(l => l.message)
    expect(messages).toContain('PAIR_1 tank for 360 deg skipped: both velocities are 0')
  })

  it('logs start and completion messages', async () => {
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 180, 360, 360)

    const { state } = useRobotState()
    const messages = state.logs.map(l => l.message)
    expect(messages).toContain('PAIR_1 tank for 180 deg: L=360, R=360')
    expect(messages).toContain('PAIR_1 tank completed 180 deg')
  })

  it('throws when the slot is not paired', () => {
    expect(() => motorPairMoveTankForDegrees(PAIRS.PAIR_2, 180, 360, 360)).toThrow('PAIR_2 is not paired')
  })
})

describe('motorPairMoveTankForTime', () => {
  beforeEach(() => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
  })

  it('runs each wheel at its own velocity for the duration', async () => {
    // 500ms: left moves 360*0.5=180, right moves 180*0.5=90
    await motorPairMoveTankForTime(PAIRS.PAIR_1, 500, 360, 180)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(180, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(90, 0)
  })

  it('handles negative velocities independently', async () => {
    await motorPairMoveTankForTime(PAIRS.PAIR_1, 500, 360, -360)

    expect(motorRelativePosition(PORTS.A)).toBeCloseTo(180, 0)
    expect(motorRelativePosition(PORTS.B)).toBeCloseTo(-180, 0)
  })

  it('zeros both velocities on completion', async () => {
    await motorPairMoveTankForTime(PAIRS.PAIR_1, 200, 360, 360)

    expect(motorVelocity(PORTS.A)).toBe(0)
    expect(motorVelocity(PORTS.B)).toBe(0)
    const { state } = useRobotState()
    expect(state.motors[PORTS.A].running).toBe(false)
    expect(state.motors[PORTS.B].running).toBe(false)
  })

  it('sets the requested velocities during execution', async () => {
    const promise = motorPairMoveTankForTime(PAIRS.PAIR_1, 200, 300, -200)

    const { state } = useRobotState()
    expect(state.motors[PORTS.A].velocity).toBe(300)
    expect(state.motors[PORTS.B].velocity).toBe(-200)

    await promise
  })

  it('logs start and completion messages', async () => {
    await motorPairMoveTankForTime(PAIRS.PAIR_1, 200, 360, -360)

    const { state } = useRobotState()
    const messages = state.logs.map(l => l.message)
    expect(messages).toContain('PAIR_1 tank for 200ms: L=360, R=-360')
    expect(messages).toContain('PAIR_1 tank completed 200ms')
  })

  it('throws when the slot is not paired', () => {
    expect(() => motorPairMoveTankForTime(PAIRS.PAIR_2, 200, 360, 360)).toThrow('PAIR_2 is not paired')
  })
})

describe('FACES', () => {
  it('defines the six face constants 0 through 5', () => {
    expect(FACES.TOP).toBe(0)
    expect(FACES.FRONT).toBe(1)
    expect(FACES.RIGHT).toBe(2)
    expect(FACES.BOTTOM).toBe(3)
    expect(FACES.BACK).toBe(4)
    expect(FACES.LEFT).toBe(5)
  })

  it('is exported from the useRobotState composable', () => {
    const { FACES: fromComposable } = useRobotState()
    expect(fromComposable).toBe(FACES)
  })
})

describe('setRobotConfig', () => {
  it('updates geometry and logs a message', () => {
    setRobotConfig({ wheelDiameterMm: 88, axleTrackMm: 150 })

    const { state } = useRobotState()
    expect(state.config.wheelDiameterMm).toBe(88)
    expect(state.config.axleTrackMm).toBe(150)
    expect(state.logs[state.logs.length - 1].message).toContain('wheelDiameter=88mm')
  })

  it('rejects non-positive wheel diameter', () => {
    expect(() => setRobotConfig({ wheelDiameterMm: 0 })).toThrow('Invalid wheelDiameterMm: 0')
  })

  it('rejects non-positive axle track', () => {
    expect(() => setRobotConfig({ axleTrackMm: -5 })).toThrow('Invalid axleTrackMm: -5')
  })

  it('rejects an invalid drivebase slot', () => {
    expect(() => setRobotConfig({ drivebaseSlot: 9 })).toThrow('Invalid pair: 9')
  })

  it('rejects a non-object argument', () => {
    expect(() => setRobotConfig(null)).toThrow('Robot config must be an object')
  })

  it('is reset to defaults by resetState', () => {
    setRobotConfig({ wheelDiameterMm: 88 })
    resetState()

    const { state } = useRobotState()
    expect(state.config.wheelDiameterMm).toBe(56)
    expect(state.config.axleTrackMm).toBe(112)
  })
})

describe('yaw tracking from drivebase movement', () => {
  beforeEach(() => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
  })

  it('stays at zero when driving straight', async () => {
    await motorPairMoveForDegrees(PAIRS.PAIR_1, 360, 0, 360)
    expect(motionTiltAngles()[0]).toBe(0)
  })

  it('turns clockwise (positive) when the left wheel leads', async () => {
    // Single-wheel turn: left +360, right 0 → +90 degrees (900 decidegrees)
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 360, 0)
    expect(motionTiltAngles()[0]).toBeCloseTo(900, -1)
  })

  it('pivots to ~180 degrees on a full in-place spin', async () => {
    // steering=100 → left +360, right -360 → 180 degrees (1800 decidegrees)
    await motorPairMoveForDegrees(PAIRS.PAIR_1, 360, 100, 360)
    expect(motionTiltAngles()[0]).toBeCloseTo(1800, -1)
  })

  it('accumulates continuously across multiple moves', async () => {
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 360, 0) // +90
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 360, 0) // +90 → 180 total
    expect(motionTiltAngles()[0]).toBeCloseTo(1800, -1)
  })

  it('wraps past 180 degrees into the negative half', async () => {
    // Three +90 turns = 270 degrees → wraps to -90 (-900 decidegrees)
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 360, 0)
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 360, 0)
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 360, 0)
    expect(motionTiltAngles()[0]).toBeCloseTo(-900, -1)
  })

  it('reflects yaw mid-move (continuous accumulation)', async () => {
    const promise = motorPairMoveForDegrees(PAIRS.PAIR_1, 360, 100, 360)
    // Sample partway through; yaw should already be nonzero before completion.
    await new Promise(r => setTimeout(r, 250))
    const midYaw = motionTiltAngles()[0]
    expect(midYaw).toBeGreaterThan(0)
    expect(midYaw).toBeLessThan(1800)
    await promise
  })

  it('honors a wider axle track from config (turns less)', async () => {
    setRobotConfig({ axleTrackMm: 224 }) // double the track → half the turn
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 360, 0)
    expect(motionTiltAngles()[0]).toBeCloseTo(450, -1)
  })

  it('is not changed by resetting a wheel encoder', async () => {
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 360, 0) // +90
    const before = motionTiltAngles()[0]
    motorResetRelativePosition(PORTS.A, 0)
    expect(motionTiltAngles()[0]).toBe(before)
  })

  it('ignores movement of a non-drivebase pair', async () => {
    // Drivebase is PAIR_1 (A/B); moving PAIR_2 (C/D) must not change yaw.
    motorPairPair(PAIRS.PAIR_2, PORTS.C, PORTS.D)
    await motorPairMoveTankForDegrees(PAIRS.PAIR_2, 360, 360, 0)
    expect(motionTiltAngles()[0]).toBe(0)
  })

  it('is reset to zero by resetState', async () => {
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 360, 0)
    resetState()
    expect(motionTiltAngles()[0]).toBe(0)
  })
})

describe('motion_sensor functions', () => {
  it('tilt_angles reports pitch and roll as zero', () => {
    const [, pitch, roll] = motionTiltAngles()
    expect(pitch).toBe(0)
    expect(roll).toBe(0)
  })

  it('reset_yaw sets the reported yaw in degrees', () => {
    motionResetYaw(45)
    expect(motionTiltAngles()[0]).toBe(450)
  })

  it('reset_yaw defaults to zero', async () => {
    motorPairPair(PAIRS.PAIR_1, PORTS.A, PORTS.B)
    await motorPairMoveTankForDegrees(PAIRS.PAIR_1, 360, 360, 0)
    motionResetYaw()
    expect(motionTiltAngles()[0]).toBe(0)
  })

  it('quaternion is the identity at zero yaw', () => {
    expect(motionQuaternion()).toEqual([1, 0, 0, 0])
  })

  it('acceleration and angular_velocity are zero (no physics)', () => {
    expect(motionAcceleration()).toEqual([0, 0, 0])
    expect(motionAngularVelocity()).toEqual([0, 0, 0])
  })

  it('up_face is TOP and stable is true', () => {
    expect(motionUpFace()).toBe(FACES.TOP)
    expect(motionStable()).toBe(true)
  })
})
