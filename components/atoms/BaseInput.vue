<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    type?: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    ariaDescribedby?: string | undefined;
  }>(),
  {
    modelValue: "",
    type: "text",
    id: undefined,
    placeholder: "",
    disabled: false,
    ariaDescribedby: undefined,
  },
);

const emit = defineEmits<(e: "update:modelValue", value: string | number) => void>();

function onInput(e: Event) {
  const target = e.target as HTMLInputElement;
  emit("update:modelValue", props.type === "number" ? Number(target.value) : target.value);
}
</script>

<template>
  <input
    :id="id"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :aria-describedby="ariaDescribedby"
    :disabled="disabled"
    @input="onInput"
  />
</template>

<style scoped>
input {
  display: block;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-fg);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--size-2);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
input:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-color: var(--color-accent);
}
</style>
