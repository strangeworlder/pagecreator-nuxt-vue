<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// Accept common heading attributes via $attrs, especially id

const copying = ref(false)
const h2Ref = ref<any>()
const copiedTimeout = ref<NodeJS.Timeout>()

const getId = (): string | undefined => {
  const raw = h2Ref.value as any
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
    // fallback if clipboard API is blocked
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
  // Support Enter/Space on the icon button
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
  <h2 ref="h2Ref" v-bind="$attrs">
    <slot />
    <button
      class="copy-link"
      type="button"
      :aria-label="copying ? 'Copied link' : 'Copy link to this section'"
      @click="copyLink"
      @keydown="handleKeydown"
    >
      <span v-if="!copying">#</span>
      <span v-else>✓</span>
    </button>
  </h2>
</template>

<style scoped>
  .h2-wrap {
    position: relative;
  }
  h2 {
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
  h2:hover .copy-link {
    opacity: 1;
  }
  .copy-link:hover, .copy-link:focus {
    outline: none;
  }
</style>


