export const IMAGE_API_SIZES = [150, 320, 480, 768, 1024, 1200, 1280, 1536] as const;
export const DEFAULT_IMAGE_WIDTHS = [320, 480, 768, 1024, 1200, 1280, 1536] as const;

export type ImageFormat = "webp" | "png" | "jpeg";

export function normalizeImageWidths(widths?: number[]): number[] {
  const source = widths?.length ? widths : DEFAULT_IMAGE_WIDTHS;
  const sanitized = Array.from(new Set(source))
    .map((value) => Number(value))
    .filter(
      (value) =>
        Number.isFinite(value) &&
        IMAGE_API_SIZES.includes(value as (typeof IMAGE_API_SIZES)[number]),
    )
    .sort((a, b) => a - b);

  return sanitized.length ? sanitized : [...DEFAULT_IMAGE_WIDTHS];
}

/**
 * When running as a static site, the /api/image endpoint is unavailable.
 * In that case, return the original image src directly.
 */
const isStaticHosting = (): boolean => {
  try {
    const config = useRuntimeConfig();
    return config.public.staticHosting === "1" || config.public.staticHosting === "true";
  } catch {
    return false;
  }
};

export function buildImageUrl(src: string | undefined, size: number, format?: ImageFormat): string {
  if (!src) return "";

  // Static hosting: serve original image directly (no server-side processing)
  if (isStaticHosting()) {
    return src;
  }

  const params = new URLSearchParams();
  params.set("src", src);
  params.set("size", String(size));

  if (format) {
    params.set("format", format);
  }

  return `/api/image?${params.toString()}`;
}

export function buildImageSrcset(
  src: string | undefined,
  widths: number[],
  format?: ImageFormat,
): string {
  if (!src || !widths.length) return "";

  // Static hosting: no srcset through API, just use the original image
  if (isStaticHosting()) {
    return "";
  }

  return widths.map((width) => `${buildImageUrl(src, width, format)} ${width}w`).join(", ");
}
