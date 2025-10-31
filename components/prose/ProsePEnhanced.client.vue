<script setup lang="ts">
import { computed, Text, Comment, useSlots } from 'vue'

const slots = useSlots()

const isOnlyImage = computed(() => {
  const nodes = (slots.default?.() || []) as any[]
  const filtered = nodes.filter((n) => {
    if (!n) return false
    if (n.type === Comment) return false
    if (n.type === Text) {
      const s = typeof n.children === 'string' ? n.children.trim() : ''
      return s.length > 0
    }
    return true
  })
  if (filtered.length !== 1) return false
  const n = filtered[0]
  const t = n && n.type
  if (!t) return false
  if (typeof t === 'string') return t === 'img' || t === 'picture'
  const name = (t as any)?.name || (t as any)?.__name || ''
  return name === 'ProseImgWrapper' || String(name).includes('ProseImg')
})
</script>

<template>
  <slot v-if="isOnlyImage" />
  <p v-else v-bind="$attrs"><slot /></p>
  
</template>


