# Lego Spike Prime Simulator

## Project Overview

A web-based simulator for LEGO Spike Prime robots that allows testing Python code before deploying to real hardware.

### Goals
- **Primary Purpose:** Test code before deploying to a real Spike Prime robot
- **API Compatibility:** Exact compatibility with the [Spike Prime Python API (SPIKE 3)](https://tuftsceeo.github.io/SPIKEPythonDocs/SPIKE3.html)
- **Target Users:** Personal use (public GitHub repository)

### Tech Stack
- **Frontend:** Vue.js (lightweight, easy learning curve)
- **Python Execution:** Pyodide (Python in WebAssembly)
- **Build Tool:** Vite (fast, modern, works well with Vue)

---

## Phased Development Roadmap

### Phase 1: Programming Interface & Logic Simulation (MVP)
- Console/log output for robot state
- Simple dashboard showing current values
- Paste/upload code interface
- Real-time execution
- Text-based robot configuration

### Phase 2: 2D Visualization
- Top-down view of robot movement
- Visual representation of robot position and orientation
- Trail/path visualization

### Phase 3: 3D Visualization
- 3D robot model
- Environment rendering

### Phase 4: Physics Simulation
- Realistic motor behavior
- Collision detection
- Surface friction

### Future Enhancements
- Configurable execution speed
- Step-through debugging
- Integrated code editor (Monaco/CodeMirror)
- Additional sensors (color, distance, force)
- Hub features (light matrix, buttons, speaker)

---

## Phase 1 Detailed Plan

### Milestone 1.1: Project Setup & Basic Motor
**Goal:** Run a simple motor command and see output in console

**Tasks:**
1. Initialize Vue + Vite project
2. Set up Pyodide integration
3. Implement `hub.port` module (constants A-F)
4. Implement basic `motor` module:
   - `motor.run(port, velocity)`
   - `motor.stop(port)`
   - `motor.velocity(port)`
5. Create CodeInput component (textarea + run button)
6. Create Console component (log output)
7. Create basic robot state management

**Test Program:**
```python
import motor
from hub import port

motor.run(port.A, 1000)
```

**Success Criteria:**
- Code runs without errors
- Console shows "Motor A running at 1000 deg/sec"

---

### Milestone 1.2: Async Support & Motor Commands
**Goal:** Support async/await and timed motor commands

**Tasks:**
1. Implement `runloop` module:
   - `runloop.run(*functions)`
   - `runloop.sleep_ms(duration)`
   - `runloop.until(function, timeout)`
2. Implement `time.sleep_ms()` (blocking version)
3. Extend `motor` module:
   - `motor.run_for_degrees(port, degrees, velocity, ...)`
   - `motor.run_for_time(port, duration, velocity, ...)`
   - `motor.run_to_absolute_position(port, position, velocity, ...)`
   - `motor.run_to_relative_position(port, position, velocity, ...)`
   - `motor.absolute_position(port)`
   - `motor.relative_position(port)`
   - `motor.reset_relative_position(port, position)`
4. Implement motor constants (BRAKE, COAST, HOLD, etc.)

**Test Program:**
```python
import motor
import runloop
from hub import port

async def main():
    await motor.run_for_degrees(port.A, 360, 720)
    print("Motor A completed 360 degrees")

runloop.run(main())
```

**Success Criteria:**
- Async code executes correctly
- Motor position updates over time
- Console shows completion message after appropriate delay

---

### Milestone 1.3: Motor Pair & Drivebase
**Goal:** Control two motors as a synchronized pair

**Tasks:**
1. Implement `motor_pair` module:
   - `motor_pair.pair(pair, left_motor, right_motor)`
   - `motor_pair.unpair(pair)`
   - `motor_pair.move(pair, steering, velocity, ...)`
   - `motor_pair.move_for_degrees(pair, degrees, steering, velocity, ...)`
   - `motor_pair.move_for_time(pair, duration, steering, velocity, ...)`
   - `motor_pair.move_tank(pair, left_velocity, right_velocity, ...)`
   - `motor_pair.move_tank_for_degrees(...)`
   - `motor_pair.move_tank_for_time(...)`
   - `motor_pair.stop(pair)`
2. Implement motor_pair constants (PAIR_1, PAIR_2, PAIR_3)

**Test Program:**
```python
import motor_pair
import runloop
from hub import port

async def main():
    motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
    await motor_pair.move_for_degrees(motor_pair.PAIR_1, 360, 0, velocity=500)
    print("Moved forward 360 degrees")

runloop.run(main())
```

**Success Criteria:**
- Both motors run synchronously
- Console shows both motor states
- Dashboard shows pair status

---

### Milestone 1.4: IMU / Motion Sensor
**Goal:** Calculate and report yaw/pitch/roll based on motor movements

**Tasks:**
1. Implement robot configuration file parser
2. Implement kinematics calculations:
   - Yaw from differential wheel movement
   - (Pitch/roll remain 0 for Phase 1 - no physics)
3. Implement `hub.motion_sensor` module:
   - `motion_sensor.tilt_angles()` → tuple[yaw, pitch, roll] in decidegrees
   - `motion_sensor.reset_yaw(angle)`
   - `motion_sensor.acceleration(raw_unfiltered)` → tuple[x, y, z]
   - `motion_sensor.angular_velocity(raw_unfiltered)` → tuple[x, y, z]
   - `motion_sensor.quaternion()`
   - `motion_sensor.up_face()`
   - `motion_sensor.stable()`
4. Implement motion_sensor constants (TOP, FRONT, RIGHT, etc.)

**Test Program:**
```python
import motor_pair
import runloop
from hub import port, motion_sensor

async def main():
    motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
    
    print(f"Initial yaw: {motion_sensor.tilt_angles()[0]}")
    
    # Turn right (left wheel faster)
    await motor_pair.move_tank_for_degrees(motor_pair.PAIR_1, 360, 500, 0)
    
    print(f"After turn yaw: {motion_sensor.tilt_angles()[0]}")

runloop.run(main())
```

**Success Criteria:**
- Yaw value changes based on differential motor movement
- Dashboard shows current orientation values
- Configuration file controls robot parameters

---

### Milestone 1.5: Dashboard & Polish
**Goal:** Clean UI showing all robot state

**Tasks:**
1. Create Dashboard component with:
   - Motor states (velocity, position) for all 6 ports
   - Motor pair status
   - IMU values (yaw, pitch, roll)
   - Robot position (x, y) - calculated from motor movements
2. Add configuration file upload/edit
3. Error handling and user feedback
4. Code cleanup and documentation

**Success Criteria:**
- All robot state visible at a glance
- Clear error messages for invalid code
- README with setup instructions

---

## Phase 2 Detailed Plan — 2D Top-Down Visualization

**Status:** PLANNED (Phase 1 complete). This section is the working plan; check
off milestones as they land.

### Goal

Render the robot's live position and heading on a top-down field, with a motion
trail, so a program's movement can be *watched* rather than read off numbers.
Phase 1 already produces everything the view needs — the kinematics layer keeps
`state.position.{x, y}` (mm) and `state.yaw` (degrees) continuously up to date —
so Phase 2 is predominantly a rendering layer over existing reactive state, plus
the pure world↔screen math to support it.

### Foundations already in place (from Phase 1)

- `state.position` — `{ x, y }` in **millimetres**, integrated from drivebase
  wheel motion. Frame: **+x right, +y = the robot's initial forward direction**
  ("north"). Origin is where the robot started / last reset.
- `state.yaw` — heading in **degrees, clockwise-positive**, `0` = facing +y.
  (`motion_sensor.tilt_angles()[0]` is the decidegree, wrapped form.)
- `state.config` — `{ wheelDiameterMm, axleTrackMm, drivebaseSlot }`, used to
  size the robot footprint on the field.
- `useRobotState()` returns a **readonly** reactive `state` and a `resetState()`
  that zeroes position/yaw. Updates arrive on the ~50ms move ticks.
- `src/simulator/kinematics.js` is the model for how Phase 2 code should be
  structured: **pure, DOM-free, unit-tested math** in `src/simulator/`, with the
  Vue component kept thin.

### Design decisions — RESOLVED

The four shaping choices, settled before coding:

1. **Renderer: Canvas 2D.** The growing trail is many points, and Canvas
   redraws cheaply; SVG nodes would accumulate. Redraw is driven by a Vue
   `watch` on `state.position`/`state.yaw` (they change on the 50ms ticks), with
   `requestAnimationFrame` coalescing so we never draw more than once per frame.
   Account for `devicePixelRatio` for crisp lines.
2. **Camera: fixed field with pan/zoom**, plus a "recenter / fit" control.
   Following the robot would hide how far it has actually travelled, which is the
   point of the view. (Milestone 2.3 adds the controls.)
3. **Trail storage: view layer.** Keep `useRobotState` an API surface, not a
   view model. `FieldView` samples `state.position` into a capped point buffer.
   The sampler (min-distance thresholding, cap, reset handling) is pure and lives
   in `src/simulator/trail.js` so it can be tested without a canvas.
4. **Layout: a new full-width `FieldView` panel** in `App.vue`, placed above the
   Dashboard so the field is the focal point and the numbers back it up.

### Milestone 2.1: Static Field & Robot Render — COMPLETE
**Goal:** The robot appears on a field at its current position and heading.

**Tasks:**
1. `src/simulator/viewTransform.js` — pure world↔screen math: `worldToScreen`
   / `screenToWorld` given a camera `{ centerXmm, centerYmm, pxPerMm }` and
   canvas size. Handles the **+y-up screen flip** (world +y is north, screen +y
   is down) and clockwise-yaw → screen-angle conversion.
2. `src/components/FieldView.vue` — a sized/`devicePixelRatio`-aware `<canvas>`
   that draws: field background, a reference grid (e.g. 100mm cells) with an
   origin marker and x/y axes, and the robot as an **oriented footprint** (a
   rectangle sized from `axleTrackMm` with a nose/arrow showing heading) at
   `worldToScreen(state.position)` rotated by `state.yaw`.
3. Redraw on `state.position`/`state.yaw` change via `watch` + rAF.
4. Mount `FieldView` in `App.vue` (full-width panel).

**Tests:** `src/simulator/viewTransform.test.js` — round-trips, the +y flip,
origin-at-center, yaw→screen-angle. (Canvas drawing itself is verified by eye /
a light mount smoke test; the math is where the unit tests go.)

**Success Criteria:** Running a move program visibly moves and rotates the robot
on the field, consistent with the Dashboard's x/y/yaw.

### Milestone 2.2: Motion Trail
**Goal:** The path the robot has driven is drawn behind it.

**Tasks:**
1. `src/simulator/trail.js` — pure trail buffer: append a point only when it is
   ≥ N mm from the last (avoids flooding on tiny ticks), cap total points (ring
   buffer), and expose the ordered points for drawing.
2. `FieldView` feeds `state.position` into the buffer on each change and draws
   the trail as a polyline under the robot (optionally fading older segments).
3. Clear the trail when the robot resets — detect the position→(0,0)+yaw→0
   transition, or expose a small reset signal from `useRobotState` for the view
   to observe. (Confirm which during 2.1; prefer not to widen the state API if a
   watch suffices.)

**Tests:** `src/simulator/trail.test.js` — min-distance thresholding, cap/ring
behaviour, clear.

**Success Criteria:** Driving a square leaves a square trail; reset clears it.

### Milestone 2.3: Interaction & Camera Controls
**Goal:** The user can navigate the field.

**Tasks:**
1. Pan (drag) and zoom (wheel, cursor-anchored) by mutating the camera; all hit
   math goes through `screenToWorld`.
2. Toolbar: **Recenter/Fit** (frame origin + robot, or the whole trail),
   zoom in/out buttons, **Clear trail** and a trail on/off toggle.
3. Small overlay readout (scale bar in mm, live x/y/heading) — or defer to the
   Dashboard if redundant.

**Tests:** camera transform helpers (zoom-about-cursor keeps the world point
under the cursor fixed) as pure functions.

**Success Criteria:** The field can be panned/zoomed smoothly and reset to a
sensible framing.

### Milestone 2.4: Polish & Integration
**Goal:** Ship-quality, responsive, documented.

**Tasks:**
1. Responsive canvas via `ResizeObserver`; re-render on resize; crisp on HiDPI.
2. Reset wiring: clearing the robot clears the trail and recenters the camera.
3. Docs: update `README.md` (new visualization section), regenerate
   `docs/code_description.md`, and mark Phase 2 progress in `CLAUDE.md`.
4. Final test pass; keep the suite green.

**Success Criteria:** A newcomer can paste a drive program, press Run, and watch
the robot trace its path on a field that they can pan, zoom, and reset.

### Out of scope for Phase 2 (later phases)
- 3D rendering (Phase 3), physics/collisions/friction (Phase 4).
- Obstacles, walls, or a mat/board background image.
- Editing the robot's pose by dragging it on the field.

---

## Configuration File Format

```json
{
  "robot": {
    "name": "My Spike Robot",
    "wheelDiameterMm": 56,
    "axleTrackMm": 112
  },
  "drivebase": {
    "leftMotorPort": "A",
    "rightMotorPort": "B",
    "motorPairSlot": 1
  },
  "motors": {
    "A": { "type": "medium", "inverted": false },
    "B": { "type": "medium", "inverted": false },
    "C": { "type": "large", "inverted": false }
  }
}
```

### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `wheelDiameterMm` | Diameter of drive wheels in mm | 56 (standard Spike wheel) |
| `axleTrackMm` | Distance between wheel centers in mm | 112 |
| `leftMotorPort` | Port for left drive motor | A |
| `rightMotorPort` | Port for right drive motor | B |
| `motorPairSlot` | Which PAIR_X slot is the drivebase | 1 |
| `motors[X].type` | Motor type: "small", "medium", "large" | "medium" |
| `motors[X].inverted` | Whether motor direction is inverted | false |

### Kinematics Calculations

**Yaw change from motor movements:**
```
wheel_circumference = π × wheel_diameter
left_distance = (left_motor_degrees / 360) × wheel_circumference
right_distance = (right_motor_degrees / 360) × wheel_circumference

# Differential drive kinematics
delta_yaw = (right_distance - left_distance) / axle_track
yaw += delta_yaw  # in radians, convert to decidegrees for API
```

---

## File Structure

```
spike-simulator/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── PROJECT_PLAN.md
│
├── public/
│   └── default-config.json      # Default robot configuration
│
├── src/
│   ├── main.js                  # Vue app entry point
│   ├── App.vue                  # Main application component
│   │
│   ├── components/
│   │   ├── CodeInput.vue        # Code paste/upload area
│   │   ├── Console.vue          # Output log display
│   │   ├── Dashboard.vue        # Robot state visualization
│   │   └── ConfigEditor.vue     # Configuration file editor
│   │
│   ├── composables/
│   │   ├── usePyodide.js        # Pyodide initialization & execution
│   │   └── useRobotState.js     # Reactive robot state management
│   │
│   └── simulator/
│       ├── index.js             # Simulator initialization
│       ├── robot.js             # Robot state class
│       ├── kinematics.js        # Motion calculations
│       ├── config.js            # Configuration parser
│       │
│       └── spike-api/           # Python modules for Pyodide
│           ├── motor.py
│           ├── motor_pair.py
│           ├── runloop.py
│           ├── time_ext.py      # Extended time module
│           └── hub/
│               ├── __init__.py
│               ├── port.py
│               └── motion_sensor.py
│
└── tests/                       # Test programs
    ├── test_motor_basic.py
    ├── test_motor_async.py
    ├── test_motor_pair.py
    └── test_motion_sensor.py
```

---

## API Implementation Checklist

### hub.port
- [ ] Constants: A, B, C, D, E, F (values 0-5)

### motor
- [ ] `run(port, velocity, *, acceleration)`
- [ ] `stop(port, *, stop)`
- [ ] `run_for_degrees(port, degrees, velocity, *, stop, acceleration, deceleration)` → Awaitable
- [ ] `run_for_time(port, duration, velocity, *, stop, acceleration, deceleration)` → Awaitable
- [ ] `run_to_absolute_position(port, position, velocity, *, direction, stop, acceleration, deceleration)` → Awaitable
- [ ] `run_to_relative_position(port, position, velocity, *, stop, acceleration, deceleration)` → Awaitable
- [ ] `velocity(port)` → int
- [ ] `absolute_position(port)` → int
- [ ] `relative_position(port)` → int
- [ ] `reset_relative_position(port, position)`
- [ ] `set_duty_cycle(port, pwm)`
- [ ] `get_duty_cycle(port)` → int
- [ ] Constants: READY, RUNNING, STALLED, CANCELLED, ERROR, DISCONNECTED
- [ ] Constants: COAST, BRAKE, HOLD, CONTINUE, SMART_COAST, SMART_BRAKE
- [ ] Constants: CLOCKWISE, COUNTERCLOCKWISE, SHORTEST_PATH, LONGEST_PATH

### motor_pair
- [ ] `pair(pair, left_motor, right_motor)`
- [ ] `unpair(pair)`
- [ ] `move(pair, steering, *, velocity, acceleration)`
- [ ] `move_for_degrees(pair, degrees, steering, *, velocity, stop, acceleration, deceleration)` → Awaitable
- [ ] `move_for_time(pair, duration, steering, *, velocity, stop, acceleration, deceleration)` → Awaitable
- [ ] `move_tank(pair, left_velocity, right_velocity, *, acceleration)`
- [ ] `move_tank_for_degrees(pair, degrees, left_velocity, right_velocity, *, stop, acceleration, deceleration)` → Awaitable
- [ ] `move_tank_for_time(pair, duration, left_velocity, right_velocity, *, stop, acceleration, deceleration)` → Awaitable
- [ ] `stop(pair, *, stop)`
- [ ] Constants: PAIR_1, PAIR_2, PAIR_3 (values 0-2)

### runloop
- [ ] `run(*functions)`
- [ ] `sleep_ms(duration)` → Awaitable
- [ ] `until(function, timeout)` → Awaitable

### hub.motion_sensor
- [x] `tilt_angles()` → tuple[int, int, int] (yaw, pitch, roll in decidegrees) — yaw from kinematics; pitch/roll always 0
- [x] `reset_yaw(angle)` — angle in degrees
- [x] `acceleration(raw_unfiltered)` → tuple[int, int, int] — Phase 1 stub (zeros, no physics)
- [x] `angular_velocity(raw_unfiltered)` → tuple[int, int, int] — Phase 1 stub (zeros, no physics)
- [x] `quaternion()` → tuple[float, float, float, float] — derived from yaw
- [x] `up_face()` → int — always TOP (no tilt simulation)
- [x] `stable()` → bool — always True
- [ ] `gesture()` → int
- [ ] `tap_count()` → int
- [ ] `reset_tap_count()`
- [ ] `set_yaw_face(up)` → bool
- [ ] `get_yaw_face()` → int
- [x] Constants: TOP, FRONT, RIGHT, BOTTOM, BACK, LEFT (values 0-5)
- [ ] Constants: TAPPED, DOUBLE_TAPPED, SHAKEN, FALLING, UNKNOWN

---

## Development Notes

### Pyodide Integration Considerations
1. **Module Loading:** Custom Spike API modules need to be loaded into Pyodide's filesystem
2. **Async Execution:** Pyodide supports async/await; need to bridge JavaScript promises with Python coroutines
3. **State Communication:** Robot state lives in JavaScript; Python modules call JavaScript functions to read/update state
4. **Time Simulation:** `sleep_ms` needs to actually wait (real-time for Phase 1)

### Known Limitations (Phase 1)
1. No physics simulation - motors respond instantly
2. Pitch and roll always return 0 (no tilt simulation)
3. No sensor simulation (color, distance, force)
4. No hub features (light matrix, buttons, speaker)
5. Single robot only

### Testing Strategy
1. Create test programs for each milestone
2. Compare output with real Spike Prime hub where possible
3. Manual testing via the web UI
