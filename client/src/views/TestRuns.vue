<template>
  <div class="test-runs">
    <div class="page-header">
      <h1>Test Runs</h1>
      <div class="header-actions">
        <Button v-if="selectedRuns.size > 0" variant="danger" @click="deleteSelectedRuns">
          Delete {{ selectedRuns.size }} Run{{ selectedRuns.size > 1 ? 's' : '' }}
        </Button>
        <Button v-if="selectedRuns.size > 0" variant="primary" @click="openReleaseTagModal">
          Tag {{ selectedRuns.size }} Run{{ selectedRuns.size > 1 ? 's' : '' }} as Release
        </Button>
        <Button :loading="store.loading" variant="secondary" @click="loadData()"> Refresh </Button>
        <Button @click="$router.push('/upload')"> Upload New Results </Button>
      </div>
    </div>

    <div v-if="loadError" class="load-error" role="alert">
      <span>{{ loadError }}</span>
      <Button size="sm" variant="secondary" @click="loadData(1)">Try again</Button>
    </div>

    <DataTable
      :columns="columns"
      :data="store.runs"
      :loading="store.loading"
      :paginate="false"
      :row-clickable="true"
      :row-aria-label="getRunRowLabel"
      @row-click="(row: any) => viewRunDetails(row as TestRun)"
    >
      <template #filters>
        <div class="filters-grid">
          <div class="filter-group">
            <label for="runs-search">Search</label>
            <SearchInput
              id="runs-search"
              v-model="searchQuery"
              aria-label="Search test runs"
              placeholder="Search by name, job, branch..."
            />
          </div>

          <div class="filter-group">
            <label for="runs-status">Status</label>
            <select id="runs-status" v-model="selectedStatus" class="filter-select">
              <option value="">Any status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="runs-date-from">From date</label>
            <input id="runs-date-from" v-model="dateFrom" type="date" class="filter-input" />
          </div>

          <div class="filter-group">
            <label for="runs-date-to">To date</label>
            <input id="runs-date-to" v-model="dateTo" type="date" class="filter-input" />
          </div>

          <div class="filter-group align-end">
            <Button v-if="hasActiveFilters" variant="secondary" size="sm" @click="clearFilters">
              Clear Filters
            </Button>
          </div>
        </div>
      </template>

      <template #header-select>
        <input
          ref="selectAllCheckbox"
          type="checkbox"
          :checked="allRunsSelected"
          class="run-checkbox"
          title="Select/Deselect All"
          aria-label="Select all runs on this page"
          @change="toggleAllRuns"
        />
      </template>

      <template #cell-select="{ row }">
        <input
          type="checkbox"
          :checked="selectedRuns.has((row as any).id)"
          class="run-checkbox"
          :aria-label="`Select run ${(row as any).name || (row as any).id}`"
          @change="toggleRunSelection((row as any).id)"
          @click.stop
        />
      </template>

      <template #cell-name="{ row }">
        <div class="run-name">
          <strong>{{ (row as any).name || `Run ${(row as any).id?.slice(0, 8)}` }}</strong>
          <div v-if="(row as any).ci_metadata" class="run-meta">
            <span v-if="(row as any).ci_metadata.job_name" class="meta-tag">
              {{ (row as any).ci_metadata.job_name }}
            </span>
            <span v-if="(row as any).ci_metadata.branch" class="meta-tag branch">
              🌿 {{ (row as any).ci_metadata.branch }}
            </span>
            <span v-if="(row as any).ci_metadata.build_number" class="meta-tag build">
              #{{ (row as any).ci_metadata.build_number }}
            </span>
          </div>
        </div>
      </template>

      <template #cell-timestamp="{ value }">
        <span class="timestamp">{{ formatDate(value as string) }}</span>
      </template>

      <template #cell-summary="{ row }">
        <div class="summary-badges">
          <span class="badge passed">✓ {{ (row as any).passed }}</span>
          <span class="badge failed">✗ {{ (row as any).failed }}</span>
          <span v-if="(row as any).errors" class="badge error">⚠ {{ (row as any).errors }}</span>
          <span v-if="(row as any).skipped" class="badge skipped"
            >⊘ {{ (row as any).skipped }}</span
          >
        </div>
      </template>

      <template #cell-total="{ row }">
        <strong>{{ (row as any).total_tests }}</strong>
      </template>

      <template #cell-rate="{ row }">
        <div v-if="(row as any).total_tests > 0" class="success-rate">
          <span :class="getSuccessRateClass(calculateSuccessRate(row as any))">
            {{ calculateSuccessRate(row as any) }}%
          </span>
        </div>
        <span v-else class="no-data">-</span>
      </template>
    </DataTable>

    <PaginationControls
      :page="pagination.page"
      :limit="pagination.limit"
      :total="pagination.total"
      :pages="Math.max(pagination.pages, 1)"
      @page-change="handlePageChange"
      @limit-change="handleLimitChange"
    />

    <ReleaseTagModal
      :open="showReleaseModal"
      :run-ids="Array.from(selectedRuns)"
      @close="closeReleaseTagModal"
      @success="handleReleaseTagged"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTestDataStore } from '../stores/testData'
