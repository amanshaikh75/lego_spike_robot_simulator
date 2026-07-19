<script setup>
import { ref } from 'vue'
import { applyConfig } from '../composables/useRobotState'
import { DEFAULT_CONFIG_JSON } from '../simulator/config'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

const configText = ref(JSON.stringify(DEFAULT_CONFIG_JSON, null, 2))
const status = ref(null) // { type: 'success' | 'error', message: string }
const fileInput = ref(null)

function handleApply() {
  try {
    const parsed = applyConfig(configText.value)
    status.value = {
      type: 'success',
      message: `Applied configuration${parsed.name ? `: ${parsed.name}` : ''}.`
    }
  } catch (e) {
    status.value = { type: 'error', message: e.message }
  }
}

function handleUploadClick() {
  fileInput.value?.click()
}

function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    configText.value = String(reader.result)
    status.value = { type: 'success', message: `Loaded ${file.name}. Click Apply to use it.` }
  }
  reader.onerror = () => {
    status.value = { type: 'error', message: `Could not read ${file.name}.` }
  }
  reader.readAsText(file)
  // Reset so selecting the same file again re-triggers change.
  event.target.value = ''
}
</script>

<template>
  <div class="config-editor">
    <div class="config-header">
      <h3>Robot Configuration</h3>
      <div class="config-actions">
        <button class="secondary" :disabled="disabled" @click="handleUploadClick">Upload</button>
        <button :disabled="disabled" @click="handleApply">Apply</button>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          class="hidden-file"
          @change="handleFileChange"
        />
      </div>
    </div>

    <textarea
      v-model="configText"
      :disabled="disabled"
      spellcheck="false"
      placeholder="Paste robot configuration JSON here..."
    ></textarea>

    <p v-if="status" :class="['status-msg', status.type]">{{ status.message }}</p>
  </div>
</template>

<style scoped>
.config-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  color: #333;
}

.config-actions {
  display: flex;
  gap: 8px;
}

button {
  padding: 6px 14px;
  font-size: 13px;
  background-color: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button.secondary {
  background-color: #666;
}

button:hover:not(:disabled) {
  background-color: #005a9e;
}

button.secondary:hover:not(:disabled) {
  background-color: #555;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.hidden-file {
  display: none;
}

textarea {
  width: 100%;
  height: 160px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
  background-color: #1e1e1e;
  color: #d4d4d4;
  line-height: 1.5;
}

textarea:focus {
  outline: none;
  border-color: #007acc;
}

textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-msg {
  margin: 0;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.status-msg.success {
  background-color: #d4edda;
  color: #155724;
}

.status-msg.error {
  background-color: #f8d7da;
  color: #721c24;
}
</style>
