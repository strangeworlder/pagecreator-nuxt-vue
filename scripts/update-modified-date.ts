import { execSync } from "node:child_process";
import fs from "node:fs";
import matter from "gray-matter";

function getStagedFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only", { encoding: "utf-8" });
    return output.split("\n").filter((line) => line.trim() !== "");
  } catch (error) {
    console.error("Error getting staged files:", error);
    process.exit(1);
  }
}

function normalizeDate(val: unknown): string | unknown {
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  return val;
}

function updateDateModified(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${filePath} (file not found)`);
      return;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    // default parse to let js-yaml handle types, but we'll normalize dates back to strings
    const parsed = matter(content);

    const today = new Date().toISOString().split("T")[0];

    let current = parsed.data.dateModified;
    if (current instanceof Date) {
      current = current.toISOString().split("T")[0];
    }

    // Normalize datePublished as well to prevent ISO string conversion
    if (parsed.data.datePublished) {
      parsed.data.datePublished = normalizeDate(parsed.data.datePublished);
    }

    // Update if needed, or if we just need to fix the format of other dates

    parsed.data.dateModified = today;

    // Stringify back to markdown
    let newContent = matter.stringify(parsed.content, parsed.data);

    // Post-process to remove quotes around YYYY-MM-DD dates for specific keys
    // Matches: key: '2025-12-30' or "2025-12-30"
    newContent = newContent.replace(
      /(dateModified|datePublished):\s*['"](\d{4}-\d{2}-\d{2})['"]/g,
      "$1: $2",
    );

    fs.writeFileSync(filePath, newContent, "utf-8");

    // Stage the file again
    execSync(`git add "${filePath}"`);
    console.log(`Updated dateModified for ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
    process.exit(1);
  }
}

function main() {
  const stagedFiles = getStagedFiles();
  const markdownFiles = stagedFiles.filter((file) => file.endsWith(".md"));

  if (markdownFiles.length === 0) {
    return;
  }

  console.log("Checking for dateModified updates...");
  for (const file of markdownFiles) {
    updateDateModified(file);
  }
}

main();
