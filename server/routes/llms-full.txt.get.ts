import { serverQueryContent } from "#content/server";
import { promises as fs } from "node:fs";
import path from "node:path";

// Helper to extract text from Nuxt Content AST
function astToText(node: any): string {
  if (!node) return "";

  // Text node
  if (node.type === "text") {
    return node.value || "";
  }

  // Children
  if (node.children && Array.isArray(node.children)) {
    let text = "";
    for (const child of node.children) {
      text += astToText(child);

      // Add spacing for block elements to preserve readability
      if (
        [
          "p",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "ul",
          "ol",
          "li",
          "blockquote",
          "pre",
          "hr",
        ].includes(child.tag)
      ) {
        text += "\n\n";
      }
    }
    return text;
  }

  return "";
}

// Helper to generate ASCII tree from file paths
function generateAsciiTree(paths: string[]): string {
  const root: Record<string, any> = {};
  for (const p of paths) {
    const parts = p.split("/").filter(Boolean);
    let current = root;
    for (const part of parts) {
      current[part] = current[part] || {};
      current = current[part];
    }
  }

  let output = "";
  function traverse(node: Record<string, any>, prefix: string, isLast: boolean) {
    const keys = Object.keys(node).sort();
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const display = key.replace(/\.md$/, ""); // Clean up extensions for readability
      const lastItem = i === keys.length - 1;
      const marker = lastItem ? "└── " : "├── ";
      output += `${prefix}${marker}${display}\n`;

      const children = node[key];
      if (Object.keys(children).length > 0) {
        traverse(children, prefix + (lastItem ? "    " : "│   "), true); // simplify children indentation
      }
    }
  }
  traverse(root, "", true);
  return output;
}

export default defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig(event);
  const siteUrl: string = runtime.public.siteUrl;
  const defaultLocale = runtime.public.defaultLocale || "en";

  // Re-fetch Home for the "North Star" description
  const homePath = `/${defaultLocale}`;
  const home = await serverQueryContent(event).where({ _path: homePath }).findOne();

  const allDocs = await serverQueryContent(event).where({ _partial: false }).find();

  const sortedDocs = allDocs.sort((a: any, b: any) => {
    const getPriority = (doc: any) => {
      // 1. Identity
      if (doc._path === "/en" || doc._path === "/") return 1;
      // 2. World Model
      if (
        doc._path?.includes("mustan-kilven-kantoni") ||
        doc.tags?.includes("world") ||
        doc.tags?.includes("lore")
      )
        return 2;
      // 3. Systems
      if (doc.tags?.includes("system") || doc.tags?.includes("rules")) return 3;
      // 4. Inventory
      if (doc.contentType?.includes("Game") || doc.contentType?.includes("Product")) return 4;
      // 5. Other
      return 5;
    };
    const pA = getPriority(a);
    const pB = getPriority(b);
    if (pA !== pB) return pA - pB;
    return (a.title || "").localeCompare(b.title || "");
  });

  const toAbsolute = (path: string) => {
    if (path.startsWith("http")) return path;
    return `${siteUrl}${path}`;
  };

  let fullText = "";

  // 1. The Header and Project "North Star"
  fullText += `# Gogam: Roleplaying Games from Finland (Full Context)\n`;
  fullText += `> [Version: ${new Date().toISOString().split("T")[0]}]\n`;
  if (home && home.description) {
    fullText += `> ${home.description}\n`;
  }
  fullText += `\n`;

  // 2. The Project Map (Navigation)
  fullText += `## Project Map\n\n`;

  // Table of Contents
  fullText += `### Table of Contents\n`;
  sortedDocs.forEach((doc) => {
    fullText += `- [${doc.title}](${toAbsolute(doc._path)})\n`;
  });
  fullText += `\n`;

  // Directory Structure (Tree)
  fullText += `### Directory Structure\n`;
  fullText += "```\n";
  // Get relative file paths for the tree
  const filePaths = sortedDocs.map((d) => d._file);
  fullText += generateAsciiTree(filePaths);
  fullText += "```\n\n";

  fullText += `## Content\n`;

  for (const doc of sortedDocs) {
    fullText += `\n---\n`;
    fullText += `Title: ${doc.title}\n`;
    if (doc.datePublished) fullText += `Date Published: ${doc.datePublished}\n`;
    if (doc.author)
      fullText += `Author: ${typeof doc.author === "string" ? doc.author : doc.author.name}\n`;
    fullText += `URL: ${toAbsolute(doc._path)}\n`;
    fullText += `\n`;

    let content = "";
    let strategyUsed = "";

    // STRATEGY 1: Raw File via Storage (Server Assets)
    try {
      const storage = useStorage("assets:content");
      const fileKey = doc._file.replace(/^\//, "");
      content = (await storage.getItem(fileKey)) as string;
      if (!content) {
        const colonKey = fileKey.replace(/\//g, ":");
        content = (await storage.getItem(colonKey)) as string;
      }
      if (content) strategyUsed = "Storage (Raw)";
    } catch {}

    // STRATEGY 2: Raw File via FS (Build Time)
    if (!content) {
      try {
        const filePath = path.resolve(process.cwd(), "content", doc._file);
        content = await fs.readFile(filePath, "utf-8");
        if (content) strategyUsed = "FS (Raw)";
      } catch {}
    }

    // STRATEGY 3: AST Reconstruction (Runtime/Cache Fallback)
    // If raw access failed, we rely on the parsed AST which provided 'doc' in the first place.
    if (!content && doc.body) {
      try {
        content = astToText(doc.body);
        if (content) strategyUsed = "AST (Parsed)";
      } catch {}
    }

    if (content) {
      // Processing
      if (strategyUsed.includes("Raw")) {
        content = content.replace(/^---[\s\S]*?---/, "").trim(); // Strip frontmatter
        content = content.replace(/^::\w+.*$/gm, "> ");
        content = content.replace(/^::$/gm, "");
      }
      content = content.replace(/\]\(\/(?!^)/g, `](${siteUrl}/`);

      fullText += `## ${doc.title}\n\n`;
      fullText += content.trim();
      fullText += `\n\n`;
    } else {
      // Absolute failure
      console.error(`Failed to retrieve content for ${doc.title}`);
      if (doc.description) {
        fullText += `> ${doc.description}\n\n`;
      }
    }
  }

  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  setHeader(event, "X-Robots-Tag", "noindex");
  return fullText;
});
