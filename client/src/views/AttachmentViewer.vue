<template>
  <div class="attachment-viewer">
    <header class="viewer-header">
      <div>
        <h1>{{ fileName || 'Attachment' }}</h1>
        <p v-if="contentType">{{ contentType }}</p>
      </div>
      <div class="viewer-actions">
        <a v-if="objectUrl" :href="objectUrl" :download="fileName" class="download-link">
          Download
        </a>
        <Button variant="secondary" @click="closeViewer">Close</Button>
      </div>
    </header>

    <div v-if="loading" class="viewer-state">Loading attachment…</div>
    <div v-else-if="error" class="viewer-state error" role="alert">{{ error }}</div>
    <pre v-else-if="textContent !== null" class="attachment-content">{{ textContent }}</pre>
    <img
      v-else-if="isImage && objectUrl"
      :src="objectUrl"
      :alt="fileName"
      class="attachment-image"
    />
    <div v-else class="viewer-state">
      Preview is unavailable for this file type. Use Download to save the attachment.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '../components/shared/Button.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const fileName = ref('attachment')
const contentType = ref('')
const textContent = ref<string | null>(null)
const objectUrl = ref('')
const isImage = computed(() => contentType.value.startsWith('image/'))

const parseFilename = (header: string | null) => {
  const encoded = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) return decodeURIComponent(encoded)
  return header?.match(/filename="([^"]+)"/i)?.[1] ?? 'attachment'
}

const loadAttachment = async () => {
  try {
    const response = await fetch(
      `/api/v1/attachments/${encodeURIComponent(String(route.params.id))}`
    )
    if (!response.ok) throw new Error(`Attachment request failed with HTTP ${response.status}`)

    const blob = await response.blob()
    contentType.value =
      (response.headers.get('content-type') || blob.type || '').split(';')[0] ?? ''
    fileName.value = parseFilename(response.headers.get('content-disposition'))
    objectUrl.value = URL.createObjectURL(blob)
    if (contentType.value.startsWith('text/') || contentType.value === 'application/json') {
      textContent.value = await blob.text()
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Failed to load attachment'
  } finally {
    loading.value = false
  }
}

const closeViewer = () => {
  window.close()
  if (!window.closed) router.push('/cases')
}

onMounted(loadAttachment)
onUnmounted(() => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})
</script>

<style scoped>
.attachment-viewer {
  width: min(1400px, 100%);
  min-height: calc(100vh - 12rem);
  margin: 0 auto;
  padding: 2rem;
}
.viewer-header,
.viewer-actions {
  display: flex;
  align-items: center;
}
.viewer-header {
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.viewer-header h1,
.viewer-header p {
  margin: 0;
}
.viewer-header p {
  margin-top: 0.25rem;
  color: var(--text-secondary);
}
.viewer-actions {
  gap: 0.75rem;
}
.download-link {
  padding: 0.5rem 1rem;
  color: white;
  background: var(--primary-color);
  border-radius: 0.375rem;
  text-decoration: none;
}
.attachment-content,
.viewer-state {
  margin: 0;
  padding: 1.25rem;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
}
.attachment-content {
  min-height: 20rem;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font:
    0.875rem/1.5 ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;
}
.attachment-image {
  display: block;
  max-width: 100%;
  margin: 0 auto;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
}
.viewer-state.error {
  color: var(--error-color);
  background: var(--error-bg);
}
@media (max-width: 600px) {
  .attachment-viewer {
    padding: 1rem;
  }
  .viewer-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
