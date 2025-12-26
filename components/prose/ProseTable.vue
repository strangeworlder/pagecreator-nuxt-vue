<template>
  <div class="prose-table-wrapper">
    <table>
      <slot />
    </table>
  </div>
</template>

<style scoped>
.prose-table-wrapper {
  overflow-x: auto;
  margin: 1.5rem 0;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border, #e5e7eb);
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875em;
}
</style>
