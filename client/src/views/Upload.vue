<template>
  <div class="upload">
    <h1>Upload Test Results</h1>

    <Card>
      <div class="upload-area">
        <input
          ref="fileInput"
          type="file"
          accept=".xml"
          @change="handleFileSelect"
          class="file-input"
        />

        <div class="upload-content">
          <div class="upload-icon">📁</div>
          <h3>Upload JUnit XML File</h3>
          <p>Click or drag and drop your test results file</p>
          <Button @click="triggerFileInput">Select File</Button>
        </div>

        <div v-if="selectedFile" class="selected-file">
          <strong>Selected:</strong> {{ selectedFile.name }}
          ({{ formatFileSize(selectedFile.size) }})
        </div>
      </div>

      <template #footer>
        <Button @click="clearSelection" variant="secondary" :disabled="!selectedFile">
          Clear
        </Button>
        <Button
          @click="uploadFile"
          :loading="store.loading"
          :disabled="!selectedFile || store.loading"
        >
          Upload
        </Button>
      </template>
    </Card>

    <Modal :open="showSuccessModal" @close="closeSuccessModal" title="Upload Successful">
      <p>Your test results have been uploaded successfully!</p>
      <template #footer>
        <Button @click="viewResults" variant="success">View Results</Button>
        <Button @click="closeSuccessModal" variant="secondary">Close</Button>
      </template>
    </Modal>

    <Modal :open="!!uploadError" @close="clearError" title="Upload Failed">
      <div class="error-content">
        <p>{{ uploadError }}</p>
      </div>
      <template #footer>
        <Button @click="clearError" variant="danger">Close</Button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTestDataStore } from '../stores/testData'
import { formatFileSize } from '../utils/formatters'
import Button from '../components/shared/Button.vue'
import Card from '../components/shared/Card.vue'
import Modal from '../components/shared/Modal.vue'

const router = useRouter()
const store = useTestDataStore()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const showSuccessModal = ref(false)
const uploadError = ref<string | null>(null)

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
  }
}

const clearSelection = () => {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const uploadFile = async () => {
  if (!selectedFile.value) return

  uploadError.value = null

  try {
    await store.uploadFile(selectedFile.value)
    showSuccessModal.value = true
    clearSelection()
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : 'Failed to upload file. Please try again.'
  }
}

const viewResults = () => {
  showSuccessModal.value = false
  router.push('/')
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
}

const clearError = () => {
  uploadError.value = null
}
</script>

<style scoped>
.upload {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: #111827;
  text-align: center;
}

.upload-area {
  position: relative;
  min-height: 300px;
}

.file-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  text-align: center;
  transition: all 0.2s;
}

.upload-content:hover {
  border-color: #3b82f6;
  background: #f9fafb;
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.upload-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #111827;
}

.upload-content p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.selected-file {
  margin-top: 1rem;
  padding: 1rem;
  background: #f3f4f6;
  border-radius: 0.375rem;
  text-align: center;
}

.error-content {
  color: #dc2626;
  padding: 1rem;
}
</style>
