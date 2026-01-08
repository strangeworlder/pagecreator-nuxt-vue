<script setup lang="ts">
import { computed } from "vue";

interface Props {
  src: string;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "Video player",
});

const embedUrl = computed(() => {
  // Simple check for YouTube URLs to convert to embed format if needed
  // This expects the caller to pass a valid embed URL or a standard watch URL
  const url = props.src;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be")) {
      const v = urlObj.searchParams.get("v");
      if (v) {
        return `https://www.youtube.com/embed/${v}`;
      }
    }
  } catch (e) {
    // console.warn("Invalid URL passed to BaseVideo", url);
  }
  return url;
});
</script>

<template>
  <div class="video-container">
    <iframe
      class="video-iframe"
      :src="embedUrl"
      :title="title"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    ></iframe>
  </div>
</template>

<style scoped>
.video-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
  background-color: var(--color-bg, #000);
}

.video-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}
</style>
