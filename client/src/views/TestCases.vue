<template>
  <div class="test-cases">
    <div class="page-header">
      <h1>Test Cases</h1>
      <div class="header-actions">
        <Button :loading="store.loading" variant="secondary" @click="loadData()"> Refresh </Button>
        <Button @click="$router.push('/runs')"> View Test Runs </Button>
      </div>
    </div>

    <div v-if="loadError" class="load-error" role="alert">
      <span>{{ loadError }}</span>
      <Button size="sm" variant="secondary" @click="loadData(1)">Try again</Button>
    </div>

    <DataTable
      :columns="columns"
      :data="store.cases"
      :loading="store.loading"
      :paginate="false"
      :manual-sort="true"
      :sort-key="sortBy"
      :sort-order="sortOrder"
      :row-clickable="true"
      :row-aria-label="getTestCaseRowLabel"
      @row-click="handleRowClick"
      @sort-change="handleSortChange"
    >
      <template #filters>
        <div class="filters-grid">
          <div class="filter-group">
            <label for="cases-search">Search</label>
            <SearchInput
              id="cases-search"
              v-model="searchQuery"
              aria-label="Search test cases"
              placeholder="Search test names..."
            />
          </div>

          <div class="filter-group">
            <label for="cases-status">Status</label>
            <select id="cases-status" v-model="selectedStatus" class="filter-select">
              <option value="">Any status</option>
              <option value="passed">✓ Passed</option>
              <option value="failed">✗ Failed</option>
              <option value="error">⚠ Error</option>
              <option value="skipped">⊘ Skipped</option>
              <option value="unknown">? Unknown</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="cases-suite">Suite</label>
            <select
              id="cases-suite"
              v-model="selectedSuite"
              class="filter-select"
              :disabled="suitesLoading"
            >
              <option value="">{{ suitesLoading ? 'Loading suites…' : 'Any suite' }}</option>
              <option v-for="suite in suites" :key="suite" :value="suite">
                {{ suite }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label for="cases-tag">Allure tag</label>
            <select
              id="cases-tag"
              v-model="selectedTag"
              class="filter-select"
              :disabled="tagsLoading"
            >
              <option value="">{{ tagsLoading ? 'Loading tags…' : 'Any tag' }}</option>
              <option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option>
            </select>
          </div>

          <label class="flaky-filter">
            <input v-model="flakyOnly" type="checkbox" />
            Flaky tests only
          </label>

          <div class="filter-group align-end">
            <Button v-if="hasActiveFilters" variant="secondary" size="sm" @click="clearFilters">
              Clear Filters
            </Button>
          </div>
        </div>
      </template>

      <template #cell-status="{ row }">
        <span :class="['status-badge', (row as any).status]">
          {{ getStatusIcon((row as any).status || '') }} {{ (row as any).status }}
        </span>
      </template>

      <template #cell-name="{ row }">
        <div class="test-name">
          <strong>{{ (row as any).name }}</strong>
          <div v-if="(row as any).class_name" class="test-meta">
            <span class="meta-info">{{ (row as any).class_name }}</span>
          </div>
          <div v-if="(row as any).error_message" class="error-preview">
            {{ truncateText((row as any).error_message || '', 100) }}
          </div>
        </div>
      </template>

      <template #cell-time="{ value }">
        <span class="duration">{{ formatDuration(((value as any) || 0) * 1000) }}</span>
      </template>

      <template #cell-timestamp="{ value }">
        <time v-if="value" class="run-date" :datetime="String(value)" :title="String(value)">
          {{ formatDate(String(value)) }}
        </time>
        <span v-else class="run-date unavailable">Unknown</span>
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

    <!-- Test Details Modal -->
    <TestDetailsModal
      :open="modalOpen"
      :test-id="selectedTest?.id || ''"
      :test-name="selectedTest?.name || ''"
      :status="selectedTest?.status || 'passed'"
      :duration="selectedTest?.time"
      :error-message="selectedTest?.error_message"
      :error-type="selectedTest?.error_type"
      :stack-trace="selectedTest?.stack_trace"
      :class-name="selectedTest?.class_name"
      :last-run="selectedTest?.timestamp"
      :ci-metadata="selectedTest?.run_ci_metadata"
      @close="closeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTestDataStore } from '../stores/testData'
import { apiClient, type Pagination, type TestCaseFilters } from '../api/client'
import { formatDate, formatDuration, getStatusIcon, truncateText } from '../utils/formatters'
import Button from '../components/shared/Button.vue'
import DataTable from '../components/shared/DataTable.vue'
import SearchInput from '../components/shared/SearchInput.vue'
import PaginationControls from '../components/shared/PaginationControls.vue'
import TestDetailsModal from '../components/modals/TestDetailsModal.vue'

const route = useRoute()
const router = useRouter()
const store = useTestDataStore()

const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')
const selectedStatus = ref('')
const selectedSuite = ref('')
const selectedTag = ref('')
const flakyOnly = ref(route.query.flaky === 'true')
const suites = ref<string[]>([])
const suitesLoading = ref(false)
const tags = ref<string[]>([])
const tagsLoading = ref(false)
const pagination = ref<Pagination>({ page: 1, limit: 50, total: 0, pages: 1 })
const loadError = ref('')
let filterTimer: ReturnType<typeof setTimeout> | undefined
let suitesRequestId = 0
let tagsRequestId = 0

// Modal state
const modalOpen = ref(false)
const selectedTest = ref<any>(null)

const sortBy = ref<NonNullable<TestCaseFilters['sort_by']>>('name')
const sortOrder = ref<NonNullable<TestCaseFilters['sort_order']>>('asc')

const columns = [
  { key: 'status', label: 'Status', sortable: true },
  { key: 'name', label: 'Test Name', sortable: true },
  { key: 'time', label: 'Duration', sortable: true },
  { key: 'timestamp', label: 'Run Date', sortable: true },
]

const getTestCaseRowLabel = (row: Record<string, unknown>) =>
  `Open test case ${String(row.name || 'Unnamed Test')}`

const hasActiveFilters = computed(() => {
  return !!(
    searchQuery.value ||
    selectedStatus.value ||
    selectedSuite.value ||
    selectedTag.value ||
    flakyOnly.value
  )
})

const clearFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = ''
  selectedSuite.value = ''
  selectedTag.value = ''
  flakyOnly.value = false
  if (route.query.search || route.query.flaky) {
    router.replace({
      query: { ...route.query, search: undefined, flaky: undefined },
    })
  }
}

