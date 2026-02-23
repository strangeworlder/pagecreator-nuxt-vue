<script setup lang="ts">
const { theme, toggleTheme } = useTheme();
</script>

<template>
  <button
    type="button"
    :aria-pressed="theme === 'dark'"
    @click="toggleTheme()"
  >
    <span v-if="theme === 'dark'">Dark</span>
    <span v-else>Light</span>
  </button>
</template>


<style scoped>
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-md);
  font-size: var(--size-2);
  background: transparent;
  color: var(--color-fg);
}
button:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
