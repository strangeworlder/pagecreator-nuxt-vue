import { createError, getQuery, setHeader, send } from "h3";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
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
  console.log("Src", src);
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
  console.log("Output path", outputPath);
  // Check if processed image already exists
  try {
    await fs.access(outputPath);
    
    // Check if file is currently being written (has .tmp extension)
    const tempPath = `${outputPath}.tmp`;
    try {
      await fs.access(tempPath);
      console.log("File is currently being generated, waiting...");
      // Wait a bit and then fall through to generation
      await new Promise(resolve => setTimeout(resolve, 100));
      throw new Error("File being generated");
    } catch {
      // No temp file, proceed with serving
    }
    
    // File exists, serve it directly from filesystem
    setHeader(event, "content-type", "image/webp");
    setHeader(event, "cache-control", "public, max-age=300");
    console.log("Serving existing file", outputPath);
    
    // Get file stats for validation and content-length
    let stats;
    let retries = 3;
    
    while (retries > 0) {
      try {
        console.log(`Attempting to get file stats (${4-retries}/3):`, outputPath);
        stats = await fs.stat(outputPath);
        
        // Verify we have a complete file (basic size check)
        if (stats.size === 0) {
          console.warn("Empty file detected, regenerating...");
          throw new Error("Empty file");
        }
        
        // Additional validation: check for reasonable file size
        if (stats.size < 100) {
          console.warn("Suspiciously small file detected, regenerating...");
          throw new Error("File too small");
        }
        
        console.log(`Successfully validated file, size: ${stats.size} bytes`);
        break; // Success, exit retry loop
      } catch (error: any) {
        retries--;
        console.warn(`File stats attempt failed: ${error.message}, retries left: ${retries}`);
        if (retries === 0) {
          throw error;
        }
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Set headers and stream the file
    setHeader(event, "content-length", String(stats.size));
    return send(event, outputPath);
  } catch (error: any) {
    console.log(`Failed to serve existing file: ${error.message}, will generate new one`);
    // File doesn't exist, is corrupted, or read failed - generate it
  }

  // Generate the processed image
  try {
    // Ensure the output directory exists
    const outputDir = dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Use a temporary file to prevent race conditions
    const tempPath = `${outputPath}.tmp`;
    
    if (ext === ".gif") {
      // For GIFs, just copy the original (preserve animation)
      const buf = await fs.readFile(abs);
      await fs.writeFile(tempPath, buf);
    } else {
      // For other formats, convert to WebP
      const args = [abs, "-q", String(QUALITY), "-resize", String(size), "0", "-quiet", "-o", tempPath];
      await run("cwebp", args);
    }

    // Verify the generated file is complete before moving it
    const tempBuf = await fs.readFile(tempPath);
    if (tempBuf.length === 0) {
      throw new Error("Generated file is empty");
    }
    
    // Additional validation: check for reasonable file size
    if (tempBuf.length < 100) {
      throw new Error("Generated file is too small");
    }

    // Atomically move the temporary file to the final location
    await fs.rename(tempPath, outputPath);

    // Serve the newly created file using streaming
    const stats = await fs.stat(outputPath);
    setHeader(event, "content-type", "image/webp");
    setHeader(event, "cache-control", "public, max-age=300");
    setHeader(event, "content-length", String(stats.size));
    return send(event, outputPath);
  } catch (error: any) {
    // Clean up temporary file if it exists
    try {
      await fs.unlink(`${outputPath}.tmp`);
    } catch {
      // Ignore cleanup errors
    }
    
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Image processing failed: ${error.message}` 
    });
  }
});
