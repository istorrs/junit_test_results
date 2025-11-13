<template>
  <div class="performance-view">
    <div class="page-header">
      <h1>Performance Trends</h1>
      <p class="subtitle">Track test execution times and detect performance regressions</p>
    </div>

    <!-- Filters -->
    <Card title="Filters">
      <div class="filters">
        <div class="filter-group">
          <label for="days">Time Range</label>
          <select id="days" v-model="filters.days" @change="loadData">
            <option :value="7">Last 7 Days</option>
            <option :value="14">Last 14 Days</option>
            <option :value="30">Last 30 Days</option>
            <option :value="60">Last 60 Days</option>
            <option :value="90">Last 90 Days</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="threshold">Regression Threshold</label>
          <select id="threshold" v-model="filters.threshold" @change="loadData">
            <option :value="10">10% slower</option>
            <option :value="20">20% slower</option>
            <option :value="30">30% slower</option>
            <option :value="50">50% slower</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="limit">Results Limit</label>
          <select id="limit" v-model="filters.limit" @change="loadData">
            <option :value="10">Top 10</option>
            <option :value="20">Top 20</option>
            <option :value="50">Top 50</option>
            <option :value="100">Top 100</option>
          </select>
        </div>
      </div>
    </Card>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading performance data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
    </div>

    <!-- Performance Data -->
    <div v-else class="performance-data">
      <!-- Overview Stats -->
      <div class="stats-grid">
        <Card title="Slowest Tests">
          <div class="stat-large">
            <div class="stat-value">{{ slowestTests.length }}</div>
            <div class="stat-label">Tests Analyzed</div>
          </div>
        </Card>

        <Card title="Regressions Detected">
          <div class="stat-large">
            <div class="stat-value regressions">{{ regressions.length }}</div>
            <div class="stat-label">{{ filters.threshold }}% Threshold</div>
          </div>
        </Card>
      </div>

      <!-- Tabs -->
      <Card>
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="tab-content">
          <!-- Slowest Tests Tab -->
          <div v-if="activeTab === 'slowest'" class="test-list">
            <div v-if="slowestTests.length === 0" class="empty-state">
              No test data available for the selected time range
            </div>
            <div v-else class="performance-table">
              <table>
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Class</th>
                    <th>Avg Time</th>
                    <th>Max Time</th>
                    <th>Min Time</th>
                    <th>P95 Time</th>
                    <th>Runs</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(test, index) in slowestTests" :key="index">
                    <td class="test-name">{{ test.test_name }}</td>
                    <td class="class-name">{{ test.class_name }}</td>
                    <td class="time-value">{{ formatDuration(test.avg_time) }}</td>
                    <td class="time-value">{{ formatDuration(test.max_time) }}</td>
                    <td class="time-value">{{ formatDuration(test.min_time) }}</td>
                    <td class="time-value">{{ formatDuration(test.p95_time) }}</td>
                    <td class="runs-count">{{ test.total_runs }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Performance Regressions Tab -->
          <div v-if="activeTab === 'regressions'" class="test-list">
            <div v-if="regressions.length === 0" class="empty-state">
              No performance regressions detected for the selected threshold
            </div>
            <div v-else class="performance-table">
              <table>
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Class</th>
                    <th>Baseline Avg</th>
                    <th>Recent Avg</th>
                    <th>Increase</th>
                    <th>% Change</th>
                    <th>Recent Runs</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(test, index) in regressions" :key="index">
                    <td class="test-name">{{ test.test_name }}</td>
                    <td class="class-name">{{ test.class_name }}</td>
                    <td class="time-value">{{ formatDuration(test.baseline_avg) }}</td>
                    <td class="time-value recent">{{ formatDuration(test.recent_avg) }}</td>
                    <td class="time-value increase">+{{ formatDuration(test.time_increase) }}</td>
                    <td class="percent-change">
                      <span class="badge badge-warning">+{{ test.percent_increase.toFixed(1) }}%</span>
                    </td>
                    <td class="runs-count">{{ test.recent_count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Trends Tab -->
          <div v-if="activeTab === 'trends'" class="trends-content">
            <div class="info-message">
              <p>
                <strong>Performance Trends Visualization</strong>
              </p>
              <p>
                Time-series charts showing test execution trends over time will be displayed here.
                This feature will include:
              </p>
              <ul>
                <li>Interactive line charts for individual test performance</li>
                <li>Aggregated trend views by test suite or class</li>
                <li>Configurable time granularity (hourly, daily, weekly)</li>
                <li>Anomaly detection and highlighting</li>
              </ul>
              <p>
                For now, you can view detailed performance data in the "Slowest Tests" and
                "Performance Regressions" tabs.
              </p>
            </div>

            <!-- Show recent trends data if available -->
            <div v-if="trends.length > 0" class="trends-list">
              <h3>Recent Performance Data Points</h3>
              <div class="trends-table">
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Avg Time</th>
                      <th>P50 Time</th>
                      <th>P95 Time</th>
                      <th>Total Runs</th>
                      <th>Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(trend, index) in trends" :key="index">
                      <td>{{ formatDate(trend.period) }}</td>
                      <td class="time-value">{{ formatDuration(trend.avg_time) }}</td>
                      <td class="time-value">{{ formatDuration(trend.p50_time) }}</td>
                      <td class="time-value">{{ formatDuration(trend.p95_time) }}</td>
                      <td>{{ trend.total_runs }}</td>
                      <td>{{ trend.pass_rate.toFixed(2) }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from '../components/shared/Card.vue'
import {
  apiClient,
  type SlowestTest,
  type PerformanceRegression,
  type PerformanceTrend,
} from '../api/client'

const loading = ref(false)
const error = ref<string>('')
const activeTab = ref('slowest')

const filters = ref({
  days: 30,
  threshold: 20,
  limit: 20,
})

const slowestTests = ref<SlowestTest[]>([])
const regressions = ref<PerformanceRegression[]>([])
const trends = ref<PerformanceTrend[]>([])

const tabs = [
  { id: 'slowest', label: 'Slowest Tests' },
  { id: 'regressions', label: 'Performance Regressions' },
  { id: 'trends', label: 'Trends Over Time' },
]

const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null || isNaN(seconds)) {
    return 'N/A'
  }
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`
  }
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return 'N/A'
  }
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return 'N/A'
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const loadData = async () => {
  loading.value = true
  error.value = ''

  try {
    // Load slowest tests
    const slowestResponse = await apiClient.getSlowestTests({
      limit: filters.value.limit,
      days: filters.value.days,
    })
    slowestTests.value = slowestResponse.slowest_tests

    // Load performance regressions
    const regressionsResponse = await apiClient.getPerformanceRegressions({
      days: filters.value.days,
      threshold_percent: filters.value.threshold,
    })
    regressions.value = regressionsResponse.regressions

    // Load trends data
    const trendsResponse = await apiClient.getPerformanceTrends({
      days: filters.value.days,
      granularity: 'daily',
    })
    trends.value = trendsResponse.trends.slice(0, 10) // Show last 10 data points
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load performance data'
    console.error('Error loading performance data:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.performance-view {
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

.filters {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 150px;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-group select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  font-size: 0.9375rem;
  background-color: var(--surface-color);
  color: var(--text-primary);
  cursor: pointer;
}

.filter-group select:focus {
  outline: none;
  border-color: var(--primary-color);
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

.performance-data {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.stat-large {
  text-align: center;
  padding: 1.5rem;
}

.stat-value {
  font-size: 3rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value.regressions {
  color: var(--warning-color);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
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
  min-height: 200px;
}

.performance-table {
  overflow-x: auto;
}

.performance-table table {
  width: 100%;
  border-collapse: collapse;
}

.performance-table th {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 2px solid var(--border-color);
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-transform: uppercase;
}

.performance-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.performance-table tbody tr:hover {
  background-color: var(--surface-color);
}

.test-name {
  font-weight: 500;
}

.class-name {
  font-family: monospace;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.time-value {
  font-family: monospace;
  text-align: right;
}

.time-value.recent {
  color: var(--warning-color);
  font-weight: 500;
}

.time-value.increase {
  color: var(--error-color);
  font-weight: 600;
}

.percent-change {
  text-align: center;
}

.runs-count {
  text-align: center;
  color: var(--text-secondary);
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-warning {
  background-color: rgba(251, 191, 36, 0.2);
  color: var(--warning-color);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.trends-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.info-message {
  padding: 1.5rem;
  background-color: rgba(59, 130, 246, 0.1);
  border-left: 4px solid var(--primary-color);
  border-radius: 0.375rem;
}

.info-message p {
  margin: 0.5rem 0;
  color: var(--text-primary);
}

.info-message strong {
  color: var(--primary-color);
}

.info-message ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.info-message li {
  margin: 0.5rem 0;
  color: var(--text-secondary);
}

.trends-list h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem;
}

.trends-table {
  overflow-x: auto;
}

.trends-table table {
  width: 100%;
  border-collapse: collapse;
}

.trends-table th {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 2px solid var(--border-color);
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.trends-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.trends-table tbody tr:hover {
  background-color: var(--surface-color);
}
</style>
