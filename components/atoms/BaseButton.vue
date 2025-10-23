<script setup lang="ts">
import { computed } from "vue";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }>(),
  {
    variant: "primary",
    size: "md",
    disabled: false,
    type: "button",
  },
);

const emit = defineEmits<(e: "click", event: MouseEvent) => void>();

const classes = computed(() =>
  [
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
    props.size === "sm"
      ? "h-8 px-3 text-sm"
      : props.size === "lg"
        ? "h-11 px-6 text-base"
        : "h-9 px-4 text-sm",
    props.variant === "primary" && !props.disabled
      ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600"
      : "",
    props.variant === "secondary" && !props.disabled
      ? "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400"
      : "",
    props.variant === "ghost"
      ? "bg-transparent text-gray-900 hover:bg-gray-100 focus:ring-gray-400"
      : "",
    props.variant === "danger" && !props.disabled
      ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
      : "",
    props.disabled ? "opacity-50 cursor-not-allowed" : "",
  ]
    .filter(Boolean)
    .join(" "),
);
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled" @click="(e) => emit('click', e)">
    <slot />
  </button>
</template>


