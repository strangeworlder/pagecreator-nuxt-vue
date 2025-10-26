<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useContentLinkPreview } from '~/composables/useContentLinkPreview'
import ContentPreviewPopup from '~/components/atoms/ContentPreviewPopup.vue'

const props = withDefaults(defineProps<{ href?: string; rel?: string; target?: string }>(), {
  href: undefined,
  rel: undefined,
  target: undefined,
});

const { getPreviewForLink } = useContentLinkPreview()

const showPreview = ref(false)
const previewData = ref(null)
const previewPosition = ref({ x: 0, y: 0 })
const linkRef = ref<any>()
const previewTimeout = ref<NodeJS.Timeout>()

const EXTERNAL_RE = /^(https?:)?\/\//
const isLocal = () => {
  const href = props.href || ''
  return !!href && !EXTERNAL_RE.test(href) && !href.startsWith('#')
}

const handleMouseEnter = async () => {
  if (!isLocal() || !props.href) return

  if (previewTimeout.value) {
    clearTimeout(previewTimeout.value)
  }

  previewTimeout.value = setTimeout(async () => {
    try {
      const preview = await getPreviewForLink(props.href!)
      if (preview && showPreview.value === false) {
        previewData.value = preview
        updatePreviewPosition()
        showPreview.value = true
      }
    } catch (error) {
      console.warn('Failed to load preview:', error)
    }
  }, 300)
}

const handleMouseLeave = () => {
  if (previewTimeout.value) {
    clearTimeout(previewTimeout.value)
  }
  setTimeout(() => {
    if (showPreview.value) {
      showPreview.value = false
      previewData.value = null
    }
  }, 100)
}

const handlePopupMouseEnter = () => {
  if (previewTimeout.value) {
    clearTimeout(previewTimeout.value)
  }
}

const handlePopupMouseLeave = () => {
  showPreview.value = false
  previewData.value = null
}

const handlePopupClose = () => {
  showPreview.value = false
  previewData.value = null
}

const updatePreviewPosition = () => {
  if (!linkRef.value) return
  const raw = linkRef.value as any
  const el: HTMLElement | null = raw instanceof HTMLElement ? raw : (raw?.$el as HTMLElement | null)
  if (!el) return
  const rect = el.getBoundingClientRect()
  previewPosition.value = {
    x: rect.left + rect.width / 2,
    y: rect.bottom + 8
  }
}

const handleMouseMove = () => {
  if (showPreview.value) {
    updatePreviewPosition()
  }
}

const handleFocus = async () => {
  if (!isLocal() || !props.href) return
  
  if (previewTimeout.value) {
    clearTimeout(previewTimeout.value)
  }

  previewTimeout.value = setTimeout(async () => {
    try {
      const preview = await getPreviewForLink(props.href!)
      if (preview && showPreview.value === false) {
        previewData.value = preview
        updatePreviewPosition()
        showPreview.value = true
      }
    } catch (error) {
      console.warn('Failed to load preview:', error)
    }
  }, 300)
}

const handleBlur = () => {
  if (previewTimeout.value) {
    clearTimeout(previewTimeout.value)
  }
  setTimeout(() => {
    if (showPreview.value) {
      showPreview.value = false
      previewData.value = null
    }
  }, 100)
}

onMounted(() => {
  if (isLocal()) {
    document.addEventListener('mousemove', handleMouseMove)
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  if (previewTimeout.value) {
    clearTimeout(previewTimeout.value)
  }
})
</script>
<template>
  <NuxtLink
    v-if="href && !EXTERNAL_RE.test(href) && !href.startsWith('#')"
    ref="linkRef"
    :to="href"
    v-bind="$attrs"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focus="handleFocus"
    @blur="handleBlur"
  >
    <slot />
  </NuxtLink>
  <a
    v-else
    ref="linkRef"
    :href="href"
    :rel="rel ?? (EXTERNAL_RE.test(href || '') ? 'noopener noreferrer' : undefined)"
    :target="target ?? (EXTERNAL_RE.test(href || '') ? '_blank' : undefined)"
    v-bind="$attrs"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focus="handleFocus"
    @blur="handleBlur"
  >
    <slot />
  </a>

  <ContentPreviewPopup
    :preview="previewData"
    :visible="showPreview"
    :position="previewPosition"
    @mouseenter="handlePopupMouseEnter"
    @mouseleave="handlePopupMouseLeave"
    @close="handlePopupClose"
  />
</template>


<style scoped>
  a[href^="http"]::after {
    content: " ↗";
  }
</style>