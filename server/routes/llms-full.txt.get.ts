import { promises as fs } from "node:fs";
import path from "node:path";
import { queryCollection } from "@nuxt/content/server";
import { type CanonicalizableDoc, resolveCanonicalPath } from "~/utils/routing";

interface AstNode {
  type?: string;
  tag?: string;
  value?: string;
  children?: AstNode[];
}

interface AsciiTreeNode {
  [key: string]: AsciiTreeNode;
}

interface LlmFullContentDoc {
  id?: string;
  path?: string;
  canonical?: string;
  template?: string;
  title?: string;
  description?: string;
  datePublished?: string | Date;
  author?: string | { name?: string };
  contentType?: string | string[];
  tags?: string[];
  body?: AstNode;
  meta?: Record<string, unknown>;
}

// Helper to extract text from Nuxt Content AST
function astToText(node: AstNode | null | undefined): string {
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
        child.tag &&
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
  const root: AsciiTreeNode = {};
  for (const p of paths) {
    const parts = p.split("/").filter(Boolean);
    let current = root;
    for (const part of parts) {
      current[part] = current[part] || {};
      current = current[part];
    }
  }

  let output = "";
  function traverse(node: AsciiTreeNode, prefix: string) {
    const keys = Object.keys(node).sort();
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!key) continue;
      const display = key.replace(/\.md$/, ""); // Clean up extensions for readability
      const lastItem = i === keys.length - 1;
      const marker = lastItem ? "└── " : "├── ";
      output += `${prefix}${marker}${display}\n`;

      const children = node[key];
      if (children && Object.keys(children).length > 0) {
        traverse(children, prefix + (lastItem ? "    " : "│   "));
      }
    }
  }
  traverse(root, "");
  return output;
}

export default defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig(event);
  const siteUrl: string = runtime.public.siteUrl;
  const defaultLocale = String(runtime.public.defaultLocale || "fi");

  const unwrapDoc = (raw: unknown): LlmFullContentDoc | null => {
    if (!raw || typeof raw !== "object") return null;
    const doc = raw as LlmFullContentDoc;
    if (doc.meta && typeof doc.meta === "object") {
      return { ...doc, ...(doc.meta as Partial<LlmFullContentDoc>) };
    }
    return doc;
  };

  const hasContentType = (doc: LlmFullContentDoc, target: string): boolean => {
    const ct = doc.contentType;
    if (Array.isArray(ct)) return ct.includes(target);
    if (typeof ct === "string") return ct.includes(target);
    return false;
  };

  // Re-fetch English Home for the "North Star" description, fallback to defaultLocale
  const rawHomeEn = await queryCollection(event, "content")
    .path("/en")
    .first()
    .catch(() => null);
  const rawHome =
    rawHomeEn || (await queryCollection(event, "content").path(`/${defaultLocale}`).first());
  const home = unwrapDoc(rawHome);

  const rawDocs = await queryCollection(event, "content").all();
  const allDocs = rawDocs
    .map((d) => unwrapDoc(d))
    .filter((d): d is LlmFullContentDoc => d !== null);

  const sortedDocs = [...allDocs].sort((a, b) => {
    const getPriority = (doc: LlmFullContentDoc) => {
      // 1. Identity
      if (doc.path === "/en" || doc.path === "/fi" || doc.path === "/") return 1;
      // 2. World Model
      if (
        doc.path?.includes("mustan-kilven-kantoni") ||
        doc.tags?.includes("world") ||
        doc.tags?.includes("lore")
      )
        return 2;
      // 3. Systems
      if (doc.tags?.includes("system") || doc.tags?.includes("rules")) return 3;
      // 4. Inventory
      if (hasContentType(doc, "Game") || hasContentType(doc, "Product")) return 4;
      // 5. Other
      return 5;
    };
    const pA = getPriority(a);
    const pB = getPriority(b);
    if (pA !== pB) return pA - pB;
    return (a.title || "").localeCompare(b.title || "");
  });

  const toAbsolute = (p: string) => {
    if (p.startsWith("http")) return p;
    return `${siteUrl}${p}`;
  };

  const toDocUrl = (doc: LlmFullContentDoc) => {
    const canonicalPath = resolveCanonicalPath(doc as CanonicalizableDoc, defaultLocale);
    return toAbsolute(canonicalPath);
  };

  let fullText = "";

  // 1. The Header and Project "North Star"
  fullText += "# Gogam: Roleplaying Games from Finland (Full Context)\n";
  fullText += `> [Version: ${new Date().toISOString().split("T")[0]}]\n`;
  if (home?.description) {
    fullText += `> ${home.description}\n`;
  }
  fullText += "\n";

  // 2. The Project Map (Navigation)
  fullText += "## Project Map\n\n";

  // Table of Contents
  fullText += "### Table of Contents\n";
  for (const doc of sortedDocs) {
    fullText += `- [${doc.title}](${toDocUrl(doc)})\n`;
  }
  fullText += "\n";

  // Directory Structure (Tree)
  fullText += "### Directory Structure\n";
  fullText += "```\n";
  // Get relative file paths for the tree
  const filePaths = sortedDocs.map((d) => d.path || "/");
  fullText += generateAsciiTree(filePaths);
  fullText += "```\n\n";

  fullText += "## Content\n";

  for (const doc of sortedDocs) {
    const docPath = doc.path || "/";
    fullText += "\n---\n";
    fullText += `Title: ${doc.title}\n`;
    if (doc.datePublished) fullText += `Date Published: ${doc.datePublished}\n`;
    if (doc.author)
      fullText += `Author: ${typeof doc.author === "string" ? doc.author : doc.author.name}\n`;
    fullText += `URL: ${toDocUrl(doc)}\n`;
    fullText += "\n";

    let content = "";
    let strategyUsed = "";

    // STRATEGY 1: Raw File via Storage (Server Assets)
    try {
      const storage = useStorage("assets:content");
      const fileKey = (doc.id || docPath).replace(/^\//, "");
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
        const basePath = path.resolve(process.cwd(), "content", docPath.replace(/^\//, ""));
        for (const ext of [".md", "/index.md", ".mdx"]) {
          try {
            content = await fs.readFile(basePath + ext, "utf-8");
            if (content) {
              strategyUsed = "FS (Raw)";
              break;
            }
          } catch {}
        }
      } catch {}
    }

    // STRATEGY 3: AST Reconstruction (Runtime/Cache Fallback)
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
      fullText += "\n\n";
    } else {
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
