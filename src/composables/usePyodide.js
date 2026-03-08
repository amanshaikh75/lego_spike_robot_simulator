import { ref, shallowRef } from 'vue'
import { loadPyodide } from 'pyodide'
import { motorRun, motorStop, motorRunForDegrees, motorVelocity, motorAbsolutePosition, motorRelativePosition, addLog, PORTS } from './useRobotState'

const pyodide = shallowRef(null)
const isLoading = ref(true)
const isReady = ref(false)
const error = ref(null)

// Python code for the hub.port module
const hubPortModule = `
port.A = ${PORTS.A}
port.B = ${PORTS.B}
port.C = ${PORTS.C}
port.D = ${PORTS.D}
port.E = ${PORTS.E}
port.F = ${PORTS.F}
`

// Python code for the runloop module
const runloopModule = `
import asyncio

_pending_tasks = []

def run(*functions):
    """Start one or more async functions and run them concurrently.

    This is the entry point for SPIKE programs. It schedules the given
    coroutines to be executed. The simulator awaits them after user code
    completes.
    """
    _pending_tasks.extend(functions)

async def sleep_ms(duration):
    """Asynchronously sleep for the given number of milliseconds."""
    await asyncio.sleep(duration / 1000)

async def until(function, timeout=0):
    """Wait until function returns a truthy value, or timeout (ms) expires.

    If timeout is 0 or negative, wait indefinitely.
    Raises TimeoutError if the timeout expires before the condition is met.
    """
    elapsed = 0
    poll_interval = 10  # ms
    while True:
        if function():
            return
        if timeout > 0 and elapsed >= timeout:
            raise TimeoutError("runloop.until() timed out")
        await asyncio.sleep(poll_interval / 1000)
        elapsed += poll_interval
`

// Python code for the motor module
const motorModule = `
import js
from js import _motor_run, _motor_stop, _motor_run_for_degrees, _motor_velocity, _motor_absolute_position, _motor_relative_position

def run(port, velocity, *, acceleration=1000):
    """Run the motor at a constant velocity."""
    _motor_run(port, velocity)

def stop(port, *, stop=0):
    """Stop the motor."""
    _motor_stop(port)

def velocity(port):
    """Get the current velocity of the motor."""
    return _motor_velocity(port)

def absolute_position(port):
    """Get the absolute position of the motor."""
    return _motor_absolute_position(port)

def relative_position(port):
    """Get the relative position of the motor."""
    return _motor_relative_position(port)

async def run_for_degrees(port, degrees, velocity, *, stop=0, acceleration=1000, deceleration=1000):
    """Run the motor for the given number of degrees at the specified velocity."""
    await _motor_run_for_degrees(port, degrees, velocity)
`

async function initPyodide() {
  try {
    isLoading.value = true
    error.value = null

    // Load Pyodide
    pyodide.value = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.1/full/'
    })

    // Expose JavaScript functions to Python via globalThis (accessible from `js` module)
    globalThis._motor_run = motorRun
    globalThis._motor_stop = motorStop
    globalThis._motor_run_for_degrees = motorRunForDegrees
    globalThis._motor_velocity = motorVelocity
    globalThis._motor_absolute_position = motorAbsolutePosition
    globalThis._motor_relative_position = motorRelativePosition
    globalThis._add_log = addLog

    // Create the hub package with port module
    await pyodide.value.runPythonAsync(`
import sys
import types

# Create hub package
hub = types.ModuleType('hub')
sys.modules['hub'] = hub

# Create hub.port module
port = types.ModuleType('hub.port')
${hubPortModule}
hub.port = port
sys.modules['hub.port'] = port
`)

    // Create the motor module
    await pyodide.value.runPythonAsync(`
import types
motor = types.ModuleType('motor')
exec('''${motorModule}''', motor.__dict__)
sys.modules['motor'] = motor
`)

    // Create the runloop module
    await pyodide.value.runPythonAsync(`
import types
runloop = types.ModuleType('runloop')
exec('''${runloopModule}''', runloop.__dict__)
sys.modules['runloop'] = runloop
`)

    // Override print to capture output
    await pyodide.value.runPythonAsync(`
import sys
from js import _add_log

class LogWriter:
    def write(self, text):
        if text.strip():
            _add_log(text.rstrip())
    def flush(self):
        pass

sys.stdout = LogWriter()
sys.stderr = LogWriter()
`)

    isReady.value = true
    addLog('Pyodide initialized successfully')
  } catch (e) {
    error.value = e.message
    addLog(`Error initializing Pyodide: ${e.message}`)
  } finally {
    isLoading.value = false
  }
}

async function runCode(code) {
  if (!pyodide.value || !isReady.value) {
    addLog('Pyodide is not ready yet')
    return
  }

  try {
    addLog('--- Running code ---')
    await pyodide.value.runPythonAsync(code)

    // Await any coroutines scheduled via runloop.run()
    await pyodide.value.runPythonAsync(`
import runloop as _rl
import asyncio as _aio
if _rl._pending_tasks:
    await _aio.gather(*_rl._pending_tasks)
    _rl._pending_tasks.clear()
`)

    addLog('--- Code execution complete ---')
  } catch (e) {
    addLog(`Error: ${e.message}`)
  }
}

export function usePyodide() {
  return {
    pyodide,
    isLoading,
    isReady,
    error,
    initPyodide,
    runCode
  }
}
