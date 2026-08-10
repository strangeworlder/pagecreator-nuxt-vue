import { d as defineEventHandler, b as useRuntimeConfig, a as getQuery, e as createError, s as setHeader, f as getRequestHeader } from '../../_/nitro.mjs';
import { promises } from 'node:fs';
import https from 'node:https';
import { extname, basename, dirname, resolve, join } from 'node:path';
import sharp from 'sharp';
import 'node:http';
import 'node:events';
import 'node:buffer';
import 'better-sqlite3';
import 'node:crypto';

const PUBLIC_DIR = resolve(process.cwd(), "public");
async function resolveCacheDir() {
  const candidates = [
    join(PUBLIC_DIR, "gen_images"),
    join(process.cwd(), "gen_images"),
    "/tmp/gen_images"
  ];
  for (const dir of candidates) {
    try {
      await promises.mkdir(dir, { recursive: true });
      return dir;
    } catch {
    }
  }
  return process.cwd();
}
const SIZES = [150, 320, 480, 768, 1024, 1200, 1280, 1536];
const QUALITY = 80;
const SUPPORTED_INPUT_EXTENSIONS = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const OUTPUT_FORMATS = ["webp", "png", "jpeg"];
const FORMAT_CONTENT_TYPES = {
  webp: "image/webp",
  png: "image/png",
  jpeg: "image/jpeg"
};
function sanitizeSegments(pathLike) {
  return pathLike.split("/").filter((segment) => segment && segment !== "." && segment !== "..");
}
function applyOutputFormat(instance, format) {
  switch (format) {
    case "png":
      return instance.png({ compressionLevel: 9, adaptiveFiltering: true });
    case "jpeg":
      return instance.jpeg({ quality: QUALITY, mozjpeg: true });
    default:
      return instance.webp({ quality: QUALITY });
  }
}
function resolveBaseUrlCandidates(event, runtime) {
  var _a;
  const candidates = /* @__PURE__ */ new Set();
  const siteUrl = (_a = runtime == null ? void 0 : runtime.public) == null ? void 0 : _a.siteUrl;
  if (siteUrl) {
    candidates.add(String(siteUrl));
  }
  const xfProto = getRequestHeader(event, "x-forwarded-proto");
  const xfHost = getRequestHeader(event, "x-forwarded-host");
  const host = xfHost || getRequestHeader(event, "host");
  const proto = (xfProto == null ? void 0 : xfProto.split(",")[0].trim()) || "https";
  if (host) {
    candidates.add(`${proto}://${host}`);
  }
  return Array.from(candidates).filter(Boolean);
}
async function fetchFromSite(rawSrc, event, runtime) {
  const bases = resolveBaseUrlCandidates(event, runtime);
  if (!bases.length) {
    throw createError({ statusCode: 500, statusMessage: "Cannot determine site URL for fetch" });
  }
  const attempts = [];
  for (const base of bases) {
    try {
      const url = new URL(rawSrc, base).toString();
      const res = await fetch(url);
      if (!res.ok) {
        attempts.push(`${url} -> ${res.status}`);
        continue;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      const msg = error instanceof Error ? error.message : "network error";
      attempts.push(`${base}: ${msg}`);
      try {
        const urlObj = new URL(rawSrc, base);
        if (urlObj.protocol === "https:") {
          return await new Promise((resolve2, reject) => {
            const req = https.get(urlObj.toString(), { rejectUnauthorized: false }, (res) => {
              if (res.statusCode !== 200) {
                reject(new Error(`Fallback Status ${res.statusCode}`));
                return;
              }
              const data = [];
              res.on("data", (chunk) => data.push(chunk));
              res.on("end", () => resolve2(Buffer.concat(data)));
            });
            req.on("error", (err) => reject(err));
          });
        }
      } catch {
      }
    }
  }
  throw createError({
    statusCode: 404,
    statusMessage: `Source fetch failed (${attempts.join("; ")})`
  });
}
async function computeDominantBackgroundColor(input) {
  try {
    const stats = await sharp(input).stats();
    const { r, g, b } = stats.dominant;
    return { r, g, b };
  } catch {
    return { r: 24, g: 24, b: 24 };
  }
}
const image_get = defineEventHandler(async (event) => {
  var _a;
  const runtime = useRuntimeConfig();
  const q = getQuery(event);
  const rawSrc = (_a = q.src) == null ? void 0 : _a.trim();
  const size = q.size ? Number(q.size) : void 0;
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
  const format = OUTPUT_FORMATS.includes(
    normalizedRequestedFormat
  ) ? normalizedRequestedFormat : defaultFormat;
  const contentType = FORMAT_CONTENT_TYPES[format];
  if (!contentType) {
    throw createError({ statusCode: 400, statusMessage: "Unsupported format" });
  }
  const formatExtension = format === "jpeg" ? "jpg" : format;
  let inputBuf;
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
      inputBuf = await promises.readFile(absPath);
    } catch (error) {
      if ((error == null ? void 0 : error.code) !== "ENOENT") {
        throw error;
      }
      inputBuf = await fetchFromSite(rawSrc, event, runtime);
    }
    baseName = basename(absPath, inputExt) || "image";
    relDir = sanitizeSegments(dirname(normalizedPath)).join("/");
  }
  const cacheDir = await resolveCacheDir();
  const isCanvas = q.canvas === "true" || q.canvas === "";
  const canvasSuffix = isCanvas ? "-canvas" : "";
  const outputPath = join(cacheDir, relDir, `${baseName}-${size}${canvasSuffix}.${formatExtension}`);
  try {
    const buf = await promises.readFile(outputPath);
    setHeader(event, "content-type", contentType);
    setHeader(event, "cache-control", "public, max-age=300");
    setHeader(event, "content-length", buf.length);
    return buf;
  } catch {
  }
  await promises.mkdir(dirname(outputPath), { recursive: true });
  let outBuf;
  const shouldUseCanvas = inputExt !== ".gif" && isCanvas && (size === 1200 || size === 150);
  if (shouldUseCanvas) {
    const target = size === 1200 ? { w: 1200, h: 630 } : { w: 150, h: 150 };
    const bg = await computeDominantBackgroundColor(inputBuf);
    const pipeline = sharp(inputBuf).resize(target.w, target.h, {
      fit: "contain",
      withoutEnlargement: true,
      background: bg
    });
    outBuf = await applyOutputFormat(pipeline, format).toBuffer();
  } else {
    const pipeline = sharp(inputBuf).resize({ width: size });
    outBuf = await applyOutputFormat(pipeline, format).toBuffer();
  }
  await promises.writeFile(outputPath, outBuf);
  setHeader(event, "content-type", contentType);
  setHeader(event, "cache-control", "public, max-age=300");
  setHeader(event, "content-length", outBuf.length);
  return outBuf;
});

export { image_get as default };
//# sourceMappingURL=image.get.mjs.map
