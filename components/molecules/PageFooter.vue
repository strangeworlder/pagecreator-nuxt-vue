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
      eager
    />
    <NuxtLink v-else to="/" class="footer-link"> Return to the start </NuxtLink>
  </footer>
</template>

<style scoped>
footer {
  display: flex;
  justify-content: center;
  padding: 2rem;
}
.footer-link {
  font-family: var(--font-header);
  font-size: 1.2rem;
  color: var(--color-text);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s;
}
.footer-link:hover {
  border-color: var(--color-primary);
}
</style>
