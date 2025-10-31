<template>
  <p>
    <slot />
  </p>
</template>


<style scoped>
p {
  font-size: var(--font-size, var(--size-3));
  line-height: var(--line-height, 1.7);
  margin: 0.8em 0;
}
</style>

