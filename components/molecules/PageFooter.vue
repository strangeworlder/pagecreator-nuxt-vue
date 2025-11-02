<script setup lang="ts">
// @ts-nocheck
import { ref } from "vue";

const email = ref("");
</script>

<template>
  <footer>
    <BaseImage
      src="/images/spinskull.gif"
      alt="Spinning skull"
      :width="100"
      :height="100"
      class="footer-image"
      eager
    />
  </footer>
</template>
