import { describe, it, expect } from 'vitest'
import { parseConfig, parseConfigJson, DEFAULT_CONFIG_JSON } from './config'

const VALID = {
  robot: { name: 'Test Bot', wheelDiameterMm: 56, axleTrackMm: 112 },
  drivebase: { leftMotorPort: 'A', rightMotorPort: 'B', motorPairSlot: 1 }
}

describe('parseConfig', () => {
  it('normalizes a valid config into numeric values', () => {
    expect(parseConfig(VALID)).toEqual({
      name: 'Test Bot',
      wheelDiameterMm: 56,
      axleTrackMm: 112,
      drivebaseSlot: 0, // motorPairSlot 1 → PAIR_1 (0)
      leftMotorPort: 0, // A
      rightMotorPort: 1 // B
    })
  })

  it('maps port letters case-insensitively', () => {
    const parsed = parseConfig({
      ...VALID,
      drivebase: { leftMotorPort: 'c', rightMotorPort: 'f', motorPairSlot: 3 }
    })
    expect(parsed.leftMotorPort).toBe(2)
    expect(parsed.rightMotorPort).toBe(5)
    expect(parsed.drivebaseSlot).toBe(2)
  })

  it('defaults name to null when missing', () => {
    const { robot, ...rest } = VALID
    const parsed = parseConfig({ ...rest, robot: { wheelDiameterMm: 56, axleTrackMm: 112 } })
    expect(parsed.name).toBeNull()
  })

  it('rejects a non-object config', () => {
    expect(() => parseConfig(null)).toThrow(/object/)
    expect(() => parseConfig('nope')).toThrow(/object/)
  })

  it('rejects non-positive geometry', () => {
    expect(() => parseConfig({ ...VALID, robot: { wheelDiameterMm: 0, axleTrackMm: 112 } })).toThrow(/wheelDiameterMm/)
    expect(() => parseConfig({ ...VALID, robot: { wheelDiameterMm: 56, axleTrackMm: -1 } })).toThrow(/axleTrackMm/)
  })

  it('rejects an out-of-range pair slot', () => {
    expect(() => parseConfig({ ...VALID, drivebase: { leftMotorPort: 'A', rightMotorPort: 'B', motorPairSlot: 4 } })).toThrow(/motorPairSlot/)
  })

  it('rejects unknown ports', () => {
    expect(() => parseConfig({ ...VALID, drivebase: { leftMotorPort: 'Z', rightMotorPort: 'B', motorPairSlot: 1 } })).toThrow(/Invalid motor port/)
  })

  it('rejects pairing a motor with itself', () => {
    expect(() => parseConfig({ ...VALID, drivebase: { leftMotorPort: 'A', rightMotorPort: 'A', motorPairSlot: 1 } })).toThrow(/must differ/)
  })
})

describe('parseConfigJson', () => {
  it('parses a JSON string', () => {
    expect(parseConfigJson(JSON.stringify(VALID)).name).toBe('Test Bot')
  })

  it('reports invalid JSON clearly', () => {
    expect(() => parseConfigJson('{ not json')).toThrow(/not valid JSON/)
  })
})

describe('DEFAULT_CONFIG_JSON', () => {
  it('is itself a valid config', () => {
    expect(() => parseConfig(DEFAULT_CONFIG_JSON)).not.toThrow()
  })
})
