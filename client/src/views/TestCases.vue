<template>
  <div class="test-cases">
    <div class="page-header">
      <h1>Test Cases</h1>
      <div class="header-actions">
        <Button :loading="store.loading" variant="secondary" @click="loadData()"> Refresh </Button>
        <Button @click="$router.push('/runs')"> View Test Runs </Button>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :data="store.cases"
      :loading="store.loading"
      :paginate="false"
      :row-clickable="true"
      :row-aria-label="getTestCaseRowLabel"
      @row-click="handleRowClick"
    >
      <template #filters>
        <div class="filters-grid">
          <div class="filter-group">
            <label>Search</label>
            <SearchInput v-model="searchQuery" placeholder="Search test names..." />
          </div>

          <div class="filter-group">
            <label>Status</label>
            <select v-model="selectedStatus" class="filter-select">
              <option value="">Any status</option>
              <option value="passed">✓ Passed</option>
              <option value="failed">✗ Failed</option>
              <option value="error">⚠ Error</option>
              <option value="skipped">⊘ Skipped</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Suite</label>
            <select v-model="selectedSuite" class="filter-select" :disabled="suitesLoading">
              <option value="">{{ suitesLoading ? 'Loading suites…' : 'Any suite' }}</option>
              <option v-for="suite in suites" :key="suite" :value="suite">
                {{ suite }}
              </option>
            </select>
          </div>

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
import { useRoute } from 'vue-router'
import { useTestDataStore } from '../stores/testData'
import { apiClient, type Pagination, type TestCaseFilters } from '../api/client'
import { formatDuration, getStatusIcon, truncateText } from '../utils/formatters'
import Button from '../components/shared/Button.vue'
import DataTable from '../components/shared/DataTable.vue'
import SearchInput from '../components/shared/SearchInput.vue'
import PaginationControls from '../components/shared/PaginationControls.vue'
import TestDetailsModal from '../components/modals/TestDetailsModal.vue'

const route = useRoute()
const store = useTestDataStore()

const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')
const selectedStatus = ref('')
const selectedSuite = ref('')
const suites = ref<string[]>([])
const suitesLoading = ref(false)
const pagination = ref<Pagination>({ page: 1, limit: 50, total: 0, pages: 1 })
let filterTimer: ReturnType<typeof setTimeout> | undefined
let suitesRequestId = 0

// Modal state
const modalOpen = ref(false)
const selectedTest = ref<any>(null)

const columns = [
  { key: 'status', label: 'Status', sortable: true },
  { key: 'name', label: 'Test Name', sortable: true },
  { key: 'time', label: 'Duration', sortable: true },
]

const getTestCaseRowLabel = (row: Record<string, unknown>) =>
  `Open test case ${String(row.name || 'Unnamed Test')}`

const hasActiveFilters = computed(() => {
  return !!(searchQuery.value || selectedStatus.value || selectedSuite.value)
})

const clearFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = ''
  selectedSuite.value = ''
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
  try {
    const filters: TestCaseFilters = {
      page,
      limit: pagination.value.limit,
    }

    if (typeof route.query.run_id === 'string') filters.run_id = route.query.run_id
    if (searchQuery.value.trim()) filters.search = searchQuery.value.trim()
    if (selectedStatus.value) filters.status = selectedStatus.value
    if (selectedSuite.value) filters.class_name = selectedSuite.value

    if (store.globalProjectFilter) {
      filters.job_name = store.globalProjectFilter
    }

    const response = await store.fetchCases(filters)
    pagination.value = response.pagination
  } catch (error) {
    console.error('Failed to load test cases:', error)
  }
}

const handlePageChange = (page: number) => loadData(page)

const handleLimitChange = (limit: number) => {
  pagination.value.limit = limit
  loadData(1)
}

watch([searchQuery, selectedStatus, selectedSuite], () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => loadData(1), 300)
})

// Watch for global project filter changes and reload data
watch(
  () => store.globalProjectFilter,
  () => {
    selectedSuite.value = ''
    loadSuites()
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
</style>
