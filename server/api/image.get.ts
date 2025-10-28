// @ts-nocheck
import { createError, getQuery, setHeader, getRequestHeader } from "h3";
import { promises as fs } from "node:fs";
import { resolve, extname, basename, dirname, join } from "node:path";
import { useRuntimeConfig } from "#imports";
import sharp from "sharp";

const PUBLIC_DIR = resolve(process.cwd(), "public");
const OUTPUT_CACHE_DIR = process.env.NETLIFY ? "/tmp/gen_images" : join(PUBLIC_DIR, "gen_images");
const SIZES = [150, 480, 768, 1024, 1200, 1280, 1536];
const QUALITY = 80;

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string | undefined>;
  const src = q.src;
  const size = q.size ? Number(q.size) : undefined;
  if (!src || !src.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "Missing or invalid src" });
  }
  if (!size || !SIZES.includes(size)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid or unsupported size" });
  }

  const ext = extname(src).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    throw createError({ statusCode: 400, statusMessage: "Unsupported file type" });
  }

  // Build absolute URL to the source image (functions cannot always read site files)
  const cfg = useRuntimeConfig();
  const host = getRequestHeader(event, "host");
  const baseUrl = (cfg.public?.siteUrl && String(cfg.public.siteUrl)) || (host ? `https://${host}` : "");
  if (!baseUrl) {
    throw createError({ statusCode: 500, statusMessage: "Cannot determine site URL for image fetch" });
  }
  const srcUrl = new URL(src, baseUrl).toString();

  const baseName = basename(src, ext);
  const outputPath = join(OUTPUT_CACHE_DIR, `${baseName}-${size}.webp`);
  // Serve cached derivative if present
  try {
    const buf = await fs.readFile(outputPath);
    setHeader(event, "content-type", "image/webp");
    setHeader(event, "cache-control", "public, max-age=300");
    setHeader(event, "content-length", String(buf.length));
    return buf;
  } catch {}

  // Generate
  await fs.mkdir(dirname(outputPath), { recursive: true });
  // Fetch the source image over HTTP(S)
  const res = await fetch(srcUrl);
  if (!res.ok) throw createError({ statusCode: 404, statusMessage: `Source fetch failed: ${res.status}` });
  const inputBuf = Buffer.from(await res.arrayBuffer());
  // Special canvas sizes
  if (ext !== ".gif" && (size === 1200 || size === 150)) {
    // Fit inside target box and extend canvas with blurred background
    const target = size === 1200 ? { w: 1200, h: 630 } : { w: 150, h: 150 };
    const input = sharp(inputBuf);
    const resized = await input
      .resize(target.w, target.h, { fit: "inside", withoutEnlargement: true, background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .toBuffer();
    const meta = await sharp(resized).metadata();
    const compositeLeft = Math.floor((target.w - (meta.width || target.w)) / 2);
    const compositeTop = Math.floor((target.h - (meta.height || target.h)) / 2);
    const canvas = sharp({ create: { width: target.w, height: target.h, channels: 3, background: { r: 24, g: 24, b: 24 } } });
    const outBuf = await canvas
      .composite([{ input: resized, left: compositeLeft, top: compositeTop }])
      .webp({ quality: QUALITY })
      .toBuffer();
    await fs.writeFile(outputPath, outBuf);
  } else {
    const outBuf = await sharp(inputBuf).resize({ width: size }).webp({ quality: QUALITY }).toBuffer();
    await fs.writeFile(outputPath, outBuf);
  }

  const final = await fs.readFile(outputPath);
  setHeader(event, "content-type", "image/webp");
  setHeader(event, "cache-control", "public, max-age=300");
  setHeader(event, "content-length", String(final.length));
  return final;
});
