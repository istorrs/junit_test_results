<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="spinner"></span>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  fullWidth: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => [
  'btn',
  `btn-${props.variant}`,
  `btn-${props.size}`,
  {
    'btn-disabled': props.disabled,
    'btn-loading': props.loading,
    'btn-full-width': props.fullWidth,
  },
])

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn:hover:not(.btn-disabled):not(.btn-loading) {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background-color: var(--primary-color);
  color: #ffffff;
}

.btn-primary:hover:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--primary-hover);
}

.btn-secondary {
  background-color: #6b7280;
  color: #ffffff;
}

.btn-secondary:hover:not(.btn-disabled):not(.btn-loading) {
  background-color: #4b5563;
}

.btn-danger {
  background-color: #ef4444;
  color: #ffffff;
}

.btn-danger:hover:not(.btn-disabled):not(.btn-loading) {
  background-color: #dc2626;
}

.btn-success {
  background-color: var(--success-color);
  color: #ffffff;
}

.btn-success:hover:not(.btn-disabled):not(.btn-loading) {
  background-color: var(--success-color);
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}

.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
}

.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-loading {
  opacity: 0.7;
  cursor: wait;
}

.btn-full-width {
  width: 100%;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
