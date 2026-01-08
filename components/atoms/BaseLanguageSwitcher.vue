<script setup lang="ts">
interface AlternateLocale {
  code: string;
  path: string;
}

interface Props {
  locales?: AlternateLocale[];
}

const props = withDefaults(defineProps<Props>(), {
  locales: () => [],
});

const getLanguageName = (code: string) => {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
};
</script>

<template>
  <div v-if="locales && locales.length > 0" class="language-switcher">
    <template v-for="(loc, index) in locales" :key="loc.code">
      <span v-if="index > 0" class="divider" aria-hidden="true">&bull;</span>
      <a :href="loc.path" :hreflang="loc.code" rel="alternate">
        {{ getLanguageName(loc.code) }}
      </a>
    </template>
  </div>
</template>

<style scoped>
.language-switcher {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--size-2);
  color: var(--color-muted, #666);
  margin-bottom: 0.5rem;
}

.language-switcher a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--color-accent, currentColor);
  text-underline-offset: 2px;
}

.language-switcher a:hover {
  color: var(--color-fg, #000);
}
</style>
