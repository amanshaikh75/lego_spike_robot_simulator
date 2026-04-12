import { describe, it, expect } from 'vitest'

// We test the runloop module definition as a string template,
// since Pyodide integration tests require a browser/Node environment
// with full Pyodide loaded. These tests verify the module structure
// and the runCode wrapper logic.

// Re-import the module source by importing the composable
// and verifying its exports and behavior.

describe('usePyodide exports', () => {
  it('exports the expected interface', async () => {
    const { usePyodide } = await import('./usePyodide.js')
    const api = usePyodide()

    expect(api).toHaveProperty('pyodide')
    expect(api).toHaveProperty('isLoading')
    expect(api).toHaveProperty('isReady')
    expect(api).toHaveProperty('error')
    expect(api).toHaveProperty('initPyodide')
    expect(api).toHaveProperty('runCode')
    expect(typeof api.initPyodide).toBe('function')
    expect(typeof api.runCode).toBe('function')
  })

  it('starts in loading state', async () => {
    const { usePyodide } = await import('./usePyodide.js')
    const { isLoading, isReady } = usePyodide()

    expect(isLoading.value).toBe(true)
    expect(isReady.value).toBe(false)
  })
})

describe('runloop module definition', () => {
  // Test the Python module source by parsing key expectations
  // This validates the template string is well-formed

  it('defines run function', () => {
    // Verify the module source is importable by checking the file
    // contains the expected Python function definitions
    const moduleSource = getRunloopSource()
    expect(moduleSource).toContain('def run(*functions):')
    expect(moduleSource).toContain('_pending_tasks.extend(functions)')
  })

  it('defines sleep_ms as async function', () => {
    const moduleSource = getRunloopSource()
    expect(moduleSource).toContain('async def sleep_ms(duration):')
    expect(moduleSource).toContain('asyncio.sleep(duration / 1000)')
  })

  it('defines until as async function with timeout', () => {
    const moduleSource = getRunloopSource()
    expect(moduleSource).toContain('async def until(function, timeout=0):')
    expect(moduleSource).toContain('TimeoutError')
  })

  it('initializes _pending_tasks as empty list', () => {
    const moduleSource = getRunloopSource()
    expect(moduleSource).toContain('_pending_tasks = []')
  })

  it('imports asyncio', () => {
    const moduleSource = getRunloopSource()
    expect(moduleSource).toContain('import asyncio')
  })
})

describe('time extension (inline in initPyodide)', () => {
  it('defines _sleep_ms as a synchronous function and assigns to time.sleep_ms', () => {
    const source = getFullSource()
    expect(source).toContain('def _sleep_ms(duration):')
    expect(source).not.toContain('async def _sleep_ms')
    expect(source).toContain('time.sleep_ms = _sleep_ms')
  })

  it('delegates to time.sleep with millisecond conversion', () => {
    const source = getFullSource()
    expect(source).toContain('time.sleep(duration / 1000)')
  })

  it('defines ticks_ms using time.time', () => {
    const source = getFullSource()
    expect(source).toContain('def _ticks_ms():')
    expect(source).toContain('time.ticks_ms = _ticks_ms')
  })

  it('defines ticks_diff as signed subtraction', () => {
    const source = getFullSource()
    expect(source).toContain('def _ticks_diff(ticks1, ticks2):')
    expect(source).toContain('return ticks1 - ticks2')
    expect(source).toContain('time.ticks_diff = _ticks_diff')
  })

  it('cleans up all temporary functions', () => {
    const source = getFullSource()
    expect(source).toContain('del _sleep_ms, _ticks_ms, _ticks_diff')
  })
})

