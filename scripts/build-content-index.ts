// @ts-nocheck
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { load } from "std-env";
import { createRequire } from "node:module";

// Nuxt content is static at build time; we can read from .content/cache via queryContent
// Since we don't have Nuxt runtime here, we will emit a minimal index by globbing content paths at build time

async function main() {
  const outDir = process.argv[2] || ".output/public";
  // Minimal index: list markdown files under content/en and map to _path using filename-derived route
  const { glob } = await import("glob");
  const matches = await glob("content/**/*.{md,mdx,markdown}", { dot: false });
  const toPath = (file: string) => {
    const rel = file.replace(/^content\//, "").replace(/\.(md|mdx|markdown)$/i, "");
    return "/" + rel;
  };
  const items = matches.map((file) => ({ _path: toPath(file) }));
  const json = JSON.stringify({ items }, null, 2);
  const target = join(outDir, "content-index.json");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, json);
}

main().catch((err) => {
  console.error("[build-content-index] failed", err);
  process.exit(1);
});
