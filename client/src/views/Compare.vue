<template>
  <div class="compare-view">
    <div class="page-header">
      <h1>Compare Test Runs</h1>
      <p class="subtitle">Compare two test runs side-by-side to identify changes</p>
    </div>

    <!-- Run Selector -->
    <Card title="Select Test Runs to Compare">
      <div class="run-selector">
        <div class="selector-group">
          <label for="run1">Test Run 1 (Baseline)</label>
          <select id="run1" v-model="selectedRun1" class="run-select">
            <option value="">Select a test run...</option>
            <option v-for="run in runs" :key="run.id" :value="run.id">
              {{ run.name }} - {{ formatDate(run.timestamp) }}
            </option>
          </select>
        </div>

        <div class="selector-group">
          <label for="run2">Test Run 2 (Current)</label>
          <select id="run2" v-model="selectedRun2" class="run-select">
            <option value="">Select a test run...</option>
            <option v-for="run in runs" :key="run.id" :value="run.id">
              {{ run.name }} - {{ formatDate(run.timestamp) }}
            </option>
          </select>
        </div>

        <button
          class="compare-button"
          :disabled="!canCompare || loading"
          @click="compareRuns"
        >
          {{ loading ? 'Comparing...' : 'Compare' }}
        </button>
      </div>
    </Card>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading comparison...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
    </div>

    <!-- Comparison Results -->
    <div v-else-if="comparison" class="comparison-results">
      <!-- Run Summaries -->
      <div class="runs-grid">
        <Card title="Test Run 1 (Baseline)">
          <div class="run-summary">
            <div class="summary-item">
              <span class="label">Run ID:</span>
              <span class="value">{{ comparison.run1.id }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Timestamp:</span>
              <span class="value">{{ formatDate(comparison.run1.timestamp) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Tests:</span>
              <span class="value">{{ comparison.run1.tests }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Failures:</span>
              <span class="value failures">{{ comparison.run1.failures }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Pass Rate:</span>
              <span class="value">{{ comparison.run1.pass_rate.toFixed(2) }}%</span>
            </div>
            <div class="summary-item">
              <span class="label">Duration:</span>
              <span class="value">{{ formatDuration(comparison.run1.time) }}</span>
            </div>
          </div>
        </Card>

        <Card title="Test Run 2 (Current)">
          <div class="run-summary">
            <div class="summary-item">
              <span class="label">Run ID:</span>
              <span class="value">{{ comparison.run2.id }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Timestamp:</span>
              <span class="value">{{ formatDate(comparison.run2.timestamp) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Tests:</span>
              <span class="value">{{ comparison.run2.tests }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Failures:</span>
              <span class="value failures">{{ comparison.run2.failures }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Pass Rate:</span>
              <span class="value">{{ comparison.run2.pass_rate.toFixed(2) }}%</span>
            </div>
            <div class="summary-item">
              <span class="label">Duration:</span>
              <span class="value">{{ formatDuration(comparison.run2.time) }}</span>
            </div>
          </div>
        </Card>
      </div>

      <!-- Comparison Summary -->
      <Card title="Comparison Summary">
        <div class="summary-grid">
          <div class="summary-stat">
            <div class="stat-value">{{ comparison.summary.total_tests_compared }}</div>
            <div class="stat-label">Tests Compared</div>
          </div>
          <div class="summary-stat new-failures">
            <div class="stat-value">{{ comparison.summary.new_failures_count }}</div>
            <div class="stat-label">New Failures</div>
          </div>
          <div class="summary-stat fixed">
            <div class="stat-value">{{ comparison.summary.fixed_tests_count }}</div>
            <div class="stat-label">Fixed Tests</div>
          </div>
          <div class="summary-stat">
            <div class="stat-value">{{ comparison.summary.still_failing_count }}</div>
            <div class="stat-label">Still Failing</div>
          </div>
          <div class="summary-stat">
            <div class="stat-value">{{ comparison.summary.status_changes_count }}</div>
            <div class="stat-label">Status Changes</div>
          </div>
          <div class="summary-stat">
            <div class="stat-value">{{ comparison.summary.performance_changes_count }}</div>
            <div class="stat-label">Performance Changes</div>
          </div>
        </div>
      </Card>

      <!-- Detailed Tabs -->
      <Card>
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }} ({{ getTabCount(tab.id) }})
          </button>
        </div>

        <div class="tab-content">
          <!-- New Failures -->
          <div v-if="activeTab === 'new-failures'" class="test-list">
            <div v-if="comparison.details.new_failures.length === 0" class="empty-state">
              No new failures
            </div>
            <div v-else v-for="test in comparison.details.new_failures" :key="test.test_id" class="test-item clickable" @click="openTestModal(test)">
              <div class="test-header">
                <span class="test-name">{{ test.test_name }}</span>
                <span class="badge badge-error">{{ test.status_after }}</span>
              </div>
              <div class="test-details">
                <span class="class-name">{{ test.class_name }}</span>
              </div>
              <div v-if="test.error_message" class="error-message">
                {{ test.error_message }}
              </div>
            </div>
          </div>

          <!-- Fixed Tests -->
          <div v-if="activeTab === 'fixed-tests'" class="test-list">
            <div v-if="comparison.details.fixed_tests.length === 0" class="empty-state">
              No fixed tests
            </div>
            <div v-else v-for="test in comparison.details.fixed_tests" :key="test.test_id" class="test-item clickable" @click="openTestModal(test)">
              <div class="test-header">
                <span class="test-name">{{ test.test_name }}</span>
                <span class="badge badge-success">Fixed</span>
              </div>
              <div class="test-details">
                <span class="class-name">{{ test.class_name }}</span>
                <span class="status-change">{{ test.status_before }} → {{ test.status_after }}</span>
              </div>
            </div>
          </div>

          <!-- Still Failing -->
          <div v-if="activeTab === 'still-failing'" class="test-list">
            <div v-if="comparison.details.still_failing.length === 0" class="empty-state">
              No tests still failing
            </div>
            <div v-else v-for="test in comparison.details.still_failing" :key="test.test_id" class="test-item clickable" @click="openTestModal(test)">
              <div class="test-header">
                <span class="test-name">{{ test.test_name }}</span>
                <span class="badge badge-error">{{ test.status_after }}</span>
              </div>
              <div class="test-details">
                <span class="class-name">{{ test.class_name }}</span>
              </div>
            </div>
          </div>

          <!-- Performance Changes -->
          <div v-if="activeTab === 'performance'" class="test-list">
            <div v-if="comparison.details.performance_changes.length === 0" class="empty-state">
              No significant performance changes
            </div>
            <div v-else v-for="test in comparison.details.performance_changes" :key="test.test_id" class="test-item clickable" @click="openTestModal(test)">
              <div class="test-header">
                <span class="test-name">{{ test.test_name }}</span>
                <span
                  class="badge"
                  :class="test.time_diff_percent && test.time_diff_percent > 0 ? 'badge-warning' : 'badge-success'"
                >
                  {{ test.time_diff_percent && test.time_diff_percent > 0 ? 'Slower' : 'Faster' }}
                </span>
              </div>
              <div class="test-details">
                <span class="class-name">{{ test.class_name }}</span>
                <span class="time-change">
                  {{ formatDuration(test.time_before || 0) }} → {{ formatDuration(test.time_after || 0) }}
                  ({{ test.time_diff_percent ? (test.time_diff_percent > 0 ? '+' : '') + test.time_diff_percent.toFixed(1) : '0' }}%)
                </span>
              </div>
            </div>
          </div>

          <!-- New Tests -->
          <div v-if="activeTab === 'new-tests'" class="test-list">
            <div v-if="comparison.details.new_tests.length === 0" class="empty-state">
              No new tests
            </div>
            <div v-else v-for="test in comparison.details.new_tests" :key="test.test_id" class="test-item clickable" @click="openTestModal(test)">
              <div class="test-header">
                <span class="test-name">{{ test.test_name }}</span>
                <span class="badge badge-info">New</span>
              </div>
              <div class="test-details">
                <span class="class-name">{{ test.class_name }}</span>
              </div>
            </div>
          </div>

          <!-- Removed Tests -->
          <div v-if="activeTab === 'removed-tests'" class="test-list">
            <div v-if="comparison.details.removed_tests.length === 0" class="empty-state">
              No removed tests
            </div>
            <div v-else v-for="test in comparison.details.removed_tests" :key="test.test_id" class="test-item clickable" @click="openTestModal(test)">
              <div class="test-header">
                <span class="test-name">{{ test.test_name }}</span>
                <span class="badge badge-secondary">Removed</span>
              </div>
              <div class="test-details">
                <span class="class-name">{{ test.class_name }}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Test Details Modal -->
    <TestDetailsModal
      v-if="selectedTest"
      :open="modalOpen"
      :test-id="selectedTest.test_id"
      :test-name="selectedTest.test_name"
      @close="closeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from '../components/shared/Card.vue'
import TestDetailsModal from '../components/modals/TestDetailsModal.vue'
import { apiClient, type TestRun, type RunComparisonResponse } from '../api/client'

const runs = ref<TestRun[]>([])
const selectedRun1 = ref<string>('')
const selectedRun2 = ref<string>('')
const comparison = ref<RunComparisonResponse | null>(null)
const loading = ref(false)
const error = ref<string>('')
const activeTab = ref('new-failures')
const modalOpen = ref(false)
const selectedTest = ref<any>(null)

const tabs = [
  { id: 'new-failures', label: 'New Failures' },
  { id: 'fixed-tests', label: 'Fixed Tests' },
  { id: 'still-failing', label: 'Still Failing' },
  { id: 'performance', label: 'Performance Changes' },
  { id: 'new-tests', label: 'New Tests' },
  { id: 'removed-tests', label: 'Removed Tests' },
]

const canCompare = computed(() => {
  return selectedRun1.value && selectedRun2.value && selectedRun1.value !== selectedRun2.value
})

const getTabCount = (tabId: string): number => {
  if (!comparison.value) return 0

  switch (tabId) {
    case 'new-failures': return comparison.value.details.new_failures.length
    case 'fixed-tests': return comparison.value.details.fixed_tests.length
    case 'still-failing': return comparison.value.details.still_failing.length
    case 'performance': return comparison.value.details.performance_changes.length
    case 'new-tests': return comparison.value.details.new_tests.length
    case 'removed-tests': return comparison.value.details.removed_tests.length
    default: return 0
  }
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`
}

const openTestModal = (test: any) => {
  selectedTest.value = test
  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
  selectedTest.value = null
}

const compareRuns = async () => {
  if (!canCompare.value) return

  loading.value = true
  error.value = ''
  comparison.value = null

  try {
    const result = await apiClient.compareRuns(selectedRun1.value, selectedRun2.value)
    comparison.value = result
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to compare test runs'
    console.error('Error comparing runs:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const response = await apiClient.getRuns({ limit: 100 })
    runs.value = response.runs
  } catch (err) {
    error.value = 'Failed to load test runs'
    console.error('Error loading runs:', err)
  }
})
</script>

<style scoped>
.compare-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.run-selector {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.selector-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selector-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.run-select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  font-size: 0.9375rem;
  background-color: var(--surface-color);
  color: var(--text-primary);
  cursor: pointer;
}

.run-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.compare-button {
  padding: 0.75rem 2rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.compare-button:hover:not(:disabled) {
  background-color: var(--primary-hover);
}

.compare-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  text-align: center;
  padding: 2rem;
}

.error-message {
  color: var(--error-color);
}

.comparison-results {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.runs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.run-summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.summary-item .label {
  font-weight: 500;
  color: var(--text-secondary);
}

.summary-item .value {
  color: var(--text-primary);
}

.summary-item .failures {
  color: var(--error-color);
  font-weight: 500;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
}

.summary-stat {
  text-align: center;
  padding: 1rem;
  border-radius: 0.375rem;
  background-color: var(--surface-color);
}

.summary-stat.new-failures {
  background-color: rgba(239, 68, 68, 0.1);
}

.summary-stat.fixed {
  background-color: rgba(34, 197, 94, 0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid var(--border-color);
  margin-bottom: 1.5rem;
}

.tab {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.test-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.test-item {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background-color: var(--surface-color);
}

.test-item.clickable {
  cursor: pointer;
  transition: all 0.2s;
}

.test-item.clickable:hover {
  background-color: var(--hover-bg);
  border-color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.test-name {
  font-weight: 500;
  color: var(--text-primary);
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-error {
  background-color: rgba(239, 68, 68, 0.2);
  color: var(--error-color);
}

.badge-success {
  background-color: rgba(34, 197, 94, 0.2);
  color: var(--success-color);
}

.badge-warning {
  background-color: rgba(251, 191, 36, 0.2);
  color: var(--warning-color);
}

.badge-info {
  background-color: rgba(59, 130, 246, 0.2);
  color: var(--primary-color);
}

.badge-secondary {
  background-color: rgba(107, 114, 128, 0.2);
  color: var(--text-secondary);
}

.test-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.class-name {
  font-family: monospace;
}

.status-change,
.time-change {
  font-weight: 500;
  color: var(--text-primary);
}

.error-message {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: rgba(239, 68, 68, 0.1);
  border-left: 3px solid var(--error-color);
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}
</style>
