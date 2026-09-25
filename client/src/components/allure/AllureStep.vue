<template>
  <li class="allure-step">
    <div class="step-summary">
      <span
        :class="['step-status', displayStatus]"
        :data-test-status="normalizeResultStatus(displayStatus)"
        >{{ displayStatus }}</span
      >
      <strong>{{ step.name }}</strong>
      <span v-if="step.time !== undefined" class="step-time">{{
        formatDuration(step.time * 1000)
      }}</span>
    </div>
    <div v-if="step.attachments?.length" class="step-attachments">
      <a
        v-for="attachment in step.attachments"
        :key="`${attachment.source}-${attachment.name}`"
        :href="attachmentUrl(attachment.attachment_id)"
        :aria-disabled="!attachment.attachment_id"
        :class="{ unavailable: !attachment.attachment_id }"
        target="_blank"
        rel="noopener noreferrer"
      >
        View {{ attachment.name
        }}<span v-if="attachment.size"> ({{ formatFileSize(attachment.size) }})</span>
      </a>
    </div>
    <ul v-if="step.steps?.length" class="nested-steps">
      <AllureStep
        v-for="(child, index) in step.steps"
        :key="`${child.name}-${index}`"
        :step="child"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AllureStep } from '../../api/client'
import { formatDuration, formatFileSize } from '../../utils/formatters'
import { normalizeResultStatus } from '../../utils/statusColors'

const props = defineProps<{ step: AllureStep }>()
const displayStatus = computed(() => {
  const details = props.step.status_details || {}
  const hasFailureDetails = Boolean(details.message || details.trace || Object.keys(details).length)
  const isLegacyMissingStatus =
    props.step.status === 'error' &&
    Boolean(props.step.start) &&
    !props.step.stop &&
    (props.step.time ?? 0) === 0 &&
    !hasFailureDetails

  return isLegacyMissingStatus ? 'unknown' : props.step.status
})
const attachmentUrl = (id?: string) => (id ? `/attachments/${id}` : '#')
</script>

<style scoped>
.allure-step {
  margin: 0.5rem 0;
}
.step-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 0.375rem;
}
.step-status {
  min-width: 4.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}
.step-time {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 0.75rem;
}
.nested-steps {
  margin-left: 1.25rem;
  padding-left: 0.75rem;
  border-left: 2px solid var(--border-color);
}
.step-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.35rem 0.5rem;
}
.unavailable {
  pointer-events: none;
  opacity: 0.55;
}
</style>
