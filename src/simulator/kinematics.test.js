import { describe, it, expect } from 'vitest'
import {
  wheelCircumference,
  arcDistance,
  deltaYawDegrees,
  forwardDistance,
  positionDelta,
  normalizeDegrees,
  normalizeDecidegrees,
  yawToQuaternion
} from './kinematics'

const STANDARD = { wheelDiameterMm: 56, axleTrackMm: 112 }

describe('wheelCircumference', () => {
  it('is pi times the diameter', () => {
    expect(wheelCircumference(56)).toBeCloseTo(Math.PI * 56, 6)
  })
})

describe('arcDistance', () => {
  it('returns the full circumference for a full rotation', () => {
    expect(arcDistance(360, 56)).toBeCloseTo(Math.PI * 56, 6)
  })

  it('returns half the circumference for half a rotation', () => {
    expect(arcDistance(180, 56)).toBeCloseTo((Math.PI * 56) / 2, 6)
  })

  it('is negative for negative degrees', () => {
    expect(arcDistance(-360, 56)).toBeCloseTo(-Math.PI * 56, 6)
  })
})

describe('deltaYawDegrees', () => {
  it('is zero when both wheels travel equally (driving straight)', () => {
    expect(deltaYawDegrees(360, 360, STANDARD)).toBeCloseTo(0, 6)
  })

  it('is clockwise-positive when the left wheel leads', () => {
    // left +360, right 0 with 56mm wheels / 112mm track:
    // (pi*56 - 0) / 112 rad = 1.5708 rad = 90 degrees, clockwise (positive)
    expect(deltaYawDegrees(360, 0, STANDARD)).toBeCloseTo(90, 4)
  })

  it('is counterclockwise-negative when the right wheel leads', () => {
    expect(deltaYawDegrees(0, 360, STANDARD)).toBeCloseTo(-90, 4)
  })

  it('doubles when wheels turn opposite directions (pivot in place)', () => {
    // left +360, right -360 → twice the single-wheel turn
    expect(deltaYawDegrees(360, -360, STANDARD)).toBeCloseTo(180, 4)
  })

  it('turns less for a wider axle track', () => {
    const narrow = deltaYawDegrees(360, 0, { wheelDiameterMm: 56, axleTrackMm: 112 })
    const wide = deltaYawDegrees(360, 0, { wheelDiameterMm: 56, axleTrackMm: 224 })
    expect(Math.abs(wide)).toBeLessThan(Math.abs(narrow))
    expect(wide).toBeCloseTo(narrow / 2, 4)
  })

  it('scales with wheel diameter', () => {
    const small = deltaYawDegrees(360, 0, { wheelDiameterMm: 56, axleTrackMm: 112 })
    const big = deltaYawDegrees(360, 0, { wheelDiameterMm: 112, axleTrackMm: 112 })
    expect(big).toBeCloseTo(small * 2, 4)
  })

  it('throws on a non-positive axle track', () => {
    expect(() => deltaYawDegrees(360, 0, { wheelDiameterMm: 56, axleTrackMm: 0 }))
      .toThrow('Invalid axleTrackMm: 0')
  })
})

describe('normalizeDegrees', () => {
  it('leaves angles in range untouched', () => {
    expect(normalizeDegrees(90)).toBe(90)
    expect(normalizeDegrees(-90)).toBe(-90)
    expect(normalizeDegrees(180)).toBe(180)
  })

  it('wraps angles above 180 into the negative half', () => {
    expect(normalizeDegrees(270)).toBe(-90)
    expect(normalizeDegrees(360)).toBe(0)
    expect(normalizeDegrees(450)).toBe(90)
  })

  it('wraps large negative angles', () => {
    expect(normalizeDegrees(-270)).toBe(90)
  })
})

describe('normalizeDecidegrees', () => {
  it('leaves in-range values untouched', () => {
    expect(normalizeDecidegrees(900)).toBe(900)
    expect(normalizeDecidegrees(-900)).toBe(-900)
    expect(normalizeDecidegrees(1800)).toBe(1800)
  })

  it('wraps values above 1800 into the negative half', () => {
    expect(normalizeDecidegrees(2700)).toBe(-900)
    expect(normalizeDecidegrees(3600)).toBe(0)
  })
})

describe('forwardDistance', () => {
  it('is the mean of the two wheel arcs', () => {
    // Both wheels turn one full rotation → one circumference forward.
    expect(forwardDistance(360, 360, 56)).toBeCloseTo(Math.PI * 56, 6)
  })

  it('is zero for a pivot turn (equal and opposite wheels)', () => {
    expect(forwardDistance(360, -360, 56)).toBeCloseTo(0, 6)
  })
})

describe('positionDelta', () => {
  it('moves along +y when driving straight from zero heading', () => {
    const { dx, dy } = positionDelta(360, 360, 0, STANDARD)
    expect(dx).toBeCloseTo(0, 6)
    expect(dy).toBeCloseTo(Math.PI * 56, 6)
  })

  it('moves along +x when driving straight while heading 90 (clockwise)', () => {
    const { dx, dy } = positionDelta(360, 360, 90, STANDARD)
    expect(dx).toBeCloseTo(Math.PI * 56, 6)
    expect(dy).toBeCloseTo(0, 6)
  })

  it('barely translates during a pure pivot', () => {
    const { dx, dy } = positionDelta(360, -360, 0, STANDARD)
    expect(dx).toBeCloseTo(0, 6)
    expect(dy).toBeCloseTo(0, 6)
  })
})

describe('yawToQuaternion', () => {
  it('is the identity quaternion at zero yaw', () => {
    expect(yawToQuaternion(0)).toEqual([1, 0, 0, 0])
  })

  it('encodes a 180-degree rotation about z', () => {
    const [w, x, y, z] = yawToQuaternion(180)
    expect(w).toBeCloseTo(0, 6)
    expect(x).toBe(0)
    expect(y).toBe(0)
    expect(z).toBeCloseTo(1, 6)
  })
})
