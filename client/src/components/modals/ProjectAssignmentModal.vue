<template>
  <Modal :open="open" title="Assign Project" size="md" @close="handleClose">
    <div class="project-form">
      <div class="form-group">
        <label for="project-name">Project name <span class="required">*</span></label>
        <input
          id="project-name"
          v-model="projectName"
          list="known-projects"
          type="text"
          maxlength="200"
          autocomplete="off"
          placeholder="e.g., xtg-pdw-gcs-hub-test"
          class="form-input"
          :disabled="loading"
          @keydown.enter="handleSubmit"
        />
        <datalist id="known-projects">
          <option v-for="project in projects" :key="project" :value="project" />
        </datalist>
        <p class="help-text">Choose an existing project or enter a new project name.</p>
      </div>

      <div v-if="error" class="error-message" role="alert">{{ error }}</div>
      <div class="selected-runs-info">
        <strong>{{ runIds.length }}</strong> test run{{ runIds.length === 1 ? '' : 's' }} will be
        assigned
      </div>
    </div>

    <template #footer>
      <Button variant="secondary" :disabled="loading" @click="handleClose">Cancel</Button>
      <Button
        variant="primary"
        :loading="loading"
        :disabled="!projectName.trim()"
        @click="handleSubmit"
      >
        Assign Project
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { apiClient } from '../../api/client'
import Button from '../shared/Button.vue'
import Modal from '../shared/Modal.vue'

const props = defineProps<{
  open: boolean
  runIds: string[]
  projects: string[]
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const projectName = ref('')
const loading = ref(false)
const error = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      projectName.value = ''
      error.value = ''
    }
  }
)

const handleClose = () => {
  if (!loading.value) emit('close')
}

const handleSubmit = async () => {
  const jobName = projectName.value.trim()
  if (!jobName || loading.value) return

  loading.value = true
  error.value = ''
  try {
    await apiClient.batchUpdateRuns(props.runIds, { job_name: jobName })
    emit('success')
    emit('close')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to assign project'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.project-form,
.form-group {
  display: flex;
  flex-direction: column;
}
.project-form {
  gap: 1.5rem;
}
.form-group {
  gap: 0.5rem;
}
.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
}
.required,
.error-message {
  color: var(--error-color);
}
.form-input {
  padding: 0.625rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  color: var(--text-primary);
  background: var(--bg-primary);
}
.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-bg);
}
.help-text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.75rem;
}
.error-message,
.selected-runs-info {
  padding: 0.75rem;
  border-radius: 0.375rem;
}
.error-message {
  background: var(--error-bg);
}
.selected-runs-info {
  color: var(--text-secondary);
  background: var(--info-bg);
}
</style>
