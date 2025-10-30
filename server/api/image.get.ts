// @ts-nocheck
import { createError, getQuery, setHeader, getRequestHeader } from "h3";
import { promises as fs } from "node:fs";
import { resolve, extname, basename, dirname, join } from "node:path";
import { useRuntimeConfig } from "#imports";
import sharp from "sharp";

const PUBLIC_DIR = resolve(process.cwd(), "public");

async function resolveCacheDir(): Promise<string> {
  const candidates = ["/tmp/gen_images", join(process.cwd(), "gen_images")];
  for (const dir of candidates) {
    try {
      await fs.mkdir(dir, { recursive: true });
      return dir;
    } catch {
      // try next
    }
  }
  // Last resort: current working directory
  return process.cwd();
}
const SIZES = [150, 480, 768, 1024, 1200, 1280, 1536];
const QUALITY = 80;

async function computeDominantBackgroundColor(input: Buffer): Promise<{ r: number; g: number; b: number }> {
  try {
    const stats = await sharp(input).stats();
    const { r, g, b } = stats.dominant;
    return { r, g, b };
  } catch {
    return { r: 24, g: 24, b: 24 };
  }
}

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
  const xfProto = getRequestHeader(event, "x-forwarded-proto");
  const xfHost = getRequestHeader(event, "x-forwarded-host");
  const host = xfHost || getRequestHeader(event, "host");
  const proto = (xfProto && xfProto.split(",")[0].trim()) || "https";
  // Prefer request host/proto from the platform; fall back to configured siteUrl
  const baseUrl = host ? `${proto}://${host}` : (cfg.public?.siteUrl ? String(cfg.public.siteUrl) : "");
  if (!baseUrl) {
    throw createError({ statusCode: 500, statusMessage: "Cannot determine site URL for image fetch" });
  }
  const srcUrl = new URL(src, baseUrl).toString();

  const baseName = basename(src, ext);
  const cacheDir = await resolveCacheDir();
  const outputPath = join(cacheDir, `${baseName}-${size}.webp`);
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
    const target = size === 1200 ? { w: 1200, h: 630 } : { w: 150, h: 150 };
    const bg = await computeDominantBackgroundColor(inputBuf);
    const outBuf = await sharp(inputBuf)
      .resize(target.w, target.h, { fit: "contain", withoutEnlargement: true, background: bg })
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
