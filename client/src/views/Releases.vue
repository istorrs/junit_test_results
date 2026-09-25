<template>
  <div class="releases-view">
    <div class="page-header">
      <h1>Release Comparison</h1>
      <p class="subtitle">Compare test results across different releases and versions</p>
    </div>

    <Card title="Select Releases to Compare">
      <div class="release-selectors">
        <div class="selector-group">
          <label for="release-1">Release 1 (Baseline)</label>
          <AsyncEntitySelect
            v-model="selectedRelease1"
            input-id="release-1"
            placeholder="Select a release..."
            search-label="Search baseline releases"
            search-placeholder="Search release tags or versions..."
            :reload-key="store.globalProjectFilter"
            :load-options="loadReleaseOptions"
          />
        </div>

        <div class="selector-group">
          <label for="release-2">Release 2 (Compare to)</label>
          <AsyncEntitySelect
            v-model="selectedRelease2"
            input-id="release-2"
            placeholder="Select a release..."
            search-label="Search comparison releases"
            search-placeholder="Search release tags or versions..."
            :reload-key="store.globalProjectFilter"
            :load-options="loadReleaseOptions"
          />
        </div>

        <button
          :disabled="
            !selectedRelease1 ||
            !selectedRelease2 ||
            selectedRelease1 === selectedRelease2 ||
            loading
          "
          class="compare-button"
          @click="compareReleases"
        >
          {{ loading ? 'Comparing...' : 'Compare' }}
        </button>
      </div>
      <p
        v-if="selectedRelease1 && selectedRelease1 === selectedRelease2"
        class="selection-error"
        role="alert"
      >
        Choose two different releases to compare.
      </p>
    </Card>

    <div v-if="comparison" class="comparison-results">
      <div class="metrics-grid">
        <Card :title="`Release 1: ${comparison.release1.tag}`">
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">Total Tests</span>
              <span class="metric-value">{{ comparison.release1.total_tests }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Pass Rate</span>
              <span class="metric-value success"
                >{{ comparison.release1.pass_rate.toFixed(1) }}%</span
              >
            </div>
            <div class="metric">
              <span class="metric-label">Failures</span>
              <span class="metric-value error">{{ comparison.release1.failed }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Avg Time</span>
              <span class="metric-value">{{
                formatTime(comparison.release1.avg_time_per_run)
              }}</span>
            </div>
          </div>
        </Card>

        <Card :title="`Release 2: ${comparison.release2.tag}`">
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">Total Tests</span>
              <span class="metric-value">{{ comparison.release2.total_tests }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Pass Rate</span>
              <span class="metric-value success"
                >{{ comparison.release2.pass_rate.toFixed(1) }}%</span
              >
            </div>
            <div class="metric">
              <span class="metric-label">Failures</span>
              <span class="metric-value error">{{ comparison.release2.failed }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Avg Time</span>
              <span class="metric-value">{{
                formatTime(comparison.release2.avg_time_per_run)
              }}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Comparison Summary">
        <div class="diff-metrics">
          <div class="diff-item">
            <span class="diff-label">Pass Rate Change</span>
            <span class="diff-value" :class="getDiffClass(comparison.diff.pass_rate_change)">
              {{ comparison.diff.pass_rate_change > 0 ? '+' : ''
              }}{{ comparison.diff.pass_rate_change.toFixed(2) }}%
            </span>
          </div>
          <div class="diff-item">
            <span class="diff-label">Test Count Change</span>
            <span class="diff-value">
              {{ comparison.diff.test_count_change > 0 ? '+' : ''
              }}{{ comparison.diff.test_count_change }}
            </span>
          </div>
          <div class="diff-item">
            <span class="diff-label">Failure Change</span>
            <span class="diff-value" :class="getDiffClass(-comparison.diff.failure_change)">
              {{ comparison.diff.failure_change > 0 ? '+' : ''
              }}{{ comparison.diff.failure_change }}
            </span>
          </div>
          <div class="diff-item">
            <span class="diff-label">Performance Change</span>
            <span class="diff-value" :class="getDiffClass(-comparison.diff.time_change_percent)">
              {{ comparison.diff.time_change_percent > 0 ? '+' : ''
              }}{{ comparison.diff.time_change_percent.toFixed(1) }}%
            </span>
          </div>
        </div>
      </Card>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { apiClient } from '../api/client'
import type { ReleaseComparisonResponse } from '../api/client'
import Card from '../components/shared/Card.vue'
import AsyncEntitySelect, {
  type EntityOptionsPage,
} from '../components/shared/AsyncEntitySelect.vue'
import { useTestDataStore } from '../stores/testData'

const store = useTestDataStore()
const selectedRelease1 = ref('')
const selectedRelease2 = ref('')
const comparison = ref<ReleaseComparisonResponse | null>(null)
const loading = ref(false)
const error = ref('')

const loadReleaseOptions = async (
  search: string,
  page: number,
  limit: number
): Promise<EntityOptionsPage> => {
  const data = await apiClient.getReleases({
    page,
    limit,
    search: search || undefined,
    job_name: store.globalProjectFilter || undefined,
  })
  return {
    options: data.releases.map((release) => ({
      value: release.release_tag,
      label: `${release.release_tag}${release.release_version ? ` (${release.release_version})` : ''}`,
    })),
    total: data.pagination.total,
    pages: data.pagination.pages,
  }
}

// Watch for global project filter changes and reload releases
watch(
  () => store.globalProjectFilter,
  () => {
    // Clear selections when filter changes
    selectedRelease1.value = ''
    selectedRelease2.value = ''
    comparison.value = null
  }
)

const compareReleases = async () => {
  if (!selectedRelease1.value || !selectedRelease2.value) return

  loading.value = true
  error.value = ''
  comparison.value = null

  try {
    comparison.value = await apiClient.compareReleases(
      selectedRelease1.value,
      selectedRelease2.value,
      store.globalProjectFilter || undefined
    )
  } catch (err) {
    error.value = 'Failed to compare releases'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}m ${secs}s`
}

const getDiffClass = (value: number) => {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return ''
}
</script>

<style scoped>
.releases-view {
  max-width: 1200px;
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

.release-selectors {
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
  font-weight: 500;
  color: var(--text-primary);
}

.compare-button {
  padding: 0.75rem 2rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.compare-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.compare-button:not(:disabled):hover {
  opacity: 0.9;
}

.selection-error {
  margin: 0.75rem 0 0;
  color: var(--error-color);
  font-size: 0.875rem;
}

.comparison-results {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.metric-value.success {
  color: var(--status-passed);
}

.metric-value.error {
  color: var(--status-failed);
}

.diff-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.diff-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.375rem;
}

.diff-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.diff-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.diff-value.positive {
  color: var(--success-color);
}

.diff-value.negative {
  color: var(--error-color);
}

.error-message {
  padding: 1rem;
  background: var(--error-bg);
  color: var(--error-color);
  border-radius: 0.375rem;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .release-selectors {
    flex-direction: column;
    align-items: stretch;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .diff-metrics {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
