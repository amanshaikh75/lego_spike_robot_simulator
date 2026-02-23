# LEGO Spike Prime Simulator - Code Documentation

## Overview

This is a web-based simulator for testing Python code before deploying it to real LEGO Spike Prime robots. The application runs entirely in the browser using Vue 3 for the UI framework and Pyodide for executing Python code via WebAssembly.

## Source Files

| File | Purpose |
| :--- | :--- |
| `src/main.js` | Vue application entry point |
| `src/App.vue` | Root component, orchestrates the application |
| `src/components/CodeInput.vue` | Python code editor with Run button |
| `src/components/Console.vue` | Output log display |
| `src/composables/useRobotState.js` | Robot state management (motors, logs) |
| `src/composables/usePyodide.js` | Python execution engine via Pyodide |

---

## Input and Output

### Input

#### Command-line Flags
This is a client-side web application with no command-line interface. Development commands are:
* `npm run dev` - Start development server
* `npm run build` - Build for production
* `npm run preview` - Preview production build

#### Configuration
| Source | Configuration |
| :--- | :--- |
| `vite.config.js` | Vite build configuration with Vue plugin |
| `package.json` | Dependencies (Vue 3, Pyodide, Vite) |
| `usePyodide.js:45` | Pyodide CDN URL |

### Output

#### Data Displayed on Screen
| Component | Output | Description |
| :--- | :--- | :--- |
| `App.vue` header | Status badge | "Loading Pyodide...", "Ready", or "Error" |
| `Console.vue` | Log entries | Timestamped messages from code execution |

---

## Architecture

### Class Diagram

```mermaid
classDiagram
    class App {
        -RobotState state
        -Ref isLoading
        -Ref isReady
        +handleRunCode(code string)
        +handleClearConsole()
    }

    class CodeInput {
        -Ref code
        -boolean disabled
        +emit(run, code)
    }

    class Console {
        -Array logs
        -Ref consoleRef
        +emit(clear)
    }

    class useRobotState {
        -reactive state
        +Object PORTS
        +motorRun(port, velocity)
        +motorStop(port)
        +motorVelocity(port)
        +addLog(message)
        +clearLogs()
        +resetState()
    }

    class usePyodide {
        -ShallowRef pyodide
        -Ref isLoading
        -Ref isReady
        -Ref error
        +initPyodide()
        +runCode(code)
    }

    class RobotState {
        +Object motors
        +Array logs
    }

    class MotorState {
        +number velocity
        +number absolutePosition
        +number relativePosition
        +boolean running
    }

    class LogEntry {
        +string timestamp
        +string message
    }

    class Pyodide {
        +runPythonAsync(code)
        +Map globals
    }

    App *-- CodeInput : contains
    App *-- Console : contains
    App ..> useRobotState : uses
    App ..> usePyodide : uses
    useRobotState o-- RobotState : manages
    RobotState *-- MotorState : contains 6
    RobotState *-- LogEntry : contains many
    usePyodide ..> Pyodide : wraps
    usePyodide ..> useRobotState : calls motor functions
    CodeInput ..> App : emits 'run'
    Console ..> App : emits 'clear'
```

### Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                        App.vue                              │
│  ┌─────────────────────┐    ┌─────────────────────────┐    │
│  │   useRobotState()   │    │     usePyodide()        │    │
│  │   - state           │◄───│     - initPyodide()     │    │
│  │   - clearLogs()     │    │     - runCode()         │    │
│  │   - motorRun()      │    │     - isReady           │    │
│  └─────────────────────┘    └─────────────────────────┘    │
│             │                           │                   │
│             ▼                           ▼                   │
│  ┌─────────────────────┐    ┌─────────────────────────┐    │
│  │    Console.vue      │    │    CodeInput.vue        │    │
│  │    :logs="state.    │    │    :disabled="!isReady" │    │
│  │         logs"       │    │    @run="handleRunCode" │    │
│  │    @clear="handle   │    └─────────────────────────┘    │
│  │      ClearConsole"  │                                    │
│  └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Lifecycle of Objects

### Application Lifecycle

#### Phase 1: Initialization
1. Browser loads `index.html`
2. Vite serves `src/main.js`
3. Vue creates app instance and mounts `App.vue`
4. `onMounted()` hook triggers `initPyodide()`
5. Pyodide runtime loads from CDN
6. Python modules (`hub.port`, `motor`) are created
7. Status changes from "Loading..." to "Ready"

#### Phase 2: User Interaction
1. User enters Python code in textarea
2. User clicks "Run Code"
3. Code executes via Pyodide
4. Motor functions update robot state
5. Logs appear in Console

### Initialization Sequence

```mermaid
sequenceDiagram
    title Application Initialization Sequence
    participant Browser
    participant Main as main.js
    participant App as App.vue
    participant State as useRobotState
    participant Pyodide as usePyodide
    participant CDN

    Browser->>Main: Load application
    Main->>App: createApp().mount()
    activate App

    App->>State: useRobotState()
    State-->>App: { state, clearLogs, ... }

    App->>Pyodide: usePyodide()
    Pyodide-->>App: { isLoading, initPyodide, ... }

    App->>App: onMounted()
    App->>Pyodide: initPyodide()
    activate Pyodide

    Pyodide->>Pyodide: isLoading = true
    Pyodide->>CDN: loadPyodide(indexURL)
    CDN-->>Pyodide: Pyodide runtime (WASM)

    Pyodide->>Pyodide: Expose JS functions to Python (motorRun, etc.)
    Pyodide->>Pyodide: Create hub.port module
    Pyodide->>Pyodide: Create motor module
    Pyodide->>Pyodide: Override sys.stdout/stderr

    Pyodide->>State: addLog("Pyodide initialized")
    Pyodide->>Pyodide: isReady = true
    Pyodide->>Pyodide: isLoading = false
    deactivate Pyodide

    App->>App: UI updates to "Ready"
    deactivate App
```

