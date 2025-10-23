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
    class="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
    @input="onInput"
  />
</template>


