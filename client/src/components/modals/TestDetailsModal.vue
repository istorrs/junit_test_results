<template>
  <Modal :open="open" @close="handleClose" size="xl">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-semibold truncate">{{ testName }}</h2>
          <p class="text-sm text-secondary mt-1">{{ className || 'Unknown suite' }}</p>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <span :class="['badge', statusClass]">
            {{ status }}
          </span>
          <FlakinessIndicator
            v-if="flakinessData"
            :pass-rate="flakinessData.pass_rate"
            :recent-runs="flakinessData.total_runs"
            :failure-count="flakinessData.recent_failures"
          />
        </div>
      </div>
    </template>

    <div class="tabs-container">
      <div class="tabs-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading test details...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <p class="error-message">{{ error }}</p>
        </div>

        <div v-else>
          <!-- Overview Tab -->
          <div v-show="activeTab === 'overview'" class="tab-panel">
            <div class="info-grid">
              <div class="info-item">
                <label>Status</label>
                <span :class="['value', statusClass]">{{ status }}</span>
              </div>
              <div class="info-item">
                <label>Duration</label>
                <span class="value">{{ duration ? formatDuration(duration * 1000) : 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label>Last Run</label>
                <span class="value">{{ lastRun ? formatDate(lastRun) : 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label>Test Suite</label>
                <span class="value">{{ className || 'N/A' }}</span>
              </div>
            </div>

            <div v-if="flakinessData" class="flakiness-summary">
              <h3>Stability</h3>
              <div class="stability-stats">
                <div class="stat">
                  <span class="stat-value">{{ flakinessData.pass_rate }}%</span>
                  <span class="stat-label">Pass Rate</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ flakinessData.total_runs }}</span>
                  <span class="stat-label">Total Runs</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ flakinessData.recent_failures }}</span>
                  <span class="stat-label">Recent Failures</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Failure Details Tab -->
          <div v-show="activeTab === 'failure'" class="tab-panel">
            <div v-if="errorMessage || errorType || stackTrace" class="failure-details">
              <div class="error-header">
                <h3>Error Information</h3>
                <span v-if="errorType" class="error-type-badge">{{ errorType }}</span>
              </div>

              <div v-if="errorMessage" class="error-message-box">
                <h4>Error Message</h4>
                <pre>{{ errorMessage }}</pre>
              </div>

              <div v-if="stackTrace" class="stack-trace-section">
                <h4>Stack Trace</h4>
                <ErrorStackTrace :stack-trace="stackTrace" :collapsible="true" />
              </div>
            </div>
            <div v-else class="empty-state">
              <p>No failure details available - test passed or no error data recorded</p>
            </div>
          </div>

          <!-- History Tab -->
          <div v-show="activeTab === 'history'" class="tab-panel">
            <div v-if="historyData && historyData.length > 0" class="history-section">
              <h3>Test Execution History (Last {{ historyData.length }} Runs)</h3>
              <div class="history-chart">
                <HistoryChart ref="historyChartRef" :data="historyData" />
              </div>

              <div class="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Run ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="run in historyData.slice(0, 10)" :key="run.run_id">
                      <td>{{ formatDate(run.timestamp) }}</td>
                      <td>
                        <span :class="['status-badge', run.status]">{{ run.status }}</span>
                      </td>
                      <td>{{ formatDuration(run.time * 1000) }}</td>
                      <td class="run-id">{{ run.run_id.slice(0, 8) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>No historical data available</p>
            </div>
          </div>

          <!-- System Output Tab -->
          <div v-show="activeTab === 'system-out'" class="tab-panel">
            <div class="output-section">
              <div class="output-header">
                <h3>System Output (stdout)</h3>
                <button @click="copyToClipboard(systemOut || '', 'System output')" class="copy-button">
                  <span class="copy-icon">📋</span>
                  Copy to Clipboard
                </button>
              </div>
              <pre class="output-content">{{ systemOut }}</pre>
            </div>
          </div>

          <!-- System Error Tab -->
          <div v-show="activeTab === 'system-err'" class="tab-panel">
            <div class="output-section error-output">
              <div class="output-header">
                <h3>System Error (stderr)</h3>
                <button @click="copyToClipboard(systemErr || '', 'System error')" class="copy-button">
                  <span class="copy-icon">📋</span>
                  Copy to Clipboard
                </button>
              </div>
              <pre class="output-content">{{ systemErr }}</pre>
            </div>
          </div>

          <!-- Metadata Tab -->
          <div v-show="activeTab === 'metadata'" class="tab-panel">
            <div class="metadata-section">
              <h3>Test Metadata</h3>
              <div class="metadata-grid">
                <div class="metadata-item">
                  <label>Test Name</label>
                  <span class="code-value">{{ testName }}</span>
                </div>
                <div class="metadata-item">
                  <label>Class/Suite</label>
                  <span class="code-value">{{ className || 'N/A' }}</span>
                </div>
                <div v-if="ciMetadata" class="metadata-item">
                  <label>Build Number</label>
                  <span class="code-value">{{ ciMetadata.build_number || 'N/A' }}</span>
                </div>
                <div v-if="ciMetadata" class="metadata-item">
                  <label>Branch</label>
                  <span class="code-value">{{ ciMetadata.branch || 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <Button variant="secondary" @click="handleClose">Close</Button>
        <Button v-if="errorMessage" @click="copyErrorToClipboard">
          Copy Error
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import Modal from '../shared/Modal.vue'
import Button from '../shared/Button.vue'
import FlakinessIndicator from '../shared/FlakinessIndicator.vue'
import ErrorStackTrace from '../shared/ErrorStackTrace.vue'
import HistoryChart from '../charts/HistoryChart.vue'
import { formatDate, formatDuration } from '../../utils/formatters'
import { apiClient } from '../../api/client'

interface Props {
  open: boolean
  testId: string
  testName: string
  status: string
  duration?: number
  errorMessage?: string
  errorType?: string
  stackTrace?: string
  className?: string
  lastRun?: string
  ciMetadata?: Record<string, any>
  systemOut?: string
  systemErr?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const activeTab = ref('overview')
const loading = ref(false)
const error = ref<string | null>(null)
const historyChartRef = ref<InstanceType<typeof HistoryChart> | null>(null)

// Data from API
const flakinessData = ref<any>(null)
const historyData = ref<any[]>([])

const tabs = computed(() => {
  console.log('Computing tabs - systemOut:', !!props.systemOut, 'systemErr:', !!props.systemErr)
  const baseTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'failure', label: 'Failure Details' },
    { id: 'history', label: 'History' }
  ]

  // Add System Output tab if data exists
  if (props.systemOut) {
    console.log('Adding System Output tab, length:', props.systemOut.length)
    baseTabs.push({ id: 'system-out', label: 'System Output' })
  }

  // Add System Error tab if data exists
  if (props.systemErr) {
    console.log('Adding System Error tab, length:', props.systemErr.length)
    baseTabs.push({ id: 'system-err', label: 'System Error' })
  }

  // Always show metadata last
  baseTabs.push({ id: 'metadata', label: 'Metadata' })

  console.log('Final tabs:', baseTabs.map(t => t.label))
  return baseTabs
})

const statusClass = computed(() => {
  const status = props.status?.toLowerCase()
  if (status === 'passed') return 'status-passed'
  if (status === 'failed') return 'status-failed'
  if (status === 'error') return 'status-error'
  return 'status-skipped'
})

// Fetch additional data when modal opens
watch(() => props.open, async (isOpen) => {
  if (isOpen && props.testId) {
    await loadTestDetails()
  }
})

// Resize chart when History tab becomes active
watch(activeTab, async (newTab) => {
  if (newTab === 'history') {
    await nextTick()
    historyChartRef.value?.resize()
  }
})

const loadTestDetails = async () => {
  loading.value = true
  error.value = null

  try {
    // Load flakiness data and history in parallel
    const [flakiness, history] = await Promise.all([
      apiClient.getTestFlakiness(props.testId).catch(() => null),
      apiClient.getTestHistory(props.testId).catch(() => ({ runs: [] }))
    ])

    flakinessData.value = flakiness
    historyData.value = history.runs || []
  } catch (err) {
    error.value = 'Failed to load test details'
    console.error('Error loading test details:', err)
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  emit('close')
  // Reset to overview tab when closing
  activeTab.value = 'overview'
}

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text).then(() => {
    // Could add a toast notification here
    console.log(`${label} copied to clipboard`)
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err)
  })
}

const copyErrorToClipboard = () => {
  const text = [
    `Test: ${props.testName}`,
    `Status: ${props.status}`,
    props.errorType && `Error Type: ${props.errorType}`,
    props.errorMessage && `\nError Message:\n${props.errorMessage}`,
    props.stackTrace && `\nStack Trace:\n${props.stackTrace}`,
    props.systemOut && `\nSystem Output:\n${props.systemOut}`,
    props.systemErr && `\nSystem Error:\n${props.systemErr}`
  ].filter(Boolean).join('\n')

  navigator.clipboard.writeText(text)
}
</script>

<style scoped>
.tabs-container {
  display: flex;
  flex-direction: column;
  min-height: 500px;
}

.tabs-nav {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  gap: 0.5rem;
  padding: 0 1rem;
  background: var(--bg-secondary);
}

.tab-button {
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.tab-panel {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--text-secondary);
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.info-item .value {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-passed {
  background: var(--success-bg);
  color: var(--success-color);
}

.status-failed {
  background: var(--error-bg);
  color: var(--error-color);
}

.status-error {
  background: var(--warning-bg);
  color: var(--warning-color);
}

.status-skipped {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.flakiness-summary {
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.flakiness-summary h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.stability-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.failure-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.error-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.error-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.error-type-badge {
  padding: 0.25rem 0.75rem;
  background: var(--error-bg);
  color: var(--error-color);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: monospace;
}

.error-message-box {
  padding: 1rem;
  background: var(--bg-secondary);
  border-left: 4px solid var(--error-color);
  border-radius: 0.25rem;
}

.error-message-box h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.error-message-box pre {
  font-family: monospace;
  font-size: 0.875rem;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.stack-trace-section h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.output-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.output-section.error-output .output-content {
  border-left-color: var(--error-color);
}

.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.output-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.copy-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-button:hover {
  background: var(--bg-hover);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.copy-icon {
  font-size: 1rem;
}

.output-content {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-left: 4px solid var(--primary-color);
  border-radius: 0.375rem;
  max-height: calc(100vh - 400px);
  min-height: 300px;
  overflow-y: auto;
}

.history-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.history-chart {
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.history-table {
  overflow-x: auto;
}

.history-table table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th {
  text-align: left;
  padding: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.history-table td {
  padding: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

.history-table .status-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.history-table .run-id {
  font-family: monospace;
  color: var(--text-secondary);
}

.metadata-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metadata-item label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.code-value {
  font-family: monospace;
  font-size: 0.875rem;
  color: var(--text-primary);
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 0.25rem;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
</style>