import { formatDate } from '../utils/formatters'
import type { Pagination, RunFilters, TestRun } from '../api/client'
import { apiClient } from '../api/client'
import Button from '../components/shared/Button.vue'
import DataTable from '../components/shared/DataTable.vue'
import SearchInput from '../components/shared/SearchInput.vue'
import PaginationControls from '../components/shared/PaginationControls.vue'
import ReleaseTagModal from '../components/modals/ReleaseTagModal.vue'

const router = useRouter()
const store = useTestDataStore()

const searchQuery = ref('')
const selectedStatus = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const selectedRuns = ref<Set<string>>(new Set())
const showReleaseModal = ref(false)
const selectAllCheckbox = ref<HTMLInputElement | null>(null)
const pagination = ref<Pagination>({ page: 1, limit: 50, total: 0, pages: 1 })
const loadError = ref('')
let filterTimer: ReturnType<typeof setTimeout> | undefined

const columns = [
  { key: 'select', label: '', sortable: false },
  { key: 'name', label: 'Run Name', sortable: false },
  { key: 'timestamp', label: 'Date', sortable: false },
  { key: 'total', label: 'Total Tests', sortable: false },
  { key: 'summary', label: 'Results', sortable: false },
  { key: 'rate', label: 'Success Rate', sortable: false },
]

const getRunRowLabel = (row: Record<string, unknown>) =>
  `Open test run ${String(row.name || 'Unnamed Run')}`

const hasActiveFilters = computed(() => {
  return !!(searchQuery.value || selectedStatus.value || dateFrom.value || dateTo.value)
})

const calculateSuccessRate = (run: TestRun): number => {
  if (!run.total_tests || run.total_tests === 0) return 0
  return Math.round((run.passed / run.total_tests) * 100)
}

const getSuccessRateClass = (rate: number): string => {
  if (rate === 100) return 'rate-perfect'
  if (rate >= 80) return 'rate-good'
  if (rate >= 50) return 'rate-medium'
  return 'rate-poor'
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}

const viewRunDetails = (run: TestRun) => {
  if (!run || !run.id) {
    console.error('[TestRuns] Cannot view run details: invalid run or missing ID', run)
    return
  }
  store.setCurrentRun(run)
  router.push(`/cases?run_id=${run.id}`)
}

// Select All functionality
const allRunsSelected = computed(() => {
  if (store.runs.length === 0) return false
  return store.runs.every((run) => selectedRuns.value.has(run.id))
})

const someRunsSelected = computed(() => {
  if (selectedRuns.value.size === 0) return false
  return !allRunsSelected.value && store.runs.some((run) => selectedRuns.value.has(run.id))
})

const toggleAllRuns = () => {
  if (allRunsSelected.value) {
    // Deselect all visible runs
    store.runs.forEach((run) => selectedRuns.value.delete(run.id))
  } else {
    // Select all visible runs
    store.runs.forEach((run) => selectedRuns.value.add(run.id))
  }
  // Force reactivity
  selectedRuns.value = new Set(selectedRuns.value)
}

const toggleRunSelection = (runId: string) => {
  if (selectedRuns.value.has(runId)) {
    selectedRuns.value.delete(runId)
  } else {
    selectedRuns.value.add(runId)
  }
  // Force reactivity
  selectedRuns.value = new Set(selectedRuns.value)
}

