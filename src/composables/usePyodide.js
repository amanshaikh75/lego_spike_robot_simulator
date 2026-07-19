import { ref, shallowRef } from 'vue'
import { loadPyodide } from 'pyodide'
import { motorRun, motorStop, motorRunForDegrees, motorRunForTime, motorRunToAbsolutePosition, motorRunToRelativePosition, motorResetRelativePosition, motorVelocity, motorAbsolutePosition, motorRelativePosition, motorPairPair, motorPairUnpair, motorPairMove, motorPairMoveTank, motorPairStop, motorPairMoveForDegrees, motorPairMoveForTime, motorPairMoveTankForDegrees, motorPairMoveTankForTime, motionTiltAngles, motionResetYaw, motionAcceleration, motionAngularVelocity, motionQuaternion, motionUpFace, motionStable, motionSetYawFace, motionGetYawFace, addLog, PORTS, DIRECTION, STOP_ACTION, PAIRS, FACES } from './useRobotState'

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
from js import _motor_run, _motor_stop, _motor_run_for_degrees, _motor_run_for_time, _motor_run_to_absolute_position, _motor_run_to_relative_position, _motor_reset_relative_position, _motor_velocity, _motor_absolute_position, _motor_relative_position

# Direction constants (for run_to_absolute_position)
SHORTEST_PATH = ${DIRECTION.SHORTEST_PATH}
LONGEST_PATH = ${DIRECTION.LONGEST_PATH}
CLOCKWISE = ${DIRECTION.CLOCKWISE}
COUNTERCLOCKWISE = ${DIRECTION.COUNTERCLOCKWISE}

# Stop action constants (for the stop= kwarg of motor commands)
COAST = ${STOP_ACTION.COAST}
BRAKE = ${STOP_ACTION.BRAKE}
HOLD = ${STOP_ACTION.HOLD}
CONTINUE = ${STOP_ACTION.CONTINUE}
SMART_COAST = ${STOP_ACTION.SMART_COAST}
SMART_BRAKE = ${STOP_ACTION.SMART_BRAKE}

def run(port, velocity, *, acceleration=1000):
    """Run the motor at a constant velocity."""
    _motor_run(port, velocity)

def stop(port, *, stop=BRAKE):
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

def reset_relative_position(port, position):
    """Reset the relative position of the motor to the given value (no movement)."""
    _motor_reset_relative_position(port, position)

async def run_for_degrees(port, degrees, velocity, *, stop=BRAKE, acceleration=1000, deceleration=1000):
    """Run the motor for the given number of degrees at the specified velocity."""
    await _motor_run_for_degrees(port, degrees, velocity)

async def run_for_time(port, duration, velocity, *, stop=BRAKE, acceleration=1000, deceleration=1000):
    """Run the motor for the given duration (ms) at the specified velocity."""
    await _motor_run_for_time(port, duration, velocity)

async def run_to_absolute_position(port, position, velocity, *, direction=SHORTEST_PATH, stop=BRAKE, acceleration=1000, deceleration=1000):
    """Run the motor to the given absolute position (0-359)."""
    await _motor_run_to_absolute_position(port, position, velocity, direction)

async def run_to_relative_position(port, position, velocity, *, stop=BRAKE, acceleration=1000, deceleration=1000):
    """Run the motor to the given relative position (in degrees)."""
    await _motor_run_to_relative_position(port, position, velocity)
`

// Python code for the motor_pair module
const motorPairModule = `
from js import _motor_pair_pair, _motor_pair_unpair, _motor_pair_move, _motor_pair_move_tank, _motor_pair_stop, _motor_pair_move_for_degrees, _motor_pair_move_for_time, _motor_pair_move_tank_for_degrees, _motor_pair_move_tank_for_time

# Pair slot constants
PAIR_1 = ${PAIRS.PAIR_1}
PAIR_2 = ${PAIRS.PAIR_2}
PAIR_3 = ${PAIRS.PAIR_3}

# Stop action constants (mirror motor module so motor_pair.stop(stop=...) is self-contained)
COAST = ${STOP_ACTION.COAST}
BRAKE = ${STOP_ACTION.BRAKE}
HOLD = ${STOP_ACTION.HOLD}
CONTINUE = ${STOP_ACTION.CONTINUE}
SMART_COAST = ${STOP_ACTION.SMART_COAST}
SMART_BRAKE = ${STOP_ACTION.SMART_BRAKE}

def pair(pair, left_motor, right_motor):
    """Bind two motor ports to a pair slot for synchronized control."""
    _motor_pair_pair(pair, left_motor, right_motor)

def unpair(pair):
    """Release the motors bound to the given pair slot."""
    _motor_pair_unpair(pair)

def move(pair, steering, *, velocity=360, acceleration=1000):
    """Move the paired motors with the given steering (-100 to 100) and velocity."""
    _motor_pair_move(pair, steering, velocity)

def move_tank(pair, left_velocity, right_velocity, *, acceleration=1000):
    """Move the paired motors independently at the given left/right velocities."""
    _motor_pair_move_tank(pair, left_velocity, right_velocity)

def stop(pair, *, stop=BRAKE):
    """Stop the paired motors."""
    _motor_pair_stop(pair)

async def move_for_degrees(pair, degrees, steering, *, velocity=360, stop=BRAKE, acceleration=1000, deceleration=1000):
    """Move the pair for the given degrees (faster wheel), with steering."""
    await _motor_pair_move_for_degrees(pair, degrees, steering, velocity)

async def move_for_time(pair, duration, steering, *, velocity=360, stop=BRAKE, acceleration=1000, deceleration=1000):
    """Move the pair for the given duration (ms), with steering."""
    await _motor_pair_move_for_time(pair, duration, steering, velocity)

