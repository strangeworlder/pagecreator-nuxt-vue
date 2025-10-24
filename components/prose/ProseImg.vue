<template>
  <div :style="wrapperStyle">
    <picture v-if="!isGif">
      <source :srcset="srcsetWebp" type="image/webp" />
      <img
        :src="fallbackSrc"
        :alt="alt"
        :sizes="sizes"
        loading="lazy"
        decoding="async"
        :width="dimensions?.width"
        :height="dimensions?.height"
        style="width: 100%; height: auto; display: block;"
      />
    </picture>
    <img
      v-else
      :src="src"
      :alt="alt"
      loading="lazy"
      decoding="async"
      :width="dimensions?.width"
      :height="dimensions?.height"
      style="width: 100%; height: auto; display: block;"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}>();

const isGif = computed(() => props.src?.toLowerCase().endsWith(".gif"));
const isWebp = computed(() => props.src?.toLowerCase().endsWith(".webp"));

const sizes = "(min-width: 1280px) 1200px, (min-width: 768px) 768px, 100vw";
const baseImgAttrs = { loading: "lazy", decoding: "async" } as const;

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

const wrapperStyle = computed(() => {
  const dim = dimensions.value;
  if (dim) {
    return { aspectRatio: `${dim.width} / ${dim.height}` } as Record<string, string>;
  }
  return null as unknown as Record<string, string>;
});

const widths = [480, 768, 1024, 1280, 1536];

// Use on-demand processing endpoint
const getProcessedPath = (w: number) => `/api/image?src=${encodeURIComponent(props.src)}&size=${w}`;

const srcsetWebp = computed(() => widths.map((w) => `${getProcessedPath(w)} ${w}w`).join(", "));

// Fallback: use original for GIFs, or smallest processed size for others
const fallbackSrc = computed(() => {
  if (isGif.value) return props.src;
  return getProcessedPath(widths[0]);
});
</script>


