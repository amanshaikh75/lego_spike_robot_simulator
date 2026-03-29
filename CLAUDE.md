# LEGO Spike Prime Simulator

## Project Overview
Web-based simulator for LEGO Spike Prime robots. Tests Python code before deploying to real hardware. Uses Vue 3 + Pyodide (Python in WebAssembly).

## Key Files
- `docs/project_plan.md` — Full project plan with milestones and API checklist
- `docs/code_description.md` — Comprehensive code documentation with Mermaid diagrams
- `docs/code_description_instructions.md` — Instructions for generating code_description.md
- `src/composables/usePyodide.js` — Pyodide init, Python module creation, code execution
- `src/composables/useRobotState.js` — Robot state management (motors, logs)

## Instructions
- After committing code, update the status of the project in this file.

## Project Progress

### Phase 1: Programming Interface & Logic Simulation (MVP)

#### Milestone 1.1: Project Setup & Basic Motor — COMPLETE
- Vue + Vite project initialized
- Pyodide integration set up
- `hub.port` module implemented (constants A-F)
- Basic `motor` module implemented (`run`, `stop`, `velocity`, `absolute_position`, `relative_position`)
- CodeInput and Console components created
- Robot state management created
- Note: `motor.absolute_position()` and `motor.relative_position()` were implemented early (originally milestone 1.2 items)

#### Milestone 1.2: Async Support & Motor Commands — IN PROGRESS
- Task 1 (`runloop` module): COMPLETE — `run()`, `sleep_ms()`, `until()` implemented
- Task 2 (`time.sleep_ms` blocking version): COMPLETE — Also added `ticks_ms()` and `ticks_diff()`
- Task 3 (extended `motor` commands): IN PROGRESS — `run_for_degrees` and `run_for_time` done, still need: `run_to_absolute_position`, `run_to_relative_position`, `reset_relative_position`
- Task 4 (motor constants): NOT STARTED — BRAKE, COAST, HOLD, CONTINUE, SMART_COAST, SMART_BRAKE, CLOCKWISE, COUNTERCLOCKWISE, SHORTEST_PATH, LONGEST_PATH

#### Milestone 1.3: Motor Pair & Drivebase — NOT STARTED
#### Milestone 1.4: IMU / Motion Sensor — NOT STARTED
#### Milestone 1.5: Dashboard & Polish — NOT STARTED
