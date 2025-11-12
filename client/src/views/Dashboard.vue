<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <Button @click="refreshData" :loading="store.loading">
        Refresh
      </Button>
    </div>

    <div v-if="store.loading && !store.stats" class="loading">
      <div class="loading-spinner"></div>
      Loading dashboard...
    </div>

    <div v-else-if="store.error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Failed to load dashboard</h3>
      <p>{{ store.error }}</p>
      <Button @click="refreshData">Try Again</Button>
    </div>

    <div v-else-if="store.stats" class="dashboard-content">
      <!-- Stats Grid -->
      <div class="stats-grid">
        <Card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon runs">📊</div>
            <div class="stat-details">
              <div class="stat-label">Total Runs</div>
              <div class="stat-value">{{ formatNumber(store.stats.total_runs) }}</div>
            </div>
          </div>
        </Card>

        <Card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon tests">🧪</div>
            <div class="stat-details">
              <div class="stat-label">Total Tests</div>
              <div class="stat-value">{{ formatNumber(store.stats.total_tests) }}</div>
            </div>
          </div>
        </Card>

        <Card class="stat-card success">
          <div class="stat-content">
            <div class="stat-icon">✓</div>
            <div class="stat-details">
              <div class="stat-label">Success Rate</div>
              <div class="stat-value success-rate">{{ store.stats.success_rate }}%</div>
            </div>
          </div>
        </Card>

        <Card class="stat-card passed">
          <div class="stat-content">
            <div class="stat-icon">✓</div>
            <div class="stat-details">
              <div class="stat-label">Passed</div>
              <div class="stat-value">{{ formatNumber(store.stats.total_passed) }}</div>
            </div>
          </div>
        </Card>

        <Card class="stat-card failed">
          <div class="stat-content">
            <div class="stat-icon">✗</div>
            <div class="stat-details">
              <div class="stat-label">Failed</div>
              <div class="stat-value">{{ formatNumber(store.stats.total_failed) }}</div>
            </div>
          </div>
        </Card>

        <Card class="stat-card error">
          <div class="stat-content">
            <div class="stat-icon">⚠</div>
            <div class="stat-details">
              <div class="stat-label">Errors</div>
              <div class="stat-value">{{ formatNumber(store.stats.total_errors) }}</div>
            </div>
          </div>
        </Card>

        <Card class="stat-card skipped">
          <div class="stat-content">
            <div class="stat-icon">⊘</div>
            <div class="stat-details">
              <div class="stat-label">Skipped</div>
              <div class="stat-value">{{ formatNumber(store.stats.total_skipped) }}</div>
            </div>
          </div>
        </Card>

        <Card v-if="store.stats.average_duration" class="stat-card duration">
          <div class="stat-content">
            <div class="stat-icon">⏱️</div>
            <div class="stat-details">
              <div class="stat-label">Avg Duration</div>
              <div class="stat-value">{{ formatDuration(store.stats.average_duration * 1000) }}</div>
            </div>
          </div>
        </Card>
      </div>

      <!-- Charts and Widgets Row -->
      <div class="charts-grid">
        <Card title="Test Results Distribution" class="chart-card">
          <PieChart
            :data="testResultsChartData"
            height="350px"
          />
        </Card>

        <Card title="Recent Test Runs" class="chart-card">
          <LineChart
            v-if="recentRunsData.xAxisData.length > 0"
            :x-axis-data="recentRunsData.xAxisData"
            :series="recentRunsData.series"
            height="350px"
          />
          <div v-else class="no-data">
            <p>No recent test run data available</p>
            <Button size="sm" @click="$router.push('/upload')">Upload Results</Button>
          </div>
        </Card>

        <FlakyTestsWidget
          :limit="5"
          class="chart-card"
        />
      </div>

      <!-- Insights Panel (Full Width) -->
      <FailurePatternsSummary
        :days="7"
        :limit="5"
        :show-time-range="true"
      />

      <!-- Quick Actions -->
      <Card title="Quick Actions" class="actions-card">
        <div class="actions-grid">
          <button class="action-btn" @click="$router.push('/upload')">
            <span class="action-icon">📤</span>
            <span class="action-label">Upload Results</span>
          </button>
          <button class="action-btn" @click="$router.push('/runs')">
            <span class="action-icon">📊</span>
            <span class="action-label">View Test Runs</span>
          </button>
          <button class="action-btn" @click="$router.push('/cases')">
            <span class="action-icon">🧪</span>
            <span class="action-label">View Test Cases</span>
          </button>
          <button class="action-btn" @click="refreshData">
            <span class="action-icon">🔄</span>
            <span class="action-label">Refresh Data</span>
          </button>
        </div>
      </Card>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">📊</div>
      <h3>No Test Data Available</h3>
      <p>Get started by uploading your first test results</p>
      <Button @click="$router.push('/upload')">Upload Test Results</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useTestDataStore } from '../stores/testData'
import { formatNumber, formatDuration } from '../utils/formatters'
import Button from '../components/shared/Button.vue'
import Card from '../components/shared/Card.vue'
import PieChart from '../components/charts/PieChart.vue'
import LineChart from '../components/charts/LineChart.vue'
import FlakyTestsWidget from '../components/widgets/FlakyTestsWidget.vue'
import FailurePatternsSummary from '../components/analytics/FailurePatternsSummary.vue'

const store = useTestDataStore()

const testResultsChartData = computed(() => {
  if (!store.stats) return []

  return [
    { name: 'Passed', value: store.stats.total_passed },
    { name: 'Failed', value: store.stats.total_failed },
    { name: 'Errors', value: store.stats.total_errors },
    { name: 'Skipped', value: store.stats.total_skipped },
  ].filter(item => item.value > 0)
})

const recentRunsData = computed(() => {
  const runs = store.runs.slice(0, 10).reverse()

  return {
    xAxisData: runs.map((_run, index) => `Run ${index + 1}`),
    series: [
      {
        name: 'Passed',
        data: runs.map(run => run.summary?.passed || 0),
      },
      {
        name: 'Failed',
        data: runs.map(run => run.summary?.failed || 0),
      },
    ],
  }
})

const refreshData = async () => {
  try {
    await Promise.all([
      store.fetchStats(),
      store.fetchRuns({ limit: 10 }),
    ])
  } catch (error) {
    console.error('Failed to refresh dashboard:', error)
  }
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.dashboard {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.loading,
.error-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.error-state h3,
.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.error-state p,
.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border-radius: 0.5rem;
  background: var(--bg-hover);
}

.stat-card.success .stat-icon { background: var(--success-bg); }
.stat-card.passed .stat-icon { background: var(--success-bg); color: var(--success-color); }
.stat-card.failed .stat-icon { background: var(--error-bg); color: var(--error-color); }
.stat-card.error .stat-icon { background: var(--warning-bg); color: var(--warning-color); }
.stat-card.skipped .stat-icon { background: var(--bg-hover); color: var(--text-secondary); }
.stat-card.duration .stat-icon { background: var(--info-bg); }

.stat-details {
  flex: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.success-rate {
  color: var(--success-color);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.chart-card {
  min-height: 450px;
}

.no-data {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.actions-card {
  margin-top: 1rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--primary-color);
  background: var(--primary-bg);
  transform: translateY(-2px);
}

.action-icon {
  font-size: 2rem;
}

.action-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}
</style>