describe('motor module definition', () => {
  it('defines run_to_absolute_position as async function', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toContain('async def run_to_absolute_position(port, position, velocity,')
    expect(moduleSource).toContain('direction=SHORTEST_PATH')
  })

  it('defines direction constants', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toContain('SHORTEST_PATH =')
    expect(moduleSource).toContain('LONGEST_PATH =')
    expect(moduleSource).toContain('CLOCKWISE =')
    expect(moduleSource).toContain('COUNTERCLOCKWISE =')
  })

  it('defines stop action constants interpolated from STOP_ACTION', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toContain('COAST = ${STOP_ACTION.COAST}')
    expect(moduleSource).toContain('BRAKE = ${STOP_ACTION.BRAKE}')
    expect(moduleSource).toContain('HOLD = ${STOP_ACTION.HOLD}')
    expect(moduleSource).toContain('CONTINUE = ${STOP_ACTION.CONTINUE}')
    expect(moduleSource).toContain('SMART_COAST = ${STOP_ACTION.SMART_COAST}')
    expect(moduleSource).toContain('SMART_BRAKE = ${STOP_ACTION.SMART_BRAKE}')
  })

  it('declares stop action constants before the functions that use them as defaults', () => {
    const moduleSource = getMotorSource()
    const brakeDeclIndex = moduleSource.indexOf('BRAKE = ${STOP_ACTION.BRAKE}')
    const firstStopDefault = moduleSource.indexOf('stop=BRAKE')
    expect(brakeDeclIndex).toBeGreaterThan(-1)
    expect(firstStopDefault).toBeGreaterThan(brakeDeclIndex)
  })

  it('uses BRAKE as the default stop action on run_for_degrees', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toMatch(/async def run_for_degrees\([^)]*stop=BRAKE/)
  })

  it('uses BRAKE as the default stop action on run_for_time', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toMatch(/async def run_for_time\([^)]*stop=BRAKE/)
  })

  it('uses BRAKE as the default stop action on run_to_absolute_position', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toMatch(/async def run_to_absolute_position\([^)]*stop=BRAKE/)
  })

  it('uses BRAKE as the default stop action on run_to_relative_position', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toMatch(/async def run_to_relative_position\([^)]*stop=BRAKE/)
  })

  it('uses BRAKE as the default stop action on motor.stop', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toMatch(/def stop\([^)]*stop=BRAKE/)
  })

  it('imports _motor_run_to_absolute_position from js', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toContain('_motor_run_to_absolute_position')
  })

  it('defines run_to_relative_position as async function', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toContain('async def run_to_relative_position(port, position, velocity,')
  })

  it('imports _motor_run_to_relative_position from js', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toContain('_motor_run_to_relative_position')
  })

  it('run_to_relative_position awaits the JS bridge', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toContain('await _motor_run_to_relative_position(port, position, velocity)')
  })

  it('defines reset_relative_position as synchronous function', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toContain('def reset_relative_position(port, position):')
    expect(moduleSource).not.toContain('async def reset_relative_position')
  })

  it('imports _motor_reset_relative_position from js', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toContain('_motor_reset_relative_position')
  })

  it('reset_relative_position delegates to the JS bridge', () => {
    const moduleSource = getMotorSource()
    expect(moduleSource).toContain('_motor_reset_relative_position(port, position)')
  })
})

// Helper: read the source file and extract the runloop module string
function getRunloopSource() {
  const fs = require('fs')
  const path = require('path')
  const source = fs.readFileSync(
    path.join(__dirname, 'usePyodide.js'),
    'utf-8'
  )
  const match = source.match(/const runloopModule = `([\s\S]*?)`/)
  if (!match) throw new Error('Could not find runloopModule in source')
  return match[1]
}

// Helper: read the source file and extract the motor module string
function getMotorSource() {
  const fs = require('fs')
  const path = require('path')
  const source = fs.readFileSync(
    path.join(__dirname, 'usePyodide.js'),
    'utf-8'
  )
  const match = source.match(/const motorModule = `([\s\S]*?)`/)
  if (!match) throw new Error('Could not find motorModule in source')
  return match[1]
}

// Helper: read the full source file
function getFullSource() {
  const fs = require('fs')
  const path = require('path')
  return fs.readFileSync(
    path.join(__dirname, 'usePyodide.js'),
    'utf-8'
  )
}