async def move_tank_for_degrees(pair, degrees, left_velocity, right_velocity, *, stop=BRAKE, acceleration=1000, deceleration=1000):
    """Move each wheel independently for the given number of degrees."""
    await _motor_pair_move_tank_for_degrees(pair, degrees, left_velocity, right_velocity)

async def move_tank_for_time(pair, duration, left_velocity, right_velocity, *, stop=BRAKE, acceleration=1000, deceleration=1000):
    """Move each wheel independently for the given duration (ms)."""
    await _motor_pair_move_tank_for_time(pair, duration, left_velocity, right_velocity)
`

// Python code for the hub.motion_sensor module
const motionSensorModule = `
from js import _motion_tilt_angles, _motion_reset_yaw, _motion_acceleration, _motion_angular_velocity, _motion_quaternion, _motion_up_face, _motion_stable, _motion_set_yaw_face, _motion_get_yaw_face

# Face constants (which face points up)
TOP = ${FACES.TOP}
FRONT = ${FACES.FRONT}
RIGHT = ${FACES.RIGHT}
BOTTOM = ${FACES.BOTTOM}
BACK = ${FACES.BACK}
LEFT = ${FACES.LEFT}

def tilt_angles():
    """Return (yaw, pitch, roll) in decidegrees. Pitch and roll are always 0."""
    return tuple(_motion_tilt_angles())

def reset_yaw(angle=0):
    """Set the yaw angle to the given value in degrees (default 0)."""
    _motion_reset_yaw(angle)

def acceleration(raw_unfiltered=False):
    """Return (x, y, z) acceleration. Not simulated in Phase 1 (returns zeros)."""
    return tuple(_motion_acceleration())

def angular_velocity(raw_unfiltered=False):
    """Return (x, y, z) angular velocity. Not simulated in Phase 1 (returns zeros)."""
    return tuple(_motion_angular_velocity())

def quaternion():
    """Return the orientation quaternion (w, x, y, z), derived from yaw."""
    return tuple(_motion_quaternion())

def up_face():
    """Return which face points up. Always TOP without tilt simulation."""
    return _motion_up_face()

def stable():
    """Return whether the hub is stable. Always True without physics."""
    return _motion_stable()

def set_yaw_face(up):
    """Select which hub face measures yaw. Returns True for a valid face.

    The simulator only models yaw about the vertical axis, so this records the
    requested face; get_yaw_face() returns it back.
    """
    return _motion_set_yaw_face(up)

def get_yaw_face():
    """Return the hub face currently used to measure yaw (default TOP)."""
    return _motion_get_yaw_face()
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
    globalThis._motor_run_for_time = motorRunForTime
    globalThis._motor_run_to_absolute_position = motorRunToAbsolutePosition
    globalThis._motor_run_to_relative_position = motorRunToRelativePosition
    globalThis._motor_reset_relative_position = motorResetRelativePosition
    globalThis._motor_velocity = motorVelocity
    globalThis._motor_absolute_position = motorAbsolutePosition
    globalThis._motor_relative_position = motorRelativePosition
    globalThis._motor_pair_pair = motorPairPair
    globalThis._motor_pair_unpair = motorPairUnpair
    globalThis._motor_pair_move = motorPairMove
    globalThis._motor_pair_move_tank = motorPairMoveTank
    globalThis._motor_pair_stop = motorPairStop
    globalThis._motor_pair_move_for_degrees = motorPairMoveForDegrees
    globalThis._motor_pair_move_for_time = motorPairMoveForTime
    globalThis._motor_pair_move_tank_for_degrees = motorPairMoveTankForDegrees
    globalThis._motor_pair_move_tank_for_time = motorPairMoveTankForTime
    globalThis._motion_tilt_angles = motionTiltAngles
    globalThis._motion_reset_yaw = motionResetYaw
    globalThis._motion_acceleration = motionAcceleration
    globalThis._motion_angular_velocity = motionAngularVelocity
    globalThis._motion_quaternion = motionQuaternion
    globalThis._motion_up_face = motionUpFace
    globalThis._motion_stable = motionStable
    globalThis._motion_set_yaw_face = motionSetYawFace
    globalThis._motion_get_yaw_face = motionGetYawFace
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

    // Create the motor_pair module
    await pyodide.value.runPythonAsync(`
import types
motor_pair = types.ModuleType('motor_pair')
exec('''${motorPairModule}''', motor_pair.__dict__)
sys.modules['motor_pair'] = motor_pair
`)

    // Create the hub.motion_sensor module and attach it to the hub package
    await pyodide.value.runPythonAsync(`
import types
motion_sensor = types.ModuleType('hub.motion_sensor')
exec('''${motionSensorModule}''', motion_sensor.__dict__)
hub.motion_sensor = motion_sensor
sys.modules['hub.motion_sensor'] = motion_sensor
`)

    // Extend the time module with MicroPython-compatible functions
    await pyodide.value.runPythonAsync(`
import time

def _sleep_ms(duration):
    """Sleep for the given number of milliseconds (blocking)."""
    time.sleep(duration / 1000)

def _ticks_ms():
    """Return an increasing millisecond counter (MicroPython-compatible)."""
    return int(time.time() * 1000)

def _ticks_diff(ticks1, ticks2):
    """Compute the signed difference between two ticks values (MicroPython-compatible)."""
    return ticks1 - ticks2

time.sleep_ms = _sleep_ms
time.ticks_ms = _ticks_ms
time.ticks_diff = _ticks_diff
del _sleep_ms, _ticks_ms, _ticks_diff
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
