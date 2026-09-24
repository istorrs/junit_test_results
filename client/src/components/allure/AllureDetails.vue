<template>
  <div class="allure-details">
    <p v-if="test.description" class="description">{{ test.description }}</p>
    <section v-if="test.attachments?.length">
      <h3>Test Attachments</h3>
      <div class="attachments">
        <a
          v-for="attachment in test.attachments"
          :key="attachment.source"
          :href="attachment.attachment_id ? `/attachments/${attachment.attachment_id}` : '#'"
          :aria-disabled="!attachment.attachment_id"
          :class="{ unavailable: !attachment.attachment_id }"
          target="_blank"
          rel="noopener noreferrer"
        >
          View {{ attachment.name
          }}<span v-if="attachment.size"> ({{ formatFileSize(attachment.size) }})</span>
        </a>
      </div>
    </section>
    <section v-if="test.steps?.length">
      <h3>Test Steps</h3>
      <ul class="step-list">
        <AllureStep
          v-for="(step, index) in test.steps"
          :key="`${step.name}-${index}`"
          :step="step"
        />
      </ul>
    </section>
    <section v-if="test.fixtures?.befores?.length">
      <h3>Setup Fixtures</h3>
      <ul class="step-list">
        <AllureStep
          v-for="(step, index) in test.fixtures.befores"
          :key="`${step.name}-${index}`"
          :step="step"
        />
      </ul>
    </section>
    <section v-if="test.fixtures?.afters?.length">
      <h3>Teardown Fixtures</h3>
      <ul class="step-list">
        <AllureStep
          v-for="(step, index) in test.fixtures.afters"
          :key="`${step.name}-${index}`"
          :step="step"
        />
      </ul>
    </section>
    <section v-if="test.labels?.length">
      <h3>Labels</h3>
      <dl class="metadata">
        <template v-for="label in test.labels" :key="`${label.name}-${label.value}`"
          ><dt>{{ label.name }}</dt>
          <dd>{{ label.value }}</dd></template
        >
      </dl>
    </section>
    <section v-if="test.parameters?.length">
      <h3>Parameters</h3>
      <dl class="metadata">
        <template v-for="parameter in test.parameters" :key="parameter.name">
          <dt>{{ parameter.name }}</dt>
          <dd>{{ String(parameter.value ?? '') }}</dd>
        </template>
      </dl>
    </section>
    <section v-if="test.links?.length">
      <h3>Links</h3>
      <div class="attachments">
        <a
          v-for="link in test.links"
          :key="link.url"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ link.name || link.url }}
        </a>
      </div>
    </section>
    <section v-if="test.run_allure_metadata?.executor">
      <h3>Executor</h3>
      <dl class="metadata">
        <template v-for="(value, key) in test.run_allure_metadata.executor" :key="String(key)">
          <dt>{{ key }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
    </section>
    <section
      v-if="
        test.run_allure_metadata?.environment &&
        Object.keys(test.run_allure_metadata.environment).length
      "
    >
      <h3>Environment</h3>
      <dl class="metadata">
        <template v-for="(value, key) in test.run_allure_metadata.environment" :key="String(key)">
          <dt>{{ key }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { TestCase } from '../../api/client'
import { formatFileSize } from '../../utils/formatters'
import AllureStep from './AllureStep.vue'

defineProps<{ test: TestCase }>()
</script>

<style scoped>
.allure-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.description {
  white-space: pre-wrap;
}
.step-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.metadata {
  display: grid;
  grid-template-columns: minmax(7rem, auto) 1fr;
  gap: 0.35rem 1rem;
}
.metadata dt {
  font-weight: 600;
}
.metadata dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.unavailable {
  pointer-events: none;
  opacity: 0.55;
}
</style>
