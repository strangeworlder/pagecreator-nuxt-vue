import fs from "node:fs/promises";
import { glob } from "glob";
import matter from "gray-matter";

async function main() {
    const files = await glob("content/en/**/*.md");
    const allKeys = new Set<string>();
    const keyMap: Record<string, string[]> = {};

    for (const file of files) {
        try {
            const raw = await fs.readFile(file, "utf8");
            const { data } = matter(raw);
            Object.keys(data).forEach(k => {
                allKeys.add(k);
                if (!keyMap[k]) keyMap[k] = [];
                if (keyMap[k].length < 3) keyMap[k].push(file); // Sample usage
            });
        } catch (e) {
            console.error(`Error processing ${file}:`, e.message);
        }
    }

    console.error("Found Keys:", Array.from(allKeys).sort());
    // console.error("Samples:", JSON.stringify(keyMap, null, 2));
}

main().catch(console.error);
