<template>
  <div class="stack-trace-container">
    <div v-if="collapsible" class="stack-trace-header">
      <button @click="isExpanded = !isExpanded" class="expand-button">
        <span class="icon">{{ isExpanded ? '▼' : '▶' }}</span>
        <span>{{ isExpanded ? 'Collapse' : 'Expand' }} Stack Trace</span>
      </button>
      <button @click="copyToClipboard" class="copy-button" title="Copy to clipboard">
        📋 Copy
      </button>
    </div>

    <div v-if="!collapsible || isExpanded" class="stack-trace">
      <pre v-for="(line, index) in displayedLines" :key="index" :class="getLineClass(line)">{{ line }}</pre>

      <button
        v-if="collapsible && hasMoreLines"
        @click="showAllLines = !showAllLines"
        class="show-more-button"
      >
        {{ showAllLines ? 'Show Less' : `Show ${remainingLines} More Lines` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  stackTrace: string
  language?: 'java' | 'python' | 'javascript'
  collapsible?: boolean
  initialLines?: number
}

const props = withDefaults(defineProps<Props>(), {
  language: 'java',
  collapsible: false,
  initialLines: 10
})

const isExpanded = ref(!props.collapsible)
const showAllLines = ref(false)

const lines = computed(() => {
  return props.stackTrace.split('\n').filter(line => line.trim())
})

const displayedLines = computed(() => {
  if (!props.collapsible || showAllLines.value) {
    return lines.value
  }
  return lines.value.slice(0, props.initialLines)
})

const hasMoreLines = computed(() => {
  return lines.value.length > props.initialLines
})

const remainingLines = computed(() => {
  return lines.value.length - props.initialLines
})

const getLineClass = (line: string): string => {
  const trimmed = line.trim()

  // Java patterns
  if (props.language === 'java') {
    if (trimmed.startsWith('at ')) {
      // Highlight user code (not framework code)
      if (
        !trimmed.includes('org.junit') &&
        !trimmed.includes('org.testng') &&
        !trimmed.includes('java.lang') &&
        !trimmed.includes('sun.reflect') &&
        !trimmed.includes('org.springframework')
      ) {
        return 'frame user-code'
      }
      return 'frame framework-code'
    }
    if (trimmed.startsWith('Caused by:')) return 'caused-by'
    if (trimmed.startsWith('...')) return 'ellipsis'
  }

  // Python patterns
  if (props.language === 'python') {
    if (trimmed.startsWith('File "')) return 'frame user-code'
    if (trimmed.includes('Traceback')) return 'traceback-header'
  }

  // JavaScript patterns
  if (props.language === 'javascript') {
    if (trimmed.startsWith('at ')) {
      if (!trimmed.includes('node_modules')) {
        return 'frame user-code'
      }
      return 'frame framework-code'
    }
  }

  return 'frame'
}

const copyToClipboard = () => {
  console.log('[ErrorStackTrace] copyToClipboard called, stackTrace length:', props.stackTrace?.length)

  // Check if Clipboard API is available
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(props.stackTrace).then(() => {
      console.log('[ErrorStackTrace] Stack trace copied to clipboard successfully')
      alert('Stack trace copied to clipboard!')
    }).catch(err => {
      console.error('[ErrorStackTrace] Failed to copy stack trace to clipboard:', err)
      alert(`Failed to copy stack trace: ${err.message}`)
    })
  } else {
    // Fallback for browsers/contexts where Clipboard API is not available
    console.warn('[ErrorStackTrace] Clipboard API not available, using fallback')
    fallbackCopyToClipboard()
  }
}

const fallbackCopyToClipboard = () => {
  const textArea = document.createElement('textarea')
  textArea.value = props.stackTrace
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    const successful = document.execCommand('copy')
    if (successful) {
      console.log('[ErrorStackTrace] Stack trace copied using fallback method')
      alert('Stack trace copied to clipboard!')
    } else {
      console.error('[ErrorStackTrace] Fallback copy failed')
      alert('Failed to copy stack trace')
    }
  } catch (err) {
    console.error('[ErrorStackTrace] Fallback copy error:', err)
    alert(`Failed to copy stack trace: ${err}`)
  } finally {
    document.body.removeChild(textArea)
  }
}
</script>

<style scoped>
.stack-trace-container {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 0.8125rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  overflow: hidden;
}

.stack-trace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.expand-button,
.copy-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.expand-button:hover,
.copy-button:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.icon {
  font-size: 0.625rem;
}

.stack-trace {
  padding: 0.75rem;
  background: var(--bg-secondary);
  overflow-x: auto;
  max-height: 500px;
  overflow-y: auto;
}

.stack-trace pre {
  margin: 0;
  padding: 0.25rem 0;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.frame {
  color: var(--text-secondary);
}

.frame.user-code {
  color: var(--text-primary);
  font-weight: 500;
  background: rgba(59, 130, 246, 0.05);
  padding-left: 0.5rem;
  margin-left: -0.5rem;
  border-left: 2px solid var(--primary-color);
}

.frame.framework-code {
  color: var(--text-secondary);
  opacity: 0.6;
}

.caused-by {
  color: var(--error-color);
  font-weight: 600;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.traceback-header {
  color: var(--text-secondary);
  font-weight: 600;
}

.ellipsis {
  color: var(--text-secondary);
  opacity: 0.5;
  font-style: italic;
}

.show-more-button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--primary-color);
  background: transparent;
  border: 1px solid var(--primary-color);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.show-more-button:hover {
  background: var(--primary-bg);
}
</style>
