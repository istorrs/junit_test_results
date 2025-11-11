<template>
  <div class="test-runs">
    <h1>Test Runs</h1>

    <div v-if="store.loading" class="loading">Loading test runs...</div>

    <div v-else-if="store.error" class="error">
      {{ store.error }}
      <Button @click="loadData">Retry</Button>
    </div>

    <div v-else-if="store.runs.length > 0" class="runs-list">
      <Card
        v-for="run in store.runs"
        :key="run.id"
        clickable
        @click="selectRun(run)"
      >
        <div class="run-header">
          <h3>{{ run.name || 'Test Run' }}</h3>
          <span class="timestamp">{{ formatDate(run.timestamp) }}</span>
        </div>

        <div v-if="run.ci_metadata" class="run-metadata">
          <span v-if="run.ci_metadata.job_name">{{ run.ci_metadata.job_name }}</span>
          <span v-if="run.ci_metadata.branch">Branch: {{ run.ci_metadata.branch }}</span>
          <span v-if="run.ci_metadata.build_number">#{{ run.ci_metadata.build_number }}</span>
        </div>

        <div v-if="run.summary" class="run-summary">
          <span class="passed">✓ {{ run.summary.passed }}</span>
          <span class="failed">✗ {{ run.summary.failed }}</span>
          <span class="skipped">⊘ {{ run.summary.skipped }}</span>
        </div>
      </Card>
    </div>

    <div v-else class="empty">
      <p>No test runs found</p>
      <Button @click="$router.push('/upload')">Upload Results</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTestDataStore } from '../stores/testData'
import { formatDate } from '../utils/formatters'
import type { TestRun } from '../api/client'
import Button from '../components/shared/Button.vue'
import Card from '../components/shared/Card.vue'

const router = useRouter()
const store = useTestDataStore()

const loadData = async () => {
  try {
    await store.fetchRuns()
  } catch (error) {
    console.error('Failed to load test runs:', error)
  }
}

const selectRun = (run: TestRun) => {
  store.setCurrentRun(run)
  router.push(`/cases?run_id=${run.id}`)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.test-runs {
  padding: 2rem;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: #111827;
}

.runs-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.run-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.run-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.timestamp {
  font-size: 0.875rem;
  color: #6b7280;
}

.run-metadata {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.run-summary {
  display: flex;
  gap: 1.5rem;
  font-size: 1rem;
  font-weight: 600;
}

.passed {
  color: #10b981;
}

.failed {
  color: #ef4444;
}

.skipped {
  color: #6b7280;
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
