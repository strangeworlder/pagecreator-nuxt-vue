import { createError, getQuery, setHeader, send } from "h3";
import { promises as fs } from "node:fs";
import { resolve, extname, basename, dirname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const PUBLIC_DIR = resolve(process.cwd(), "public");
const SIZES = [480, 768, 1024, 1280, 1536];
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

  // Prevent path traversal
  const abs = resolve(PUBLIC_DIR, ".", src.slice(1));
  if (!abs.startsWith(PUBLIC_DIR)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }

  // Check if source file exists
  try {
    await fs.access(abs);
  } catch {
    throw createError({ statusCode: 404, statusMessage: "Source file not found" });
  }

  const baseName = basename(src, ext);
  const outputPath = join(PUBLIC_DIR, "gen_images", `${baseName}-${size}.webp`);
  // Check if processed image already exists
  try {
    await fs.access(outputPath);
    // File exists, serve it directly from filesystem
    setHeader(event, "content-type", "image/webp");
    setHeader(event, "cache-control", "public, max-age=300");
    const buf = await fs.readFile(outputPath);
    setHeader(event, "content-length", String(buf.length));
    return buf;
  } catch {
    // File doesn't exist, generate it
  }

  // Generate the processed image
  try {
    // Ensure the output directory exists
    const outputDir = dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    if (ext === ".gif") {
      // For GIFs, just copy the original (preserve animation)
      const buf = await fs.readFile(abs);
      await fs.writeFile(outputPath, buf);
    } else {
      // For other formats, convert to WebP
      const args = [abs, "-q", String(QUALITY), "-resize", String(size), "0", "-quiet", "-o", outputPath];
      await run("cwebp", args);
    }

    // Serve the newly created file
    const buf = await fs.readFile(outputPath);
    setHeader(event, "content-type", "image/webp");
    setHeader(event, "cache-control", "public, max-age=300");
    setHeader(event, "content-length", String(buf.length));
    return buf;
  } catch (error: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Image processing failed: ${error.message}` 
    });
  }
});
