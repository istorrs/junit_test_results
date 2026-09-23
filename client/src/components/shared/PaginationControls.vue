<template>
  <nav class="pagination-controls" aria-label="Table pagination">
    <label class="page-size-control">
      Rows per page
      <select :value="limit" @change="handleLimitChange">
        <option v-for="option in pageSizeOptions" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
    </label>

    <span class="result-range" aria-live="polite">
      Showing {{ startItem }}–{{ endItem }} of {{ total }}
    </span>

    <div class="page-navigation">
      <Button size="sm" variant="secondary" :disabled="page <= 1" @click="changePage(page - 1)">
        Previous
      </Button>

      <label v-if="pages > 1" class="page-control">
        Page
        <select :value="page" @change="handlePageChange">
          <option v-for="pageNumber in pages" :key="pageNumber" :value="pageNumber">
            {{ pageNumber }}
          </option>
        </select>
        of {{ pages }}
      </label>
      <span v-else>Page 1 of 1</span>

      <Button size="sm" variant="secondary" :disabled="page >= pages" @click="changePage(page + 1)">
        Next
      </Button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from './Button.vue'

const props = withDefaults(
  defineProps<{
    page: number
    limit: number
    total: number
    pages: number
    pageSizeOptions?: number[]
  }>(),
  {
    pageSizeOptions: () => [25, 50, 100, 250, 500, 1000],
  }
)

const emit = defineEmits<{
  'page-change': [page: number]
  'limit-change': [limit: number]
}>()

const startItem = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.limit + 1))
const endItem = computed(() => Math.min(props.page * props.limit, props.total))

const changePage = (page: number) => {
  if (page >= 1 && page <= Math.max(props.pages, 1) && page !== props.page) {
    emit('page-change', page)
  }
}

const handlePageChange = (event: Event) => {
  changePage(Number((event.target as HTMLSelectElement).value))
}

const handleLimitChange = (event: Event) => {
  const limit = Number((event.target as HTMLSelectElement).value)
  if (limit !== props.limit) emit('limit-change', limit)
}
</script>

<style scoped>
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.page-size-control,
.page-control,
.page-navigation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

select {
  padding: 0.375rem 0.5rem;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
}

@media (max-width: 768px) {
  .pagination-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .page-navigation {
    justify-content: space-between;
  }

  .result-range {
    text-align: center;
  }
}
</style>
