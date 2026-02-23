<template>
  <p>
    <slot />
  </p>
</template>


<style scoped>
p {
  font-size: var(--font-size, var(--size-3));
  line-height: var(--line-height, 1.7);
  margin: var(--space-md) 0;
}
</style>
