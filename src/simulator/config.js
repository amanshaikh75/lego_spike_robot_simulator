// Robot configuration parser.
//
// Turns the user-facing JSON config (the format documented in
// docs/project_plan.md) into the normalized numeric values the simulator's
// state layer consumes. This module is intentionally pure and has no imports:
// it maps port letters and pair slots to their numeric values directly so it
// can be unit-tested in isolation and avoids a circular import with
// useRobotState.

const PORT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

// Map a motor port letter ("A".."F") to its numeric value (0..5).
function portIndex(letter) {
  const idx = PORT_LETTERS.indexOf(String(letter).toUpperCase())
  if (idx === -1) {
    throw new Error(`Invalid motor port: ${letter} (expected A-F)`)
  }
  return idx
}

// Parse and validate a robot configuration object.
//
// Returns { name, wheelDiameterMm, axleTrackMm, drivebaseSlot, leftMotorPort,
// rightMotorPort } with ports as 0-5 and drivebaseSlot as 0-2 (PAIR_1..PAIR_3).
// Throws an Error with a human-readable message on any invalid field.
export function parseConfig(config) {
  if (config == null || typeof config !== 'object') {
    throw new Error('Config must be a JSON object')
  }
  const robot = config.robot || {}
  const drivebase = config.drivebase || {}

  const wheelDiameterMm = Number(robot.wheelDiameterMm)
  const axleTrackMm = Number(robot.axleTrackMm)
  if (!(wheelDiameterMm > 0)) {
    throw new Error(`Invalid robot.wheelDiameterMm: ${robot.wheelDiameterMm}`)
  }
  if (!(axleTrackMm > 0)) {
    throw new Error(`Invalid robot.axleTrackMm: ${robot.axleTrackMm}`)
  }

  const slot = Number(drivebase.motorPairSlot)
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
    throw new Error(
      `Invalid drivebase.motorPairSlot: ${drivebase.motorPairSlot} (expected 1-3)`
    )
  }

  const leftMotorPort = portIndex(drivebase.leftMotorPort)
  const rightMotorPort = portIndex(drivebase.rightMotorPort)
  if (leftMotorPort === rightMotorPort) {
    throw new Error('drivebase leftMotorPort and rightMotorPort must differ')
  }

  return {
    name: typeof robot.name === 'string' ? robot.name : null,
    wheelDiameterMm,
    axleTrackMm,
    drivebaseSlot: slot - 1, // motorPairSlot 1-3 → PAIR_1..PAIR_3 (0-2)
    leftMotorPort,
    rightMotorPort
  }
}

// Parse a JSON string into a normalized config (convenience wrapper that turns
// JSON syntax errors into a clearer message).
export function parseConfigJson(jsonString) {
  let raw
  try {
    raw = JSON.parse(jsonString)
  } catch (e) {
    throw new Error(`Config is not valid JSON: ${e.message}`)
  }
  return parseConfig(raw)
}

// The default robot configuration, in the user-facing JSON shape. Used to seed
// the config editor and as a reference for the expected format.
export const DEFAULT_CONFIG_JSON = {
  robot: {
    name: 'My Spike Robot',
    wheelDiameterMm: 56,
    axleTrackMm: 112
  },
  drivebase: {
    leftMotorPort: 'A',
    rightMotorPort: 'B',
    motorPairSlot: 1
  }
}
