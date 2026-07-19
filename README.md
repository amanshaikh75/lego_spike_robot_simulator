# LEGO Spike Prime Simulator

A web-based simulator for LEGO Spike Prime robots that lets you test Python code
in the browser before deploying it to real hardware. It runs the actual
[SPIKE 3 Python API](https://tuftsceeo.github.io/SPIKEPythonDocs/SPIKE3.html)
under [Pyodide](https://pyodide.org/) (Python compiled to WebAssembly), with a
Vue 3 front end that shows live robot state.

## Features

- **Run SPIKE Python in the browser** — `import motor`, `motor_pair`, `runloop`,
  and `from hub import port, motion_sensor` all work, including `async`/`await`.
- **Console** — captures `print()` output and a running log of robot actions.
- **Dashboard** — live view of all six motor ports (velocity, absolute/relative
  position, running state), motor-pair assignments, IMU yaw, and the robot's
  dead-reckoned (x, y) position.
- **Robot configuration** — edit or upload a JSON config to set wheel diameter,
  axle track, and which motors form the drivebase. The geometry feeds the
  kinematics that derive yaw and position from wheel movement.
- **Reset** — clear all robot state back to defaults between runs.

See [`docs/project_plan.md`](docs/project_plan.md) for the full roadmap and API
checklist, and [`docs/code_description.md`](docs/code_description.md) for an
architecture walkthrough.

## Getting started

Requires [Node.js](https://nodejs.org/en/download) (which includes `npm`).

```bash
npm install     # install dependencies
npm test        # run the unit test suite (Vitest)
npm run dev     # start the dev server
```

Then open the URL it prints (default `http://localhost:5173`) in your browser.

After pulling new changes from GitHub, re-run `npm install` (in case
dependencies changed), then `npm test` and `npm run dev` again.

### Other commands

```bash
npm run build     # production build into dist/
npm run preview   # preview the production build
```

## Using the simulator

1. Wait for the status badge in the header to show **Ready** (Pyodide loads on
   first visit).
2. (Optional) Adjust the **Robot Configuration** panel and click **Apply** to
   set the robot's geometry and drivebase, or **Upload** a `.json` config file.
3. Type or paste SPIKE Python into the **Code Input** panel and click
   **Run Code**.
4. Watch the **Console** for output and the **Dashboard** for live state.
5. Click **Reset Robot** to return everything to defaults.

### Example program

```python
import motor_pair
import runloop
from hub import port, motion_sensor

async def main():
    motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
    print(f"Initial yaw: {motion_sensor.tilt_angles()[0]}")
    # Spin in place: left wheel forward, right wheel backward.
    await motor_pair.move_tank_for_degrees(motor_pair.PAIR_1, 360, 500, -500)
    print(f"After turn yaw: {motion_sensor.tilt_angles()[0]}")

runloop.run(main())
```

## Robot configuration format

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
  }
}
```

| Field | Description | Default |
|-------|-------------|---------|
| `robot.name` | Display name (optional) | — |
| `robot.wheelDiameterMm` | Drive wheel diameter in mm | 56 |
| `robot.axleTrackMm` | Distance between the drive wheels in mm | 112 |
| `drivebase.leftMotorPort` | Left drive motor port (A–F) | A |
| `drivebase.rightMotorPort` | Right drive motor port (A–F) | B |
| `drivebase.motorPairSlot` | Drivebase pair slot (1–3 → PAIR_1–PAIR_3) | 1 |

Applying a configuration pairs the two drive motors into the chosen slot, so the
kinematics layer can derive yaw and position from their rotation.

## Tech stack

- **Vue 3** (`<script setup>` SFCs) + **Vite**
- **Pyodide** for in-browser Python execution
- **Vitest** for unit tests

## Limitations (Phase 1)

This is a logic-and-kinematics simulator, not a physics engine:

- Motors respond instantly (no acceleration/inertia modeling).
- Pitch and roll are always 0; yaw and position are dead-reckoned from wheel
  movement only.
- `motion_sensor.acceleration()` / `angular_velocity()` return zeros.
- No other sensors (color, distance, force) or hub features (light matrix,
  buttons, speaker) yet.
- Single robot, flat ground, no collisions.
