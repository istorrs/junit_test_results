<template>
  <Card title="⚠️ Top Flaky Tests">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading flaky tests...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="flakyTests.length === 0" class="empty-state">
      <p>🎉 No flaky tests detected!</p>
      <span class="subtitle">All tests are stable</span>
    </div>

    <div v-else class="flaky-tests-list">
      <div
        v-for="test in flakyTests"
        :key="test.test_id"
        class="flaky-test-item"
        @click="viewTestDetails(test)"
      >
        <div class="test-info">
          <div class="test-name">{{ test.test_name }}</div>
          <div class="test-suite">{{ test.class_name }}</div>
        </div>
        <div class="flaky-score" :class="getScoreClass(test.flakiness_score)">
          {{ Math.round(test.flakiness_score) }}%
        </div>
      </div>

      <button v-if="showViewAll" @click="viewAllFlaky" class="view-all-button">
        View All Flaky Tests →
      </button>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Card from '../shared/Card.vue'
import { apiClient } from '../../api/client'
import type { FlakyTest } from '../../api/client'

interface Props {
  limit?: number
  showViewAll?: boolean
  jobName?: string
}

const props = withDefaults(defineProps<Props>(), {
  limit: 5,
  showViewAll: true,
  jobName: undefined
})

const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)
const flakyTests = ref<FlakyTest[]>([])

const loadFlakyTests = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await apiClient.getFlakyTests(props.limit, props.jobName)
    flakyTests.value = response.flaky_tests
  } catch (err) {
    error.value = 'Failed to load flaky tests'
    console.error('Error loading flaky tests:', err)
  } finally {
    loading.value = false
  }
}

// Reload when jobName changes
watch(() => props.jobName, () => {
  loadFlakyTests()
})

const getScoreClass = (score: number): string => {
  if (score >= 50) return 'score-high'
  if (score >= 30) return 'score-medium'
  return 'score-low'
}

const viewTestDetails = (test: FlakyTest) => {
  // Navigate to test cases page filtered to this specific test
  router.push({
    path: '/cases',
    query: {
      search: test.test_name
    }
  })
}

const viewAllFlaky = () => {
  // Navigate to test cases page with flaky filter
  // Note: This would require adding a flaky filter to the test cases page
  router.push('/cases')
}

onMounted(() => {
  loadFlakyTests()
})
</script>

<style scoped>
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
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

.empty-state p {
  font-size: 1.125rem;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.flaky-tests-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.flaky-test-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-radius: 0.375rem;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.flaky-test-item:hover {
  background: var(--bg-hover);
  border-color: var(--primary-color);
  transform: translateX(4px);
}

.test-info {
  flex: 1;
  min-width: 0;
}

.test-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.test-suite {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.25rem;
}

.flaky-score {
  font-size: 1rem;
  font-weight: 700;
  font-family: monospace;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  white-space: nowrap;
}

.score-low {
  background: #fef3c7;
  color: #92400e;
}

.score-medium {
  background: #fed7aa;
  color: #9a3412;
}

.score-high {
  background: #fecaca;
  color: #991b1b;
}

[data-theme='dark'] .score-low {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

[data-theme='dark'] .score-medium {
  background: rgba(251, 146, 60, 0.2);
  color: #fb923c;
}

[data-theme='dark'] .score-high {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.view-all-button {
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  width: 100%;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  color: var(--primary-color);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.view-all-button:hover {
  background: var(--primary-bg);
  border-color: var(--primary-color);
}
</style>
