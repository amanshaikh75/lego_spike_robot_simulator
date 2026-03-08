# Project Progress

## Milestone 1.1: Project Setup & Basic Motor

**Status: Complete**

### Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Initialize Vue + Vite project | Done |
| 2 | Set up Pyodide integration | Done |
| 3 | Implement `hub.port` module (constants A-F) | Done |
| 4 | Implement basic `motor` module (`run`, `stop`, `velocity`) | Done |
| 5 | Create CodeInput component (textarea + run button) | Done |
| 6 | Create Console component (log output) | Done |
| 7 | Create basic robot state management | Done |

### Success Criteria

- **"Code runs without errors"** - The test program (`import motor; from hub import port; motor.run(port.A, 1000)`) is wired up end-to-end through Pyodide.
- **"Console shows 'Motor A running at 1000 deg/sec'"** - `motorRun()` in `useRobotState.js` logs exactly this message format.

### Notes

- Implementation goes slightly beyond requirements by also including `motor.absolute_position()` and `motor.relative_position()` (milestone 1.2 items).

---

## Milestone 1.2: Async Support & Motor Commands

**Status: Not started**

## Milestone 1.3: Motor Pair & Drivebase

**Status: Not started**

## Milestone 1.4: IMU / Motion Sensor

**Status: Not started**

## Milestone 1.5: Dashboard & Polish

**Status: Not started**
