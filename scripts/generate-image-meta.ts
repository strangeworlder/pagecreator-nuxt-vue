import { promises as fs } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { glob } from "glob";
import sharp from "sharp";

async function main() {
  const projectRoot = process.cwd();
  const publicDir = resolve(projectRoot, "public");
  const assetsDir = resolve(projectRoot, "assets");
  const outPath = resolve(assetsDir, "imageMeta.json");

  // Find images in public directory; map keys should be "/path/in/public"
  const patterns = [
    "**/*.jpg",
    "**/*.jpeg",
    "**/*.png",
    "**/*.webp",
    "**/*.gif",
  ];

  const files = (
    await Promise.all(
      patterns.map((p) => glob(p, { cwd: publicDir, nodir: true, absolute: true }))
    )
  ).flat();

  const meta: Record<string, { width: number; height: number }> = {};

  for (const absPath of files) {
    try {
      const relFromPublic = relative(publicDir, absPath);
      // Always use forward slashes for URL paths
      const urlPath = "/" + relFromPublic.split(sep).join("/");
      const { width, height } = await sharp(absPath).metadata();
      if (!width || !height) continue;
      meta[urlPath] = { width, height } as { width: number; height: number };
    } catch {
      // ignore unreadable files
    }
  }

  await fs.mkdir(assetsDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(meta, null, 2) + "\n", "utf8");
  // eslint-disable-next-line no-console
  console.log(`Wrote ${Object.keys(meta).length} entries to ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});


