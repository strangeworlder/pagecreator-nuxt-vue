<script setup lang="ts">
// @ts-nocheck
import { computed } from "vue";

interface Props {
  image?: string;
  alt?: string;
}

const props = withDefaults(defineProps<Props>(), {
  alt: ""
});

const imageSrc = computed(() => {
  const src = props.image as unknown as string | undefined;
  if (!src) return undefined;
  if (src.startsWith("http")) return src;
  const encoded = encodeURIComponent(src);
  return `/api/image?src=${encoded}&size=1280`;
});
</script>

<template>
  <div v-if="imageSrc" class="header-image">
    <img :src="imageSrc" :alt="alt" />
  </div>
</template>

<style scoped>
.header-image {
  height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.header-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
}

/* Mobile styles */
@media (max-width: 768px) {
  .header-image {
    height: auto;
    min-height: 50vh;
    max-height: 90vh;
    display: block;
  }
  
  .header-image img {
    width: 100%;
    height: auto;
    object-fit: contain;
    display: block;
  }
}
</style>