const loadTags = async () => {
  const requestId = ++tagsRequestId
  tagsLoading.value = true
  tags.value = []
  try {
    const filters: Pick<TestCaseFilters, 'run_id' | 'job_name'> = {}
    if (typeof route.query.run_id === 'string') filters.run_id = route.query.run_id
    if (store.globalProjectFilter) filters.job_name = store.globalProjectFilter
    const availableTags = await apiClient.getTestCaseLabels('tag', filters)
    if (requestId === tagsRequestId) tags.value = availableTags
  } catch (error) {
    console.error('Failed to load Allure tags:', error)
  } finally {
    if (requestId === tagsRequestId) tagsLoading.value = false
  }
}

const loadSuites = async () => {
  const requestId = ++suitesRequestId
  suitesLoading.value = true
  suites.value = []
  try {
    const filters: Pick<TestCaseFilters, 'run_id' | 'job_name'> = {}
    if (typeof route.query.run_id === 'string') filters.run_id = route.query.run_id
    if (store.globalProjectFilter) filters.job_name = store.globalProjectFilter
    const availableSuites = await apiClient.getTestCaseSuites(filters)
    if (requestId === suitesRequestId) suites.value = availableSuites
  } catch (error) {
    console.error('Failed to load test suites:', error)
  } finally {
    if (requestId === suitesRequestId) suitesLoading.value = false
  }
}

const loadData = async (page = pagination.value.page) => {
  loadError.value = ''
  try {
    const filters: TestCaseFilters = {
      page,
      limit: pagination.value.limit,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    }

    if (typeof route.query.run_id === 'string') filters.run_id = route.query.run_id
    if (searchQuery.value.trim()) filters.search = searchQuery.value.trim()
    if (selectedStatus.value) filters.status = selectedStatus.value
    if (selectedSuite.value) filters.class_name = selectedSuite.value
    if (selectedTag.value) filters.tag = selectedTag.value
    if (flakyOnly.value) filters.is_flaky = true

    if (store.globalProjectFilter) {
      filters.job_name = store.globalProjectFilter
    }

    const response = await store.fetchCases(filters)
    pagination.value = response.pagination
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Failed to load test cases'
    console.error('Failed to load test cases:', error)
  }
}

const handlePageChange = (page: number) => loadData(page)

const handleLimitChange = (limit: number) => {
  pagination.value.limit = limit
  loadData(1)
}

const handleSortChange = (sort: { key: string; order: 'asc' | 'desc' }) => {
  sortBy.value = sort.key as NonNullable<TestCaseFilters['sort_by']>
  sortOrder.value = sort.order
  loadData(1)
}

watch([searchQuery, selectedStatus, selectedSuite, selectedTag, flakyOnly], () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => loadData(1), 300)
})

// Watch for global project filter changes and reload data
watch(
  () => store.globalProjectFilter,
  () => {
    selectedSuite.value = ''
    selectedTag.value = ''
    loadSuites()
    loadTags()
    loadData(1)
  }
)

const handleRowClick = (row: any) => {
  console.log('[TestCases] Row clicked:', {
    id: row.id,
    name: row.name,
    class_name: row.class_name,
    suite_id: row.suite_id,
    run_id: row.run_id,
    run_name: row.run_name,
    has_suite_properties: !!row.suite_properties,
    suite_properties_keys: row.suite_properties ? Object.keys(row.suite_properties) : null,
  })
  selectedTest.value = row
  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
}

onMounted(() => {
  loadSuites()
  loadTags()
  loadData(1)
})

onUnmounted(() => clearTimeout(filterTimer))
</script>

<style scoped>
.test-cases {
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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

.flaky-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.25rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.filter-select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-badge.passed {
  background: var(--success-bg);
  color: var(--success-color);
}

.status-badge.failed {
  background: var(--error-bg);
  color: var(--error-color);
}

.status-badge.error {
  background: var(--warning-bg);
  color: #f59e0b;
}

.status-badge.skipped {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.status-badge.unknown {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

@media (max-width: 600px) {
  .test-cases {
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

.test-name strong {
  display: block;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.test-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.meta-info {
  font-size: 0.75rem;
  color: var(--text-secondary);
  padding: 0.125rem 0.5rem;
  background: var(--bg-hover);
  border-radius: 0.25rem;
}

.meta-info.suite {
  background: var(--info-bg);
  color: var(--info-color);
}

.error-preview {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--error-bg);
  border-left: 3px solid #ef4444;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  color: var(--error-color);
  font-family: monospace;
}

.duration {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.run-date {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.run-date.unavailable {
  font-style: italic;
}
</style>
