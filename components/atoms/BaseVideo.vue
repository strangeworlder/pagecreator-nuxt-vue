<script setup lang="ts">
// BaseImage is auto-imported by Nuxt

interface Props {
  src: string;
  title?: string;
  poster?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "Watch video",
  poster: "",
});
</script>

<template>
  <a :href="src" target="_blank" rel="noopener noreferrer" class="video-card" :aria-label="`Watch ${title}`">
    <div class="video-poster">
      <BaseImage
        v-if="poster"
        :src="poster"
        :alt="title"
        class="poster-image"
        :width="800"
        :height="450"
      />
      <div class="play-overlay">
        <div class="play-button">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="play-icon">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  </a>
</template>

<style scoped>
.video-card {
  display: block;
  width: 100%;
  text-decoration: none;
  overflow: hidden;
  position: relative;
  background-color: var(--color-bg, #000);
}

.video-poster {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
  overflow: hidden;
}

.poster-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-normal);
}

.video-card:hover .poster-image {
  transform: scale(1.05);
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.2);
  transition: background-color var(--transition-normal);
}

.video-card:hover .play-overlay {
  background-color: rgba(0, 0, 0, 0.1);
}

.play-button {
  width: 64px;
  height: 64px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform var(--transition-fast), background-color var(--transition-fast);
}

.video-card:hover .play-button {
  transform: scale(1.1);
  background-color: #fff;
}

.play-icon {
  width: 32px;
  height: 32px;
  color: #000;
  margin-left: var(--space-xs); /* Optical centering for play triangle */
}
</style>
