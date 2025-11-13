<template>
  <Modal
    :open="open"
    title="Tag Test Runs as Release"
    size="md"
    @close="handleClose"
  >
    <div class="release-tag-form">
      <div class="form-group">
        <label for="release-tag">Release Tag <span class="required">*</span></label>
        <input
          id="release-tag"
          v-model="releaseTag"
          type="text"
          placeholder="e.g., v1.2.0, release-2024-01"
          class="form-input"
          :disabled="loading"
        />
        <p class="help-text">A unique identifier for this release (e.g., version tag, release name)</p>
      </div>

      <div class="form-group">
        <label for="release-version">Release Version</label>
        <input
          id="release-version"
          v-model="releaseVersion"
          type="text"
          placeholder="e.g., 1.2.0"
          class="form-input"
          :disabled="loading"
        />
        <p class="help-text">Semantic version number (optional)</p>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="selected-runs-info">
        <strong>{{ runIds.length }}</strong> test run{{ runIds.length > 1 ? 's' : '' }} will be tagged
      </div>
    </div>

    <template #footer>
      <Button
        @click="handleClose"
        variant="secondary"
        :disabled="loading"
      >
        Cancel
      </Button>
      <Button
        @click="handleSubmit"
        variant="primary"
        :loading="loading"
        :disabled="!releaseTag"
      >
        Tag Release
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '../shared/Modal.vue'
import Button from '../shared/Button.vue'
import { apiClient } from '../../api/client'

interface Props {
  open: boolean
  runIds: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const releaseTag = ref('')
const releaseVersion = ref('')
const loading = ref(false)
const error = ref('')

// Reset form when modal opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    releaseTag.value = ''
    releaseVersion.value = ''
    error.value = ''
  }
})

const handleClose = () => {
  if (!loading.value) {
    emit('close')
  }
}

const handleSubmit = async () => {
  if (!releaseTag.value) {
    error.value = 'Release tag is required'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await apiClient.batchUpdateRuns(props.runIds, {
      release_tag: releaseTag.value,
      release_version: releaseVersion.value || null
    })

    emit('success')
    emit('close')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to tag release'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.release-tag-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.required {
  color: var(--error-color);
}

.form-input {
  padding: 0.625rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: all 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.help-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}

.error-message {
  padding: 0.75rem;
  background: var(--error-bg);
  color: var(--error-color);
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.selected-runs-info {
  padding: 0.75rem;
  background: var(--info-bg);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.selected-runs-info strong {
  color: var(--primary-color);
}
</style>
