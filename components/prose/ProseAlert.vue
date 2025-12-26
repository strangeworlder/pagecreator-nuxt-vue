<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type?: 'note' | 'tip' | 'important' | 'warning' | 'caution'
  title?: string
}>()

const titles: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution'
}

const computedTitle = computed(() => {
  if (props.title) return props.title
  if (props.type && titles[props.type]) return titles[props.type]
  return ''
})
</script>

<template>
  <div class="prose-alert" :class="type">
    <div class="prose-alert-content">
      <p v-if="computedTitle" class="alert-title">{{ computedTitle }}</p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.prose-alert {
  padding: 1rem;
  border-left: 4px solid;
  margin: 1.5rem 0;
  background-color: var(--color-bg-mute, #f9fafb);
  border-radius: 0 0.5rem 0.5rem 0;
}

.prose-alert-content {
  font-size: 0.95em;
}

.alert-title {
  margin-right: 0.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-transform: capitalize;
}

.prose-alert.note { border-color: var(--color-note); background-color: var(--color-note-bg); }
.prose-alert.tip { border-color: var(--color-tip); background-color: var(--color-tip-bg); }
.prose-alert.important { border-color: var(--color-important); background-color: var(--color-important-bg); }
.prose-alert.warning { border-color: var(--color-warning); background-color: var(--color-warning-bg); }
.prose-alert.caution { border-color: var(--color-caution); background-color: var(--color-caution-bg); }
</style>
