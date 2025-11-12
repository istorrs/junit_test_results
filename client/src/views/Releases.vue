<template>
  <div class="releases-view">
    <div class="page-header">
      <h1>Release Comparison</h1>
      <p class="subtitle">Compare test results across different releases and versions</p>
    </div>

    <Card title="Select Releases to Compare">
      <div class="release-selectors">
        <div class="selector-group">
          <label>Release 1 (Baseline)</label>
          <select v-model="selectedRelease1" class="release-select">
            <option value="">Select a release...</option>
            <option v-for="release in releases" :key="release.release_tag" :value="release.release_tag">
              {{ release.release_tag }} {{ release.release_version ? `(${release.release_version})` : '' }}
            </option>
          </select>
        </div>

        <div class="selector-group">
          <label>Release 2 (Compare to)</label>
          <select v-model="selectedRelease2" class="release-select">
            <option value="">Select a release...</option>
            <option v-for="release in releases" :key="release.release_tag" :value="release.release_tag">
              {{ release.release_tag }} {{ release.release_version ? `(${release.release_version})` : '' }}
            </option>
          </select>
        </div>

        <button
          @click="compareReleases"
          :disabled="!selectedRelease1 || !selectedRelease2 || loading"
          class="compare-button"
        >
          {{ loading ? 'Comparing...' : 'Compare' }}
        </button>
      </div>
    </Card>

    <div v-if="comparison" class="comparison-results">
      <div class="metrics-grid">
        <Card title="Release 1: {{ comparison.release1.tag }}">
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">Total Tests</span>
              <span class="metric-value">{{ comparison.release1.total_tests }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Pass Rate</span>
              <span class="metric-value success">{{ comparison.release1.pass_rate.toFixed(1) }}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Failures</span>
              <span class="metric-value error">{{ comparison.release1.total_failures }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Avg Time</span>
              <span class="metric-value">{{ formatTime(comparison.release1.avg_time_per_run) }}</span>
            </div>
          </div>
        </Card>

        <Card title="Release 2: {{ comparison.release2.tag }}">
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">Total Tests</span>
              <span class="metric-value">{{ comparison.release2.total_tests }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Pass Rate</span>
              <span class="metric-value success">{{ comparison.release2.pass_rate.toFixed(1) }}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Failures</span>
              <span class="metric-value error">{{ comparison.release2.total_failures }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Avg Time</span>
              <span class="metric-value">{{ formatTime(comparison.release2.avg_time_per_run) }}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Comparison Summary">
        <div class="diff-metrics">
          <div class="diff-item">
            <span class="diff-label">Pass Rate Change</span>
            <span class="diff-value" :class="getDiffClass(comparison.diff.pass_rate_change)">
              {{ comparison.diff.pass_rate_change > 0 ? '+' : '' }}{{ comparison.diff.pass_rate_change.toFixed(2) }}%
            </span>
          </div>
          <div class="diff-item">
            <span class="diff-label">Test Count Change</span>
            <span class="diff-value">
              {{ comparison.diff.test_count_change > 0 ? '+' : '' }}{{ comparison.diff.test_count_change }}
            </span>
          </div>
          <div class="diff-item">
            <span class="diff-label">Failure Change</span>
            <span class="diff-value" :class="getDiffClass(-comparison.diff.failure_change)">
              {{ comparison.diff.failure_change > 0 ? '+' : '' }}{{ comparison.diff.failure_change }}
            </span>
          </div>
          <div class="diff-item">
            <span class="diff-label">Performance Change</span>
            <span class="diff-value" :class="getDiffClass(-comparison.diff.time_change_percent)">
              {{ comparison.diff.time_change_percent > 0 ? '+' : '' }}{{ comparison.diff.time_change_percent.toFixed(1) }}%
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
import { ref, onMounted } from 'vue'
import { apiClient } from '../api/client'
import type { Release, ReleaseComparisonResponse } from '../api/client'
import Card from '../components/shared/Card.vue'

const releases = ref<Release[]>([])
const selectedRelease1 = ref('')
const selectedRelease2 = ref('')
const comparison = ref<ReleaseComparisonResponse | null>(null)
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    const data = await apiClient.getReleases({ limit: 100 })
    releases.value = data.releases
  } catch (err) {
    error.value = 'Failed to load releases'
    console.error(err)
  }
})

const compareReleases = async () => {
  if (!selectedRelease1.value || !selectedRelease2.value) return

  loading.value = true
  error.value = ''
  comparison.value = null

  try {
    comparison.value = await apiClient.compareReleases(selectedRelease1.value, selectedRelease2.value)
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

.release-select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
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
  color: var(--success-color);
}

.metric-value.error {
  color: var(--error-color);
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
