<template>
  <div class="test-cases">
    <h1>Test Cases</h1>

    <div v-if="store.loading" class="loading">Loading test cases...</div>

    <div v-else-if="store.error" class="error">
      {{ store.error }}
      <Button @click="loadData">Retry</Button>
    </div>

    <div v-else-if="store.cases.length > 0" class="cases-list">
      <Card v-for="testCase in store.cases" :key="testCase.id">
        <div class="case-header">
          <div class="case-info">
            <span :class="['status-icon', testCase.status]">
              {{ getStatusIcon(testCase.status) }}
            </span>
            <h3>{{ testCase.name }}</h3>
          </div>
          <span class="duration">{{ formatDuration(testCase.time * 1000) }}</span>
        </div>

        <div v-if="testCase.classname || testCase.suite_name" class="case-metadata">
          <span v-if="testCase.classname">{{ testCase.classname }}</span>
          <span v-if="testCase.suite_name">{{ testCase.suite_name }}</span>
        </div>

        <div
          v-if="testCase.error_message && testCase.status === 'failed'"
          class="error-message"
        >
          <strong>{{ testCase.error_type }}</strong>
          <pre>{{ testCase.error_message }}</pre>
        </div>
      </Card>
    </div>

    <div v-else class="empty">
      <p>No test cases found</p>
      <Button @click="$router.push('/runs')">View Test Runs</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTestDataStore } from '../stores/testData'
import { formatDuration, getStatusIcon } from '../utils/formatters'
import Button from '../components/shared/Button.vue'
import Card from '../components/shared/Card.vue'

const route = useRoute()
const store = useTestDataStore()

const loadData = async () => {
  try {
    const filters = route.query.run_id ? { run_id: route.query.run_id as string } : {}
    await store.fetchCases(filters)
  } catch (error) {
    console.error('Failed to load test cases:', error)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.test-cases {
  padding: 2rem;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: #111827;
}

.cases-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.case-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.case-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.case-info h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.status-icon {
  font-size: 1.25rem;
  width: 1.5rem;
  text-align: center;
}

.status-icon.passed {
  color: #10b981;
}

.status-icon.failed {
  color: #ef4444;
}

.status-icon.error {
  color: #f59e0b;
}

.status-icon.skipped {
  color: #6b7280;
}

.duration {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.case-metadata {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  border-radius: 0.25rem;
}

.error-message strong {
  display: block;
  color: #dc2626;
  margin-bottom: 0.5rem;
}

.error-message pre {
  font-size: 0.875rem;
  color: #991b1b;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
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
