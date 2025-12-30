<template>
  <picture ref="rootRef" data-img-kind="enhanced">
    <source v-if="!isGif" :srcset="srcsetWebp" type="image/webp" />
    <img
      :src="fallbackSrc"
      :alt="alt"
      :sizes="sizes"
      loading="lazy"
      decoding="async"
      :width="effectiveDimensions?.width"
      :height="effectiveDimensions?.height"
      :style="imgStyle"
      @load="handleLoad"
    />
  </picture>

</template>

<script setup lang="ts">
import { computed, onMounted, onUpdated, ref, watch } from "vue";

const props = defineProps<{
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}>();

const isGif = computed(() => props.src?.toLowerCase().endsWith(".gif"));

const sizes = "(min-width: 1280px) 1200px, (min-width: 768px) 768px, 100vw";

// Optional: width/height metadata to reserve space and avoid CLS
// Add entries in assets/imageMeta.json like { "/images/foo.jpg": { width: 1600, height: 900 } }
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

// Client-side fallback: compute intrinsic dimensions if not provided by props/meta
const clientDimensions = ref<{ width: number; height: number } | undefined>(undefined);

const isClient = typeof window !== "undefined" && typeof Image !== "undefined";

watch(
  () => props.src,
  (src: string | undefined) => {
    if (!isClient) return;
    if (!src || dimensions.value) return;
    const img = new Image();
    img.src = src;
    if (img.complete && img.naturalWidth && img.naturalHeight) {
      clientDimensions.value = { width: img.naturalWidth, height: img.naturalHeight };
    } else {
      img.onload = () => {
        clientDimensions.value = { width: img.naturalWidth, height: img.naturalHeight };
      };
    }
  },
  { immediate: true },
);

const effectiveDimensions = computed(() => dimensions.value ?? clientDimensions.value);

const imgStyle = computed(() => {
  const dim = effectiveDimensions.value;
  const style: Record<string, string> = {};
  if (dim) style.aspectRatio = `${dim.width} / ${dim.height}`;
  return style;
});

const isLoaded = ref(false);
const handleLoad = () => {
  isLoaded.value = true;
  if (isDebug()) {
    console.log("[ProseImgEnhanced] img load", {
      src: props.src,
      isGif: isGif.value,
      dims: effectiveDimensions.value,
    });
  }
};

const widths = [320, 480, 768, 1024, 1280, 1536];

// Use on-demand processing endpoint
const getProcessedPath = (w: number) => `/api/image?src=${encodeURIComponent(props.src)}&size=${w}`;

// Keep a simple fade-in only; no wrapper/placeholder to remain inline-friendly

const srcsetWebp = computed(() => widths.map((w) => `${getProcessedPath(w)} ${w}w`).join(", "));

// Fallback: use original for GIFs, or smallest processed size for others
const fallbackSrc = computed(() => {
  if (isGif.value) return props.src;
  return getProcessedPath(widths[0]);
});
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
    console.log("[ProseImgEnhanced] mounted", {
      src: props.src,
      isGif: isGif.value,
      dims: effectiveDimensions.value,
      node: el?.nodeName,
    });
  }
});

onUpdated(() => {
  if (isDebug()) {
    const el = rootRef.value as HTMLElement | null;
    console.log("[ProseImgEnhanced] updated", {
      src: props.src,
      isGif: isGif.value,
      dims: effectiveDimensions.value,
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