### Code Execution Lifecycle

```mermaid
sequenceDiagram
    title Code Execution Lifecycle
    actor User
    participant CodeInput as CodeInput.vue
    participant App as App.vue
    participant Pyodide as usePyodide
    participant Runtime as Pyodide Runtime
    participant Motor as Python motor module
    participant State as useRobotState
    participant Console as Console.vue

    User->>CodeInput: Enter Python code
    User->>CodeInput: Click "Run Code"
    CodeInput->>App: emit('run', code)

    App->>Pyodide: runCode(code)
    activate Pyodide

    Pyodide->>State: addLog("--- Running code ---")
    State->>Console: logs updated (reactive)
    Console->>Console: Auto-scroll

    Pyodide->>Runtime: runPythonAsync(code)
    activate Runtime

    Runtime->>Motor: motor.run(port.A, 1000)
    Motor->>State: _motor_run(0, 1000)
    State->>State: motors[0].velocity = 1000
    State->>State: motors[0].running = true
    State->>State: addLog("Motor A running...")
    State->>Console: logs updated (reactive)
    Console->>Console: Auto-scroll

    Runtime-->>Pyodide: execution complete
    deactivate Runtime

    Pyodide->>State: addLog("--- Code execution complete ---")
    State->>Console: logs updated (reactive)
    deactivate Pyodide
```

---

## Event Handling Logic

### Events Overview

| Event | Source | Handler | Action |
| :--- | :--- | :--- | :--- |
| Component mounted | Vue lifecycle | `App.onMounted()` | Initialize Pyodide |
| Run button click | `CodeInput.vue` | `App.handleRunCode()` | Execute Python code |
| Clear button click | `Console.vue` | `App.handleClearConsole()` | Clear log entries |
| Logs array change | `useRobotState` | `Console.watch()` | Auto-scroll to bottom |

### Event Flow Diagrams

#### Run Code Event

```mermaid
flowchart TD
    Start([Start]) --> UserClick["User clicks 'Run Code' button"]
    UserClick --> HandleRun["CodeInput.handleRun called"]
    HandleRun --> Emit["emit 'run', code.value"]
    Emit --> AppReceive["App receives @run event"]
    AppReceive --> AppHandle["App.handleRunCode(code) called"]
    AppHandle --> RunCode["usePyodide.runCode(code) called"]

    RunCode --> Ready{pyodide ready?}
    Ready -- Yes --> AddLog["addLog('--- Running code ---')"]
    AddLog --> Exec["pyodide.runPythonAsync(code)"]

    Exec --> Success{execution successful?}
    Success -- Yes --> CompleteLog["addLog('--- Code execution complete ---')"]
    Success -- No --> ErrorLog["addLog('Error: ' + message)"]

    Ready -- No --> NotReadyLog["addLog('Pyodide is not ready yet')"]

    CompleteLog --> Stop([Stop])
    ErrorLog --> Stop
    NotReadyLog --> Stop
```

#### Clear Console Event

```mermaid
flowchart TD
    Start([Start]) --> Click["User clicks 'Clear' button"]
    Click --> HandleClear["Console.handleClear called"]
    HandleClear --> Emit["emit 'clear'"]
    Emit --> AppReceive["App receives @clear event"]
    AppReceive --> AppHandle["App.handleClearConsole called"]
    AppHandle --> ClearLogs["useRobotState.clearLogs called"]
    ClearLogs --> Splice["state.logs.splice 0, length"]
    Splice --> Reactive["Console reactively updates"]
    Reactive --> Placeholder["Placeholder message shown"]
    Placeholder --> Stop(["Stop"])
```

#### Auto-Scroll Event

```mermaid
flowchart TD
    title Console Auto-Scroll Event Flow
    Start([Start]) --> LogAdded[Log entry added to state.logs]
    LogAdded --> Reactivity[Vue reactivity triggers watch]
    Reactivity --> Watch[watch detects logs.length change]
    Watch --> NextTick[await nextTick]
    NextTick --> DOMUpdate[Wait for DOM update]
    DOMUpdate --> GetRef[Get consoleRef.value]
    GetRef --> Scroll[Set scrollTop = scrollHeight]
    Scroll --> End([Console scrolls to bottom])
```

### Python-to-JavaScript Bridge Events

```mermaid
sequenceDiagram
    title Python-JavaScript Bridge
    participant Python as Python Code
    participant MotorPy as motor module (Python)
    participant Bridge as Pyodide Bridge
    participant MotorJS as _motor_run (JavaScript)
    participant State as useRobotState

    Python->>MotorPy: motor.run(port.A, 1000)
    MotorPy->>Bridge: _motor_run(0, 1000)
    Note over Bridge: JavaScript function exposed via globals.set()
    Bridge->>MotorJS: motorRun(0, 1000)
    MotorJS->>State: state.motors[0].velocity = 1000
    MotorJS->>State: state.motors[0].running = true
    MotorJS->>State: addLog("Motor A running at 1000 deg/sec")
```

### Vue Reactivity Flow

```
User Action
    │
    ▼
Event Handler (e.g., handleRunCode)
    │
    ▼
State Mutation (e.g., state.logs.push())
    │
    ▼
Vue Reactivity System detects change
    │
    ▼
Component re-renders (Console.vue)
    │
    ▼
DOM updated
    │
    ▼
watch() callbacks triggered (auto-scroll)
```
