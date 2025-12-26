<template>
  <tr>
    <slot />
  </tr>
</template>

<style scoped>
tr {
  background-color: var(--color-bg, #ffffff);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}
tr:last-child {
  border-bottom: none;
}
</style>
