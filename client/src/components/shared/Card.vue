<template>
  <div :class="cardClasses" @click="handleClick">
    <div v-if="title || $slots.title" class="card-header">
      <slot name="title">
        <h3 class="card-title">{{ title }}</h3>
      </slot>
    </div>

    <div class="card-body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  noPadding?: boolean
  noShadow?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  noPadding: false,
  noShadow: false,
  clickable: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const cardClasses = computed(() => [
  'card',
  {
    'card-padded': !props.noPadding,
    'card-shadow': !props.noShadow,
    'card-clickable': props.clickable,
  },
])

const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>

<style scoped>
.card {
  background: var(--bg-primary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.card-shadow {
  box-shadow: var(--shadow-sm);
}

.card-padded .card-body {
  padding: 1.5rem;
}

.card-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.card-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.card-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.card-clickable {
  cursor: pointer;
  transition: all 0.2s;
}

.card-clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
</style>
