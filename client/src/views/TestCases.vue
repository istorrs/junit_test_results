<template>
  <div class="test-cases">
    <div class="page-header">
      <h1>Test Cases</h1>
      <div class="header-actions">
        <Button @click="loadData" :loading="store.loading" variant="secondary">
          Refresh
        </Button>
        <Button @click="$router.push('/runs')">
          View Test Runs
        </Button>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :data="filteredCases"
      :loading="store.loading"
      :row-clickable="true"
      :page-size="1000"
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
              <option value="">All Statuses</option>
              <option value="passed">✓ Passed</option>
              <option value="failed">✗ Failed</option>
              <option value="error">⚠ Error</option>
              <option value="skipped">⊘ Skipped</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Suite</label>
            <select v-model="selectedSuite" class="filter-select">
              <option value="">All Suites</option>
              <option v-for="suite in suites" :key="suite" :value="suite">
                {{ suite }}
              </option>
            </select>
          </div>

          <div class="filter-group align-end">
            <Button
              @click="clearFilters"
              variant="secondary"
              size="sm"
              v-if="hasActiveFilters"
            >
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
          <div class="test-meta" v-if="(row as any).classname || (row as any).suite_name">
            <span v-if="(row as any).classname" class="meta-info">{{ (row as any).classname }}</span>
            <span v-if="(row as any).suite_name" class="meta-info suite">{{ (row as any).suite_name }}</span>
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

    <!-- Test Details Modal -->
    <TestDetailsModal
      :open="modalOpen"
      :test-id="selectedTest?.id || ''"
      :test-name="selectedTest?.name || ''"
      :status="selectedTest?.status || 'passed'"
      :duration="selectedTest?.time"
      :error-message="selectedTest?.error_message"
      :error-type="selectedTest?.error_type"
      :stack-trace="selectedTest?.result?.stack_trace"
      :class-name="selectedTest?.classname || selectedTest?.suite_name"
      :last-run="selectedTest?.timestamp"
      :ci-metadata="selectedTest?.run_ci_metadata"
      @close="closeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTestDataStore } from '../stores/testData'
import { formatDuration, getStatusIcon, truncateText } from '../utils/formatters'
import Button from '../components/shared/Button.vue'
import DataTable from '../components/shared/DataTable.vue'
import SearchInput from '../components/shared/SearchInput.vue'
import TestDetailsModal from '../components/modals/TestDetailsModal.vue'

const route = useRoute()
const store = useTestDataStore()

const searchQuery = ref('')
const selectedStatus = ref('')
const selectedSuite = ref('')

// Modal state
const modalOpen = ref(false)
const selectedTest = ref<any>(null)

const columns = [
  { key: 'status', label: 'Status', sortable: true },
  { key: 'name', label: 'Test Name', sortable: true },
  { key: 'time', label: 'Duration', sortable: true },
]

const suites = computed(() => {
  const uniqueSuites = new Set<string>()
  store.cases.forEach(testCase => {
    if (testCase.suite_name) uniqueSuites.add(testCase.suite_name)
  })
  return Array.from(uniqueSuites).sort()
})

const filteredCases = computed(() => {
  let filtered = [...store.cases]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(testCase =>
      testCase.name?.toLowerCase().includes(query) ||
      testCase.classname?.toLowerCase().includes(query)
    )
  }

  if (selectedStatus.value) {
    filtered = filtered.filter(testCase => testCase.status === selectedStatus.value)
  }

  if (selectedSuite.value) {
    filtered = filtered.filter(testCase => testCase.suite_name === selectedSuite.value)
  }

  return filtered
})

const hasActiveFilters = computed(() => {
  return !!(searchQuery.value || selectedStatus.value || selectedSuite.value)
})

const clearFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = ''
  selectedSuite.value = ''
}

const loadData = async () => {
  try {
    const filters = route.query.run_id ? { run_id: route.query.run_id as string } : {}
    await store.fetchCases(filters)
  } catch (error) {
    console.error('Failed to load test cases:', error)
  }
}

const handleRowClick = (row: any) => {
  selectedTest.value = row
  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
}

onMounted(() => {
  loadData()
})
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
