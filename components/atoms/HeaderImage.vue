<script setup lang="ts">
import { computed } from "vue";
// BaseImage is auto-imported by Nuxt

interface Props {
  image?: string;
  alt?: string;
}

const props = withDefaults(defineProps<Props>(), {
  alt: "",
});

const headerWidths = [768, 1024, 1200, 1280, 1536];
const headerSizes = "(min-width: 1280px) 1200px, 100vw";
const headerImgStyle = {
  height: "100%",
  objectFit: "contain",
};

const imageSrc = computed(() => props.image?.trim() ?? "");
const hasImage = computed(() => Boolean(imageSrc.value));
</script>

<template>
  <div v-if="hasImage" class="header-image">
    <BaseImage
      :src="imageSrc"
      :alt="alt"
      :sizes="headerSizes"
      :widths="headerWidths"
      :img-style="headerImgStyle"
      eager
      decoding="auto"
    />
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
    height: fit-content;
    min-height: 0;
    max-height: 75vh;
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
