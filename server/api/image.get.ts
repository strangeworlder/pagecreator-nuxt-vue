import { createError, getQuery, setHeader } from "h3";
import { promises as fs } from "node:fs";
import { resolve, extname, basename, dirname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const PUBLIC_DIR = resolve(process.cwd(), "public");
const SIZES = [150, 480, 768, 1024, 1200, 1280, 1536];
const QUALITY = 80;

// Helper function to get dominant color from an image
async function getDominantColor(imagePath: string): Promise<string> {
  try {
    // Use ImageMagick to get the dominant color
    const args = [imagePath, "-scale", "1x1", "-format", "%[pixel:s]", "info:"];
    const result = await run("convert", args);
    const colorString = result.stdout.trim();
    
    console.log("Raw color string:", colorString);
    
    // Extract RGB values from the color string - handle percentage format
    const percentMatch = colorString.match(/srgb\(([\d.]+)%,([\d.]+)%,([\d.]+)%\)/);
    if (percentMatch) {
      const r = Math.round(parseFloat(percentMatch[1]) * 255 / 100);
      const g = Math.round(parseFloat(percentMatch[2]) * 255 / 100);
      const b = Math.round(parseFloat(percentMatch[3]) * 255 / 100);
      const color = `rgb(${r},${g},${b})`;
      console.log("Extracted dominant color (percentage):", color);
      return color;
    }
    
    // Try integer format parsing
    const rgbMatch = colorString.match(/srgb\((\d+),(\d+),(\d+)\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      const color = `rgb(${r},${g},${b})`;
      console.log("Extracted dominant color (integer):", color);
      return color;
    }
    
    // Try alternative format parsing
    const altMatch = colorString.match(/(\d+),(\d+),(\d+)/);
    if (altMatch) {
      const r = parseInt(altMatch[1]);
      const g = parseInt(altMatch[2]);
      const b = parseInt(altMatch[3]);
      const color = `rgb(${r},${g},${b})`;
      console.log("Extracted dominant color (alt format):", color);
      return color;
    }
    
    console.warn("Could not parse color string:", colorString);
    // Fallback to white if we can't extract the color
    return "rgb(255,255,255)";
  } catch (error) {
    console.warn("Failed to extract dominant color:", error);
    return "rgb(255,255,255)"; // Fallback to white
  }
}

// Helper function to blend a color with black at a given ratio
function blendColorWithBlack(color: string, ratio: number): string {
  const rgbMatch = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (!rgbMatch) {
    console.warn("Could not parse color for blending:", color);
    return color;
  }
  
  const r = Math.round(parseInt(rgbMatch[1]) * ratio);
  const g = Math.round(parseInt(rgbMatch[2]) * ratio);
  const b = Math.round(parseInt(rgbMatch[3]) * ratio);
  
  const blendedColor = `rgb(${r},${g},${b})`;
  console.log(`Blending ${color} with black at ratio ${ratio} = ${blendedColor}`);
  return blendedColor;
}

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
    
    // Set headers and return the file bytes
    const buf = await fs.readFile(outputPath);
    setHeader(event, "content-length", String(buf.length));
    return buf;
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
      if (size === 1200 || size === 150) {
        // Get dominant color from the image
        const dominantColor = await getDominantColor(abs);
        const blendedColor = blendColorWithBlack(dominantColor, 0.5);
        
        const targetSize = size === 1200 ? "1200x630" : "150x150";
        const intermediatePath = `${tempPath}.png`;
        const magickArgs = [abs, "-resize", targetSize, "-background", blendedColor, "-gravity", "center", "-extent", targetSize, intermediatePath];
        await run("convert", magickArgs);
        
        // Then convert to WebP
        const cwebpArgs = [intermediatePath, "-q", String(QUALITY), "-quiet", "-o", tempPath];
        await run("cwebp", cwebpArgs);
        
        // Clean up intermediate file
        try {
          await fs.unlink(intermediatePath);
        } catch {
          // Ignore cleanup errors
        }
      } else {
        // Other sizes: maintain aspect ratio using cwebp directly
        const args = [abs, "-q", String(QUALITY), "-quiet", "-resize", String(size), "0", "-o", tempPath];
        await run("cwebp", args);
      }
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

    // Serve the newly created file
    const buf = await fs.readFile(outputPath);
    setHeader(event, "content-type", "image/webp");
    setHeader(event, "cache-control", "public, max-age=300");
    setHeader(event, "content-length", String(buf.length));
    return buf;
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
