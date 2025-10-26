<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ContentPreview } from '~/composables/useContentLinkPreview'

interface Props {
  preview: ContentPreview | null
  visible: boolean
  position: { x: number; y: number }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  mouseenter: []
  mouseleave: []
  close: []
}>()

const popupRef = ref<HTMLElement>()

const getThumbnailUrl = (imageUrl: string | undefined): string => {
  if (!imageUrl) return ''
  // Use the image API to get 150px thumbnail
  return `/api/image?src=${encodeURIComponent(imageUrl)}&size=150`
}

const adjustedPosition = computed(() => {
  if (!props.visible || !popupRef.value) {
    return props.position
  }

  const rect = popupRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  let x = props.position.x
  let y = props.position.y

  // Adjust horizontal position if popup would go off screen
  if (x + rect.width > viewportWidth) {
    x = viewportWidth - rect.width - 10
  }
  if (x < 10) {
    x = 10
  }

  // Adjust vertical position if popup would go off screen
  if (y + rect.height > viewportHeight) {
    y = props.position.y - rect.height - 10
  }
  if (y < 10) {
    y = 10
  }

  return { x, y }
})

const handleMouseLeave = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="preview">
      <div
        v-if="visible && preview"
        ref="popupRef"
        class="content-preview-popup"
        :style="{
          position: 'fixed',
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
          zIndex: 1000
        }"
        @mouseenter="emit('mouseenter')"
        @mouseleave="handleMouseLeave"
      >
        <div class="preview-content">
          <div class="preview-layout">
            <!-- Cover/Image - Left side -->
            <div v-if="preview.cover || preview.image" class="preview-image">
              <img
                :src="getThumbnailUrl(preview.cover || preview.image)"
                :alt="preview.title || 'Preview'"
                class="preview-thumbnail"
              />
            </div>

            <!-- Content - Right side -->
            <div class="preview-body">
              <h3 v-if="preview.title" class="preview-title">
                {{ preview.title }}
              </h3>
              
              <p v-if="preview.description" class="preview-description">
                {{ preview.description }}
              </p>
              
              <p v-else-if="preview.summary" class="preview-summary">
                {{ preview.summary }}
              </p>

              <!-- Metadata -->
              <div v-if="preview.tags?.length || preview.datePublished" class="preview-meta">
                <div v-if="preview.tags?.length" class="preview-tags">
                  <span
                    v-for="tag in preview.tags.slice(0, 3)"
                    :key="tag"
                    class="preview-tag"
                  >
                    {{ tag }}
                  </span>
                </div>
                
                <div v-if="preview.datePublished" class="preview-date">
                  {{ new Date(preview.datePublished).toLocaleDateString() }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.content-preview-popup {
  /* Base popup styles - positioning handled by inline styles */
  position: relative;
  pointer-events: none;
}

.preview-content {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  max-width: 24rem;
  overflow: hidden;
}

.preview-layout {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
}

.preview-image {
  flex-shrink: 0;
  width: 150px;
  height: 150px;
  overflow: hidden;
  border-radius: var(--radius-sm);
}

.preview-thumbnail {
  width: 150px;
  height: 150px;
  object-fit: cover;
  display: block;
}

.preview-body {
  flex: 1;
  min-width: 0; /* Allow text to wrap */
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-title {
  font-size: var(--size-4);
  font-weight: 600;
  color: var(--color-fg);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-description,
.preview-summary {
  font-size: var(--size-2);
  color: var(--color-muted);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: auto;
}

.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.preview-tag {
  padding: 0.25rem 0.5rem;
  font-size: var(--size-1);
  background: color-mix(in oklab, var(--color-border), transparent 60%);
  color: var(--color-muted);
  border-radius: var(--radius-sm);
}

.preview-date {
  font-size: var(--size-1);
  color: var(--color-muted);
}

/* Transition animations */
.preview-enter-active {
  transition: all 0.2s ease-out;
}

.preview-leave-active {
  transition: all 0.15s ease-in;
}

.preview-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}

.preview-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}
</style>





