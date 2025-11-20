// @ts-nocheck
import { createError, getQuery, setHeader, getRequestHeader } from "h3";
import { promises as fs } from "node:fs";
import { resolve, extname, basename, dirname, join } from "node:path";
import { useRuntimeConfig } from "#imports";
import sharp from "sharp";

const PUBLIC_DIR = resolve(process.cwd(), "public");

async function resolveCacheDir(): Promise<string> {
  // Prefer storing under the public directory so files persist and can be served statically if needed
  const candidates = [join(PUBLIC_DIR, "gen_images"), join(process.cwd(), "gen_images"), "/tmp/gen_images"];
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
const SIZES = [150, 320, 480, 768, 1024, 1200, 1280, 1536];
const QUALITY = 80;
const SUPPORTED_INPUT_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const OUTPUT_FORMATS = ["webp", "png", "jpeg"] as const;
const FORMAT_CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpeg: "image/jpeg",
};

function sanitizeSegments(pathLike: string): string[] {
  return pathLike
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..");
}

function applyOutputFormat(instance: sharp.Sharp, format: (typeof OUTPUT_FORMATS)[number]) {
  switch (format) {
    case "png":
      return instance.png({ compressionLevel: 9, adaptiveFiltering: true });
    case "jpeg":
      return instance.jpeg({ quality: QUALITY, mozjpeg: true });
    default:
      return instance.webp({ quality: QUALITY });
  }
}

function resolveBaseUrlCandidates(event: any, runtime: any): string[] {
  const candidates = new Set<string>();
  const siteUrl = runtime?.public?.siteUrl;
  if (siteUrl) {
    candidates.add(String(siteUrl));
  }
  const xfProto = getRequestHeader(event, "x-forwarded-proto");
  const xfHost = getRequestHeader(event, "x-forwarded-host");
  const host = xfHost || getRequestHeader(event, "host");
  const proto = (xfProto && xfProto.split(",")[0].trim()) || "https";
  if (host) {
    candidates.add(`${proto}://${host}`);
  }
  return Array.from(candidates).filter(Boolean);
}

async function fetchFromSite(rawSrc: string, event: any, runtime: any): Promise<Buffer> {
  const bases = resolveBaseUrlCandidates(event, runtime);
  if (!bases.length) {
    throw createError({ statusCode: 500, statusMessage: "Cannot determine site URL for fetch" });
  }
  const attempts: string[] = [];
  for (const base of bases) {
    try {
      const url = new URL(rawSrc, base).toString();
      const res = await fetch(url);
      if (!res.ok) {
        attempts.push(`${url} -> ${res.status}`);
        continue;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (error: any) {
      attempts.push(`${base}: ${error?.message || "network error"}`);
    }
  }
  throw createError({
    statusCode: 404,
    statusMessage: `Source fetch failed (${attempts.join("; ")})`,
  });
}

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
  const runtime = useRuntimeConfig();
  const q = getQuery(event) as Record<string, string | undefined>;
  const rawSrc = q.src?.trim();
  const size = q.size ? Number(q.size) : undefined;

  if (!rawSrc) {
    throw createError({ statusCode: 400, statusMessage: "Missing src" });
  }
  if (!size || !SIZES.includes(size)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid or unsupported size" });
  }

  const isExternalSrc = /^https?:\/\//i.test(rawSrc);
  if (!isExternalSrc && !rawSrc.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "Local src must start with '/'" });
  }

  const requestedFormat = q.format ? q.format.toLowerCase() : "";
  const normalizedRequestedFormat = requestedFormat === "jpg" ? "jpeg" : requestedFormat;
  const defaultFormat = size === 1200 ? "png" : "webp";
  const format = OUTPUT_FORMATS.includes(normalizedRequestedFormat as any)
    ? normalizedRequestedFormat
    : defaultFormat;
  const contentType = FORMAT_CONTENT_TYPES[format];
  if (!contentType) {
    throw createError({ statusCode: 400, statusMessage: "Unsupported format" });
  }
  const formatExtension = format === "jpeg" ? "jpg" : format;

  let inputBuf: Buffer;
  let inputExt = "";
  let baseName = "image";
  let relDir = "";

  if (isExternalSrc) {
    const parsed = new URL(rawSrc);
    const remotePath = parsed.pathname || "/";
    inputExt = extname(remotePath).toLowerCase();
    if (!SUPPORTED_INPUT_EXTENSIONS.has(inputExt)) {
      throw createError({ statusCode: 400, statusMessage: "Unsupported remote file type" });
    }
    baseName = basename(remotePath, inputExt) || "image";
    const hostSegment = parsed.hostname || "external";
    relDir = ["external", hostSegment, ...sanitizeSegments(dirname(remotePath))].join("/");
    const res = await fetch(parsed.toString());
    if (!res.ok) {
      throw createError({ statusCode: 404, statusMessage: `Source fetch failed: ${res.status}` });
    }
    inputBuf = Buffer.from(await res.arrayBuffer());
  } else {
    const normalizedPath = rawSrc.replace(/^\/+/, "");
    const absPath = resolve(PUBLIC_DIR, normalizedPath);
    if (!absPath.startsWith(PUBLIC_DIR)) {
      throw createError({ statusCode: 403, statusMessage: "Path traversal detected" });
    }
    inputExt = extname(absPath).toLowerCase();
    if (!SUPPORTED_INPUT_EXTENSIONS.has(inputExt)) {
      throw createError({ statusCode: 400, statusMessage: "Unsupported file type" });
    }
    try {
      inputBuf = await fs.readFile(absPath);
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
      inputBuf = await fetchFromSite(rawSrc, event, runtime);
    }
    baseName = basename(absPath, inputExt) || "image";
    relDir = sanitizeSegments(dirname(normalizedPath)).join("/");
  }

  const cacheDir = await resolveCacheDir();
  const outputPath = join(cacheDir, relDir, `${baseName}-${size}.${formatExtension}`);

  try {
    const buf = await fs.readFile(outputPath);
    setHeader(event, "content-type", contentType);
    setHeader(event, "cache-control", "public, max-age=300");
    setHeader(event, "content-length", String(buf.length));
    return buf;
  } catch {}

  await fs.mkdir(dirname(outputPath), { recursive: true });

  let outBuf: Buffer;
  const shouldUseCanvas = inputExt !== ".gif" && (size === 1200 || size === 150);
  if (shouldUseCanvas) {
    const target = size === 1200 ? { w: 1200, h: 630 } : { w: 150, h: 150 };
    const bg = await computeDominantBackgroundColor(inputBuf);
    const pipeline = sharp(inputBuf).resize(target.w, target.h, {
      fit: "contain",
      withoutEnlargement: true,
      background: bg,
    });
    outBuf = await applyOutputFormat(pipeline, format).toBuffer();
  } else {
    const pipeline = sharp(inputBuf).resize({ width: size });
    outBuf = await applyOutputFormat(pipeline, format).toBuffer();
  }

  await fs.writeFile(outputPath, outBuf);

  setHeader(event, "content-type", contentType);
  setHeader(event, "cache-control", "public, max-age=300");
  setHeader(event, "content-length", String(outBuf.length));
  return outBuf;
});
