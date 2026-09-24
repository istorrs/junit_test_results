<template>
  <div class="data-table">
    <div v-if="$slots.filters" class="table-filters">
      <slot name="filters" />
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="{ sortable: column.sortable }"
              scope="col"
              :aria-sort="column.sortable ? getAriaSort(column.key) : undefined"
            >
              <button
                v-if="column.sortable"
                type="button"
                class="sort-button th-content"
                @click="handleSort(column.key)"
              >
                {{ column.label }}
                <span class="sort-icon" aria-hidden="true">
                  <span v-if="activeSortKey === column.key">
                    {{ activeSortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                  <span v-else class="sort-placeholder">↕</span>
                </span>
              </button>
              <div v-else class="th-content">{{ column.label }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length" class="loading-cell">
              <div class="loading-spinner"></div>
              Loading...
            </td>
          </tr>
          <tr v-else-if="sortedData.length === 0">
            <td :colspan="columns.length" class="empty-cell">No data available</td>
          </tr>
          <tr
            v-for="(row, index) in paginatedData"
            v-else
            :key="index"
            :class="{ clickable: rowClickable }"
            :tabindex="rowClickable ? 0 : undefined"
            :aria-label="rowClickable ? getRowAriaLabel(row, index) : undefined"
            @click="rowClickable ? $emit('row-click', row) : null"
            @keydown.enter="rowClickable ? $emit('row-click', row) : null"
            @keydown.space.prevent="rowClickable ? $emit('row-click', row) : null"
          >
            <td v-for="column in columns" :key="column.key">
              <slot :name="`cell-${column.key}`" :row="row" :value="getCellValue(row, column.key)">
                {{ getCellValue(row, column.key) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="paginate && totalPages > 1" class="table-pagination">
      <Button
        size="sm"
        variant="secondary"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        Previous
      </Button>

      <div class="page-numbers">
        <button
          v-for="page in visiblePages"
          :key="page"
          :class="['page-btn', { active: page === currentPage }]"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
      </div>

      <Button
        size="sm"
        variant="secondary"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        Next
      </Button>

      <div class="page-info">
        Page {{ currentPage }} of {{ totalPages }} ({{ sortedData.length }} total)
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from './Button.vue'

interface Column {
  key: string
  label: string
  sortable?: boolean
}

interface Props {
  columns: Column[]
  data: Record<string, any>[]
  loading?: boolean
  paginate?: boolean
  pageSize?: number
  rowClickable?: boolean
  manualSort?: boolean
  sortKey?: string
  sortOrder?: 'asc' | 'desc'
  // eslint-disable-next-line no-unused-vars
  rowAriaLabel?: (row: Record<string, unknown>, index: number) => string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  paginate: true,
  pageSize: 20,
  rowClickable: false,
  manualSort: false,
  sortKey: '',
  sortOrder: 'asc',
})

const emit = defineEmits<{
  'row-click': [row: Record<string, any>]
  'sort-change': [sort: { key: string; order: 'asc' | 'desc' }]
}>()

const localSortKey = ref<string>('')
const localSortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const activeSortKey = computed(() => (props.manualSort ? props.sortKey : localSortKey.value))
const activeSortOrder = computed(() => (props.manualSort ? props.sortOrder : localSortOrder.value))

const handleSort = (key: string) => {
  const nextOrder = activeSortKey.value === key && activeSortOrder.value === 'asc' ? 'desc' : 'asc'
  if (!props.manualSort) {
    localSortKey.value = key
    localSortOrder.value = nextOrder
  }
  currentPage.value = 1
  emit('sort-change', { key, order: nextOrder })
}

const getAriaSort = (key: string): 'ascending' | 'descending' | 'none' => {
  if (activeSortKey.value !== key) return 'none'
  return activeSortOrder.value === 'asc' ? 'ascending' : 'descending'
}

const getRowAriaLabel = (row: Record<string, unknown>, index: number) =>
  props.rowAriaLabel?.(row, index) || `Open row ${index + 1}`

const getCellValue = (row: Record<string, any>, key: string) => {
  return row[key]
}

const sortedData = computed(() => {
  if (props.manualSort || !activeSortKey.value) return props.data

  return [...props.data].sort((a, b) => {
    const aVal = getCellValue(a, activeSortKey.value)
    const bVal = getCellValue(b, activeSortKey.value)

    if (aVal === bVal) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    const comparison = aVal > bVal ? 1 : -1
    return activeSortOrder.value === 'asc' ? comparison : -comparison
  })
})

const totalPages = computed(() => {
  if (!props.paginate) return 1
  return Math.ceil(sortedData.value.length / props.pageSize)
})

const paginatedData = computed(() => {
  if (!props.paginate) return sortedData.value

  const start = (currentPage.value - 1) * props.pageSize
  const end = start + props.pageSize
  return sortedData.value.slice(start, end)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages: number[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push(-1) // ellipsis
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push(-1)
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push(-1)
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push(-1)
      pages.push(total)
    }
  }

  return pages
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}
</script>

<style scoped>
.data-table {
  width: 100%;
}

.table-filters {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.table-wrapper {
  overflow-x: auto;
  background: var(--bg-primary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--bg-tertiary);
  border-bottom: 2px solid var(--border-color);
}

th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

th.sortable {
  user-select: none;
}

.sort-button {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  cursor: pointer;
}

.sort-button:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 4px;
}

.th-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-icon {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.sort-placeholder {
  opacity: 0.3;
}

tbody tr {
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}

tbody tr:hover {
  background: var(--bg-tertiary);
}

tbody tr.clickable {
  cursor: pointer;
}

tbody tr.clickable:hover {
  background: var(--primary-bg);
}

tbody tr.clickable:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: -2px;
  background: var(--primary-bg);
}

td {
  padding: 1rem;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.table-pagination {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
  flex: 1;
}

.page-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.page-btn:hover:not(.active) {
  background: var(--bg-hover);
}

.page-btn.active {
  background: #3b82f6;
  color: white;
  border-color: var(--primary-color);
}

.page-info {
  font-size: 0.875rem;
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
