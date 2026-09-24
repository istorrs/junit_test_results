<template>
  <div class="async-entity-select">
    <input
      :id="`${inputId}-search`"
      v-model="search"
      type="search"
      class="entity-search"
      :aria-label="searchLabel"
      :placeholder="searchPlaceholder"
    />
    <select
      :id="inputId"
      class="entity-select"
      :value="modelValue"
      :disabled="loading"
      @change="handleSelection"
    >
      <option value="">{{ placeholder }}</option>
      <option
        v-if="selectedOption && !options.some((option) => option.value === selectedOption?.value)"
        :value="selectedOption.value"
      >
        {{ selectedOption.label }}
      </option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <div class="entity-pagination" aria-live="polite">
      <span v-if="loading">Loading options…</span>
      <span v-else-if="error" class="load-error">{{ error }}</span>
      <span v-else>
        {{ total }} result{{ total === 1 ? '' : 's' }} · Page {{ page }} of {{ pages }}
      </span>
      <div class="page-actions">
        <button type="button" :disabled="loading || page <= 1" @click="page -= 1">Previous</button>
        <button type="button" :disabled="loading || page >= pages" @click="page += 1">Next</button>
        <button v-if="error" type="button" @click="loadPage">Try again</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface EntityOption {
  value: string
  label: string
}

export interface EntityOptionsPage {
  options: EntityOption[]
  total: number
  pages: number
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    inputId: string
    placeholder: string
    searchLabel: string
    searchPlaceholder?: string
    pageSize?: number
    reloadKey?: string
    // eslint-disable-next-line no-unused-vars
    loadOptions: (search: string, page: number, limit: number) => Promise<EntityOptionsPage>
  }>(),
  {
    searchPlaceholder: 'Search…',
    pageSize: 25,
    reloadKey: '',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const search = ref('')
const page = ref(1)
const pages = ref(1)
const total = ref(0)
const options = ref<EntityOption[]>([])
const selectedOption = ref<EntityOption | null>(null)
const loading = ref(false)
const error = ref('')
let requestId = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

const loadPage = async () => {
  const currentRequest = ++requestId
  loading.value = true
  error.value = ''
  try {
    const result = await props.loadOptions(search.value.trim(), page.value, props.pageSize)
    if (currentRequest !== requestId) return
    options.value = result.options
    total.value = result.total
    pages.value = Math.max(result.pages, 1)
    if (page.value > pages.value) page.value = pages.value
    const current = result.options.find((option) => option.value === props.modelValue)
    if (current) selectedOption.value = current
  } catch (loadError) {
    if (currentRequest !== requestId) return
    error.value = loadError instanceof Error ? loadError.message : 'Failed to load options'
    options.value = []
    total.value = 0
    pages.value = 1
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

const handleSelection = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  selectedOption.value = options.value.find((option) => option.value === value) || null
  emit('update:modelValue', value)
}

watch(search, () => {
  clearTimeout(searchTimer)
  page.value = 1
  searchTimer = setTimeout(loadPage, 250)
})
watch(page, loadPage)
watch(
  () => props.reloadKey,
  () => {
    search.value = ''
    page.value = 1
    selectedOption.value = null
    loadPage()
  }
)
watch(
  () => props.modelValue,
  (value) => {
    if (!value) selectedOption.value = null
  }
)

onMounted(loadPage)
onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  requestId += 1
})
</script>

<style scoped>
.async-entity-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.entity-search,
.entity-select {
  width: 100%;
  padding: 0.75rem;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  font: inherit;
}

.entity-search:focus,
.entity-select:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

.entity-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 1.75rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.page-actions {
  display: flex;
  gap: 0.25rem;
}

.page-actions button {
  padding: 0.25rem 0.5rem;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
}

.page-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.load-error {
  color: var(--error-color);
}
</style>
