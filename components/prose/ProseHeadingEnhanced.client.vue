<script setup lang="ts">
import { ref, onUnmounted, computed } from 'vue'

const props = defineProps<{ level?: 1 | 2 | 3 | 4 | 5 | 6 }>()

const copying = ref(false)
const headingRef = ref<any>()
const copiedTimeout = ref<NodeJS.Timeout | null>(null)

const tag = computed(() => `h${props.level || 2}`)

const getId = (): string | undefined => {
  const raw = headingRef.value as any
  const el: HTMLElement | null = raw instanceof HTMLElement ? raw : (raw?.$el as HTMLElement | null)
  const id = el?.getAttribute('id') || (el?.id ?? undefined)
  return id || undefined
}

const buildUrl = (id?: string): string | undefined => {
  if (!id) return undefined
  if (typeof window === 'undefined') return undefined
  const url = new URL(window.location.href)
  url.hash = id
  return url.toString()
}

const copyLink = async () => {
  const id = getId()
  const fullUrl = buildUrl(id)
  if (!fullUrl) return
  try {
    await navigator.clipboard.writeText(fullUrl)
    copying.value = true
    if (copiedTimeout.value) clearTimeout(copiedTimeout.value)
    copiedTimeout.value = setTimeout(() => {
      copying.value = false
    }, 1200)
  } catch (e) {
    const textarea = document.createElement('textarea')
    textarea.value = fullUrl
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    try { document.execCommand('copy') } catch {}
    document.body.removeChild(textarea)
    copying.value = true
    if (copiedTimeout.value) clearTimeout(copiedTimeout.value)
    copiedTimeout.value = setTimeout(() => {
      copying.value = false
    }, 1200)
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if ((e.key === 'Enter' || e.key === ' ') && !e.defaultPrevented) {
    e.preventDefault()
    copyLink()
  }
}

onUnmounted(() => {
  if (copiedTimeout.value) clearTimeout(copiedTimeout.value)
})
</script>

<template>
  <a v-if="$attrs.id" :name="$attrs.id"></a>
  <component
    ref="headingRef"
    :is="tag"
    v-bind="{
      ...$attrs,
      class: ['prose-heading', $attrs.class].filter(Boolean).join(' ')
    }"
  >
    <slot />
    <button
      class="copy-link"
      type="button"
      :aria-label="copying ? 'Copied link' : 'Copy link to this section'"
      @click="copyLink"
      @keydown="handleKeydown"
    >
      <sup v-if="!copying">#</sup>
      <sup v-else>✓ Link copied</sup>
    </button>
  </component>
</template>

<style scoped>
.prose-heading {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}
.copy-link {
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  padding: 0 0.125rem;
  color: var(--link-color, inherit);
  opacity: 0;
  margin-left: 0.375rem;
}
*:hover > .copy-link {
  opacity: 0.75;
}
.copy-link:hover, .copy-link:focus {
  opacity: 1;
  outline: none;
}
</style>


