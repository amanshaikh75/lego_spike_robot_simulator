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

describe('time extension module definition', () => {
  it('defines sleep_ms as a synchronous function', () => {
    const moduleSource = getTimeExtSource()
    expect(moduleSource).toContain('def sleep_ms(duration):')
    // Must NOT be async — this is the blocking version
    expect(moduleSource).not.toContain('async def sleep_ms')
  })

  it('delegates to time.sleep with millisecond conversion', () => {
    const moduleSource = getTimeExtSource()
    expect(moduleSource).toContain('_time.sleep(duration / 1000)')
  })

  it('imports the built-in time module', () => {
    const moduleSource = getTimeExtSource()
    expect(moduleSource).toContain('import time as _time')
  })
})

// Helper: read the source file and extract the runloop module string
function getRunloopSource() {
  // We read the source file content to extract the template
  // This is a static analysis test of the Python source template
  const fs = require('fs')
  const path = require('path')
  const source = fs.readFileSync(
    path.join(__dirname, 'usePyodide.js'),
    'utf-8'
  )
  // Extract content between "const runloopModule = `" and the closing backtick
  const match = source.match(/const runloopModule = `([\s\S]*?)`/)
  if (!match) throw new Error('Could not find runloopModule in source')
  return match[1]
}

// Helper: read the source file and extract the timeExtModule string
function getTimeExtSource() {
  const fs = require('fs')
  const path = require('path')
  const source = fs.readFileSync(
    path.join(__dirname, 'usePyodide.js'),
    'utf-8'
  )
  const match = source.match(/const timeExtModule = `([\s\S]*?)`/)
  if (!match) throw new Error('Could not find timeExtModule in source')
  return match[1]
}
