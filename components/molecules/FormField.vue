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
  <div class="w-full">
    <BaseLabel :for-id="id">
      {{ label }}<span v-if="required" aria-hidden="true" class="text-red-600"> *</span>
    </BaseLabel>

    <slot name="control" :id="id" :ariaDescribedBy="describedBy" />

    <p v-if="helpText" :id="`${id}-help`" class="mt-1 text-xs text-gray-500">
      {{ helpText }}
    </p>
    <p v-if="error" :id="`${id}-error`" class="mt-1 text-xs text-red-600">
      {{ error }}
    </p>
  </div>
</template>