const clearSelection = () => {
  selectedRuns.value.clear()
  selectedRuns.value = new Set()
}

const openReleaseTagModal = () => {
  showReleaseModal.value = true
}

const closeReleaseTagModal = () => {
  showReleaseModal.value = false
}

const handleReleaseTagged = () => {
  clearSelection()
  loadData()
}

const deleteSelectedRuns = async () => {
  const count = selectedRuns.value.size
  const runText = count === 1 ? 'run' : 'runs'

  const confirmed = confirm(
    `Are you sure you want to delete ${count} test ${runText}?\n\n` +
      'This will permanently delete:\n' +
      '- Test run records\n' +
      '- All test cases and results\n' +
      '- All test suites\n' +
      '- Associated file uploads\n\n' +
      'This action cannot be undone.'
  )

  if (!confirmed) {
    return
  }

  try {
    const runIds = Array.from(selectedRuns.value)
    const deletePromises = runIds.map((runId) => apiClient.deleteRun(runId))

    await Promise.all(deletePromises)

    clearSelection()
    await loadData()

    alert(`Successfully deleted ${count} test ${runText}`)
  } catch (error) {
    console.error('Failed to delete test runs:', error)
    alert(`Failed to delete test runs: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const loadData = async (page = pagination.value.page) => {
  loadError.value = ''
  try {
    const filters: RunFilters = {
      page,
      limit: pagination.value.limit,
    }
    if (store.globalProjectFilter) {
      filters.job_name = store.globalProjectFilter
    }
    if (searchQuery.value.trim()) filters.search = searchQuery.value.trim()
    if (selectedStatus.value) {
      filters.status = selectedStatus.value as RunFilters['status']
    }
    if (dateFrom.value) filters.from_date = dateFrom.value
    if (dateTo.value) filters.to_date = dateTo.value

    const response = await store.fetchRuns(filters)
    pagination.value = response.pagination
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Failed to load test runs'
    console.error('Failed to load test runs:', error)
  }
}

const handlePageChange = (page: number) => {
  clearSelection()
  loadData(page)
}

const handleLimitChange = (limit: number) => {
  clearSelection()
  pagination.value.limit = limit
  loadData(1)
}

watch([searchQuery, selectedStatus, dateFrom, dateTo], () => {
  clearSelection()
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => loadData(1), 300)
})

// Update indeterminate state of select-all checkbox
watch(someRunsSelected, (value) => {
  if (selectAllCheckbox.value) {
    selectAllCheckbox.value.indeterminate = value
  }
})

// Watch for global project filter changes and reload data
watch(
  () => store.globalProjectFilter,
  () => {
    clearSelection()
    loadData(1)
  }
)

onMounted(() => {
  loadData(1)
})

onUnmounted(() => clearTimeout(filterTimer))
</script>

<style scoped>
.test-runs {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
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

.header-actions {
  display: flex;
  gap: 1rem;
}

.load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  color: var(--error-color);
  background: var(--error-bg);
  border-radius: 0.5rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group.align-end {
  align-items: flex-end;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.filter-select,
.filter-input {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.run-name strong {
  display: block;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.run-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.meta-tag {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: var(--bg-hover);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.meta-tag.branch {
  background: var(--info-bg);
  color: var(--info-color);
}

.meta-tag.build {
  background: var(--warning-bg);
  color: var(--warning-color);
}

.timestamp {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.summary-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.badge.passed {
  background: var(--success-bg);
  color: var(--success-color);
}

.badge.failed {
  background: var(--error-bg);
  color: var(--error-color);
}

.badge.error {
  background: var(--warning-bg);
  color: #f59e0b;
}

.badge.skipped {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.success-rate {
  font-weight: 600;
}

.rate-perfect {
  color: var(--success-color);
}

.rate-good {
  color: var(--primary-color);
}

.rate-medium {
  color: #f59e0b;
}

.rate-poor {
  color: var(--error-color);
}

.no-data {
  color: var(--text-tertiary);
  font-size: 0.875rem;
}

.run-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.run-checkbox:hover {
  transform: scale(1.1);
}

.run-checkbox:indeterminate {
  accent-color: var(--primary-color);
  opacity: 0.7;
}

@media (max-width: 600px) {
  .test-runs {
    padding: 1.25rem;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
