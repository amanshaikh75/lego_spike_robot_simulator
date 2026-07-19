<script setup>
import { computed } from 'vue'
import { PORTS, PAIRS } from '../composables/useRobotState'

const props = defineProps({
  state: {
    type: Object,
    required: true
  }
})

// Stable, display-ordered lists of port/pair entries ([name, value]).
const portEntries = Object.entries(PORTS)
const pairEntries = Object.entries(PAIRS)

function portName(value) {
  return Object.keys(PORTS).find((key) => PORTS[key] === value)
}

// Round for display without showing noisy floating-point tails.
function round(value, decimals = 0) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

// Heading in degrees, clockwise-positive, normalized to (-180, 180].
const headingDeg = computed(() => {
  let d = ((props.state.yaw % 360) + 360) % 360
  if (d > 180) d -= 360
  return round(d, 1)
})

// Yaw as reported by motion_sensor.tilt_angles(): decidegrees, (-1800, 1800].
const yawDecidegrees = computed(() => {
  let d = ((Math.round(props.state.yaw * 10) % 3600) + 3600) % 3600
  if (d > 1800) d -= 3600
  return d
})
</script>

<template>
  <div class="dashboard">
    <h3>Robot Dashboard</h3>

    <div class="dashboard-grid">
      <!-- Orientation / position -->
      <section class="card">
        <h4>Orientation &amp; Position</h4>
        <dl class="kv">
          <dt>Yaw (heading)</dt>
          <dd>{{ headingDeg }}&deg;</dd>
          <dt>Yaw (decidegrees)</dt>
          <dd>{{ yawDecidegrees }}</dd>
          <dt>Pitch / Roll</dt>
          <dd>0&deg; / 0&deg;</dd>
          <dt>Position (x, y)</dt>
          <dd>{{ round(state.position.x) }}, {{ round(state.position.y) }} mm</dd>
        </dl>
      </section>

      <!-- Motor pairs -->
      <section class="card">
        <h4>Motor Pairs</h4>
        <table>
          <thead>
            <tr><th>Pair</th><th>Left</th><th>Right</th></tr>
          </thead>
          <tbody>
            <tr v-for="[name, value] in pairEntries" :key="name">
              <td>{{ name }}</td>
              <td>{{ state.motorPairs[value] ? portName(state.motorPairs[value].left) : '—' }}</td>
              <td>{{ state.motorPairs[value] ? portName(state.motorPairs[value].right) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Motors -->
      <section class="card wide">
        <h4>Motors</h4>
        <table>
          <thead>
            <tr>
              <th>Port</th>
              <th>Velocity</th>
              <th>Abs&nbsp;pos</th>
              <th>Rel&nbsp;pos</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[name, value] in portEntries" :key="name">
              <td>{{ name }}</td>
              <td>{{ round(state.motors[value].velocity) }}</td>
              <td>{{ round(state.motors[value].absolutePosition) }}&deg;</td>
              <td>{{ round(state.motors[value].relativePosition) }}&deg;</td>
              <td>
                <span :class="['badge', state.motors[value].running ? 'running' : 'idle']">
                  {{ state.motors[value].running ? 'running' : 'idle' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h3 {
  margin: 0;
  color: #333;
}

h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #555;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.card {
  background-color: #fff;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
}

.card.wide {
  grid-column: 1 / -1;
}

.kv {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin: 0;
  font-size: 13px;
}

.kv dt {
  color: #777;
}

.kv dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th, td {
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
}

th {
  color: #777;
  font-weight: 600;
}

td {
  font-variant-numeric: tabular-nums;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-family: system-ui, sans-serif;
}

.badge.running {
  background-color: #d4edda;
  color: #155724;
}

.badge.idle {
  background-color: #e9ecef;
  color: #6c757d;
}

@media (max-width: 800px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
