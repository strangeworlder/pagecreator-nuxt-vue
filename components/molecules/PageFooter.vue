<script setup lang="ts">
// @ts-nocheck
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const isHome = computed(() => route.path === "/");
</script>

<template>
  <footer>
    <BaseImage
      v-if="isHome"
      src="/images/spinskull.gif"
      alt="Spinning skull"
      :width="100"
      :height="100"
      class="footer-image"
    />
    <NuxtLink v-else to="/" class="footer-link"> / Gogam </NuxtLink>
  </footer>
</template>

<style scoped>
footer {
  display: flex;
  justify-content: center;
  padding: var(--space-xl);
}
.footer-link {
  font-family: var(--font-sans);
  font-size: var(--size-2);
  color: var(--color-fg);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: border-color var(--transition-fast);
}
.footer-link:hover {
  text-decoration: none;
  border-color: var(--color-accent);
}
</style>
