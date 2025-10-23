<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    id: string;
    label: string;
    helpText?: string;
    error?: string;
    required?: boolean;
  }>(),
  {
    helpText: undefined,
    error: undefined,
    required: false,
  },
);

const describedBy = computed(() => {
  const ids: string[] = [];
  if (props.helpText) ids.push(`${props.id}-help`);
  if (props.error) ids.push(`${props.id}-error`);
  return ids.join(" ") || undefined;
});
</script>

<template>
  <div>
    <BaseLabel :for-id="id">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </BaseLabel>

    <slot name="control" :id="id" :ariaDescribedBy="describedBy" />

    <p v-if="helpText" :id="`${id}-help`">
      {{ helpText }}
    </p>
    <p v-if="error" :id="`${id}-error`">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
div {
  width: 100%;
}
label span[aria-hidden="true"] {
  color: #dc2626;
}
p[id$="-help"] {
  margin-top: 0.25rem;
  font-size: var(--size-1);
  color: var(--color-muted);
}
p[id$="-error"] {
  margin-top: 0.25rem;
  font-size: var(--size-1);
  color: #dc2626;
}
</style>


