<template>
  <div
    v-if="isFlaky"
    :class="['flakiness-indicator', sizeClass, severityClass]"
    :title="tooltipText"
  >
    <span class="icon">⚠️</span>
    <span class="label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  passRate: number // 0-100
  recentRuns: number
  failureCount: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showLabel: true,
})

const isFlaky = computed(() => props.passRate < 100 && props.passRate > 0)

const flakinessScore = computed(() => 100 - props.passRate)

const severityClass = computed(() => {
  if (flakinessScore.value < 10) return 'severity-low'
  if (flakinessScore.value < 30) return 'severity-medium'
  return 'severity-high'
})

const sizeClass = computed(() => `size-${props.size}`)

const label = computed(() => {
  if (!props.showLabel) return ''
  return `${Math.round(props.passRate)}%`
})

const tooltipText = computed(() => {
  return `Flaky: ${props.failureCount}/${props.recentRuns} recent runs failed (${Math.round(props.passRate)}% pass rate)`
})
</script>

<style scoped>
.flakiness-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: help;
}

.size-sm {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
}

.size-md {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.size-lg {
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
}

.severity-low {
  background: #fef3c7;
  color: #92400e;
}

.severity-medium {
  background: #fed7aa;
  color: #9a3412;
}

.severity-high {
  background: #fecaca;
  color: #991b1b;
}

[data-theme='dark'] .severity-low {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

[data-theme='dark'] .severity-medium {
  background: rgba(251, 146, 60, 0.2);
  color: #fb923c;
}

[data-theme='dark'] .severity-high {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.icon {
  font-size: 0.875em;
  line-height: 1;
}

.label {
  font-family: monospace;
}
</style>
