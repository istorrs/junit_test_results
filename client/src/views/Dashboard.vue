<template>
  <div class="dashboard">
    <h1>Dashboard</h1>

    <div v-if="store.loading" class="loading">Loading...</div>

    <div v-else-if="store.error" class="error">
      {{ store.error }}
      <Button @click="loadData">Retry</Button>
    </div>

    <div v-else-if="store.stats" class="stats-grid">
      <Card title="Total Runs">
        <div class="stat-value">{{ formatNumber(store.stats.total_runs) }}</div>
      </Card>

      <Card title="Total Tests">
        <div class="stat-value">{{ formatNumber(store.stats.total_tests) }}</div>
      </Card>

      <Card title="Success Rate">
        <div class="stat-value success">{{ store.stats.success_rate }}%</div>
      </Card>

      <Card title="Failed Tests">
        <div class="stat-value failed">{{ formatNumber(store.stats.total_failed) }}</div>
      </Card>
    </div>

    <div v-else class="empty">
      <p>No test data available</p>
      <Button @click="$router.push('/upload')">Upload Results</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTestDataStore } from '../stores/testData'
import { formatNumber } from '../utils/formatters'
import Button from '../components/shared/Button.vue'
import Card from '../components/shared/Card.vue'

const store = useTestDataStore()

const loadData = async () => {
  try {
    await store.fetchStats()
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.dashboard {
  padding: 2rem;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: #111827;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-value.success {
  color: #10b981;
}

.stat-value.failed {
  color: #ef4444;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.error {
  color: #ef4444;
}
</style>
