<script setup>
import { onMounted } from 'vue'
import CodeInput from './components/CodeInput.vue'
import Console from './components/Console.vue'
import ConfigEditor from './components/ConfigEditor.vue'
import Dashboard from './components/Dashboard.vue'
import FieldView from './components/FieldView.vue'
import { useRobotState } from './composables/useRobotState'
import { usePyodide } from './composables/usePyodide'

const { state, clearLogs, resetState } = useRobotState()
const { isLoading, isReady, initPyodide, runCode } = usePyodide()

onMounted(() => {
  initPyodide()
})

async function handleRunCode(code) {
  await runCode(code)
}

function handleClearConsole() {
  clearLogs()
}

function handleReset() {
  resetState()
}
</script>

<template>
  <div class="app">
    <header>
      <h1>Lego Spike Prime Simulator</h1>
      <span v-if="isLoading" class="status loading">Loading Pyodide...</span>
      <span v-else-if="isReady" class="status ready">Ready</span>
      <span v-else class="status error">Error</span>
      <button class="reset-btn" :disabled="!isReady" @click="handleReset">Reset Robot</button>
    </header>

    <main>
      <div class="panel code-panel">
        <CodeInput :disabled="!isReady" @run="handleRunCode" />
      </div>

      <div class="panel console-panel">
        <Console :logs="state.logs" @clear="handleClearConsole" />
      </div>

      <div class="panel field-panel">
        <FieldView :state="state" />
      </div>

      <div class="panel dashboard-panel">
        <Dashboard :state="state" />
      </div>

      <div class="panel config-panel">
        <ConfigEditor :disabled="!isReady" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ddd;
}

h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status.loading {
  background-color: #fff3cd;
  color: #856404;
}

.status.ready {
  background-color: #d4edda;
  color: #155724;
}

.status.error {
  background-color: #f8d7da;
  color: #721c24;
}

.reset-btn {
  margin-left: auto;
  padding: 6px 14px;
  font-size: 13px;
  background-color: #666;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.reset-btn:hover:not(:disabled) {
  background-color: #555;
}

.reset-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.panel {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.field-panel,
.dashboard-panel,
.config-panel {
  grid-column: 1 / -1;
}

@media (max-width: 800px) {
  main {
    grid-template-columns: 1fr;
  }
}
</style>
