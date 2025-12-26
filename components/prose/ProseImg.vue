<template>
  <picture ref="rootRef" data-img-kind="basic">
    <source v-if="!isGif" :srcset="srcsetWebp" type="image/webp" />
    <img
      :src="lowResSrc"
      :alt="alt"
      :sizes="sizes"
      :srcset="imgSrcset"
      loading="lazy"
      decoding="async"
      :width="dimensions?.width"
      :height="dimensions?.height"
      :style="imgStyle"
    />
  </picture>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUpdated } from "vue";
import { buildImageSrcset, buildImageUrl, normalizeImageWidths } from "~/utils/image";

const props = defineProps<{
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}>();

const isGif = computed(() => props.src?.toLowerCase().endsWith(".gif"));

const normalizedWidths = computed(() => normalizeImageWidths());

const lowResSrc = computed(() => {
  if (!props.src) return "";
  if (isGif.value) return props.src;
  return buildImageUrl(props.src, normalizedWidths.value[0], "jpeg");
});

const srcsetWebp = computed(() => {
  if (!props.src || isGif.value) return "";
  return buildImageSrcset(props.src, normalizedWidths.value, "webp");
});

const imgSrcset = computed(() => {
  if (!props.src || isGif.value) return "";
  return buildImageSrcset(props.src, normalizedWidths.value, "jpeg");
});

const sizes = "(min-width: 1280px) 1200px, (min-width: 768px) 768px, 100vw";

// SSR-friendly: use provided props or optional metadata to set aspect-ratio
let meta: Record<string, { width: number; height: number }> = {};
try {
  meta = (await import("~/assets/imageMeta.json")).default as typeof meta;
} catch (_) {
  // optional file, ignore when missing
}

const dimensions = computed(() => {
  if (props.width && props.height) return { width: props.width, height: props.height };
  return props.src ? meta[props.src] : undefined;
});

const aspectRatio = computed(() => {
  const dim = dimensions.value;
  return dim ? `${dim.width} / ${dim.height}` : undefined;
});

const imgStyle = computed(() => (aspectRatio.value ? { aspectRatio: aspectRatio.value } : {}));

// Debug logs (enable with ?debugHydration in URL, dev only)
const isDebug = () => {
  try {
    return (
      process.dev &&
      typeof window !== "undefined" &&
      typeof URLSearchParams !== "undefined" &&
      new URLSearchParams(window.location.search).has("debugHydration")
    );
  } catch {
    return false;
  }
};
const rootRef = ref<HTMLElement | null>(null);

onMounted(() => {
  if (isDebug()) {
    const el = rootRef.value as HTMLElement | null;
    console.log("[ProseImg] mounted", {
      src: props.src,
      isGif: isGif.value,
      dims: dimensions.value,
      node: el?.nodeName,
    });
  }
});

onUpdated(() => {
  if (isDebug()) {
    const el = rootRef.value as HTMLElement | null;
    console.log("[ProseImg] updated", {
      src: props.src,
      isGif: isGif.value,
      dims: dimensions.value,
      node: el?.nodeName,
    });
  }
});
</script>

<style scoped>
img {
  width: 100%;
  object-fit: cover;
  display: block;
}
</style>