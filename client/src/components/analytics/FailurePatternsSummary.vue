<template>
  <Card title="Common Failure Patterns">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Analyzing failure patterns...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="patterns.length === 0" class="empty-state">
      <p>✓ No recent failures</p>
      <span class="subtitle">All tests passing in the last {{ days }} days</span>
    </div>

    <div v-else class="patterns-list">
      <div
        v-for="pattern in patterns"
        :key="`${pattern.error_type}-${pattern.count}`"
        class="pattern-item"
      >
        <div class="pattern-header">
          <div class="pattern-info">
            <div class="error-type">
              <span class="type-badge">{{ pattern.error_type || 'Unknown Error' }}</span>
              <span class="count">{{ pattern.count }} tests</span>
            </div>
            <div class="error-message">{{ truncateMessage(pattern.error_message) }}</div>
          </div>
          <div class="trend-indicator" :class="`trend-${pattern.trend}`">
            <span v-if="pattern.trend === 'increasing'">📈</span>
            <span v-else>━</span>
          </div>
        </div>

        <div v-if="pattern.affected_tests.length > 0" class="affected-tests">
          <span class="affected-label">Affected:</span>
          <span
            v-for="(test, index) in pattern.affected_tests.slice(0, 3)"
            :key="test.test_id"
            class="test-link"
            @click="viewTest(test.test_id, test.test_name)"
          >
            {{ test.test_name
            }}{{ index < Math.min(2, pattern.affected_tests.length - 1) ? ',' : '' }}
          </span>
          <span v-if="pattern.affected_tests.length > 3" class="more-tests">
            +{{ pattern.affected_tests.length - 3 }} more
          </span>
        </div>
      </div>

      <div v-if="showTimeRange" class="time-range-info">
        <span>Last {{ days }} days</span>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Card from '../shared/Card.vue'
import { apiClient } from '../../api/client'
import type { FailurePattern } from '../../api/client'
import { useTestDataStore } from '../../stores/testData'

interface Props {
  days?: number
  limit?: number
  showTimeRange?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  days: 7,
  limit: 5,
  showTimeRange: true,
})

const router = useRouter()
const store = useTestDataStore()

const loading = ref(false)
const error = ref<string | null>(null)
const patterns = ref<FailurePattern[]>([])

const loadFailurePatterns = async () => {
  loading.value = true
  error.value = null

  try {
    const params: any = {
      days: props.days,
      limit: props.limit,
    }
    if (store.globalProjectFilter) {
      params.job_name = store.globalProjectFilter
    }
    const response = await apiClient.getFailurePatterns(params)
    patterns.value = response.patterns
  } catch (err) {
    error.value = 'Failed to load failure patterns'
    console.error('Error loading failure patterns:', err)
  } finally {
    loading.value = false
  }
}

// Watch for global project filter changes and reload
watch(
  () => store.globalProjectFilter,
  () => {
    loadFailurePatterns()
  }
)

const truncateMessage = (message: string | undefined): string => {
  if (!message) return 'No error message'
  const maxLength = 80
  if (message.length <= maxLength) return message
  return message.substring(0, maxLength) + '...'
}

const viewTest = (_testId: string, testName: string) => {
  router.push({
    path: '/cases',
    query: {
      search: testName,
    },
  })
}

onMounted(() => {
  loadFailurePatterns()
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

.patterns-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pattern-item {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.pattern-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.pattern-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.pattern-info {
  flex: 1;
  min-width: 0;
}

.error-type {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.type-badge {
  padding: 0.125rem 0.5rem;
  background: var(--error-bg);
  color: var(--error-color);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: monospace;
}

.count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.error-message {
  font-size: 0.875rem;
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-word;
}

.trend-indicator {
  font-size: 1.25rem;
  padding: 0.25rem;
  border-radius: 0.25rem;
}

.trend-increasing {
  color: var(--error-color);
}

.trend-stable {
  color: var(--text-secondary);
  opacity: 0.5;
}

.affected-tests {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  align-items: center;
}

.affected-label {
  font-weight: 600;
  margin-right: 0.25rem;
}

.test-link {
  color: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s;
}

.test-link:hover {
  text-decoration: underline;
}

.more-tests {
  color: var(--text-secondary);
  font-style: italic;
}

.time-range-info {
  margin-top: 0.5rem;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-color);
}
</style>
