import { d as defineEventHandler, b as useRuntimeConfig, q as queryCollection, k as useStorage, s as setHeader } from '../_/nitro.mjs';
import { promises } from 'node:fs';
import path from 'node:path';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'better-sqlite3';
import 'node:crypto';

function astToText(node) {
  if (!node) return "";
  if (node.type === "text") {
    return node.value || "";
  }
  if (node.children && Array.isArray(node.children)) {
    let text = "";
    for (const child of node.children) {
      text += astToText(child);
      if ([
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
        "hr"
      ].includes(child.tag)) {
        text += "\n\n";
      }
    }
    return text;
  }
  return "";
}
function generateAsciiTree(paths) {
  const root = {};
  for (const p of paths) {
    const parts = p.split("/").filter(Boolean);
    let current = root;
    for (const part of parts) {
      current[part] = current[part] || {};
      current = current[part];
    }
  }
  let output = "";
  function traverse(node, prefix, isLast) {
    const keys = Object.keys(node).sort();
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const display = key.replace(/\.md$/, "");
      const lastItem = i === keys.length - 1;
      const marker = lastItem ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
      output += `${prefix}${marker}${display}
`;
      const children = node[key];
      if (Object.keys(children).length > 0) {
        traverse(children, prefix + (lastItem ? "    " : "\u2502   "));
      }
    }
  }
  traverse(root, "");
  return output;
}
const llmsFull_txt_get = defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig(event);
  const siteUrl = runtime.public.siteUrl;
  const defaultLocale = runtime.public.defaultLocale || "fi";
  const homePath = `/${defaultLocale}`;
  const home = await queryCollection(event, "content").path(homePath).first();
  const allDocs = await queryCollection(event, "content").all();
  const sortedDocs = [...allDocs].sort((a, b) => {
    const getPriority = (doc) => {
      var _a, _b, _c, _d, _e, _f, _g;
      if (doc.path === "/en" || doc.path === "/") return 1;
      if (((_a = doc.path) == null ? void 0 : _a.includes("mustan-kilven-kantoni")) || ((_b = doc.tags) == null ? void 0 : _b.includes("world")) || ((_c = doc.tags) == null ? void 0 : _c.includes("lore")))
        return 2;
      if (((_d = doc.tags) == null ? void 0 : _d.includes("system")) || ((_e = doc.tags) == null ? void 0 : _e.includes("rules"))) return 3;
      if (((_f = doc.contentType) == null ? void 0 : _f.includes("Game")) || ((_g = doc.contentType) == null ? void 0 : _g.includes("Product"))) return 4;
      return 5;
    };
    const pA = getPriority(a);
    const pB = getPriority(b);
    if (pA !== pB) return pA - pB;
    return (a.title || "").localeCompare(b.title || "");
  });
  const toAbsolute = (path2) => {
    if (path2.startsWith("http")) return path2;
    return `${siteUrl}${path2}`;
  };
  let fullText = "";
  fullText += `# Gogam: Roleplaying Games from Finland (Full Context)
`;
  fullText += `> [Version: ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}]
`;
  if (home && home.description) {
    fullText += `> ${home.description}
`;
  }
  fullText += `
`;
  fullText += `## Project Map

`;
  fullText += `### Table of Contents
`;
  sortedDocs.forEach((doc) => {
    fullText += `- [${doc.title}](${toAbsolute(doc.path)})
`;
  });
  fullText += `
`;
  fullText += `### Directory Structure
`;
  fullText += "```\n";
  const filePaths = sortedDocs.map((d) => d.path);
  fullText += generateAsciiTree(filePaths);
  fullText += "```\n\n";
  fullText += `## Content
`;
  for (const doc of sortedDocs) {
    fullText += `
---
`;
    fullText += `Title: ${doc.title}
`;
    if (doc.datePublished) fullText += `Date Published: ${doc.datePublished}
`;
    if (doc.author)
      fullText += `Author: ${typeof doc.author === "string" ? doc.author : doc.author.name}
`;
    fullText += `URL: ${toAbsolute(doc.path)}
`;
    fullText += `
`;
    let content = "";
    let strategyUsed = "";
    try {
      const storage = useStorage("assets:content");
      const fileKey = (doc.id || doc.path).replace(/^\//, "");
      content = await storage.getItem(fileKey);
      if (!content) {
        const colonKey = fileKey.replace(/\//g, ":");
        content = await storage.getItem(colonKey);
      }
      if (content) strategyUsed = "Storage (Raw)";
    } catch {
    }
    if (!content) {
      try {
        const filePath = path.resolve(process.cwd(), "content", (doc.id || doc.path).replace(/^\//, ""));
        content = await promises.readFile(filePath, "utf-8");
        if (content) strategyUsed = "FS (Raw)";
      } catch {
      }
    }
    if (!content && doc.body) {
      try {
        content = astToText(doc.body);
        if (content) strategyUsed = "AST (Parsed)";
      } catch {
      }
    }
    if (content) {
      if (strategyUsed.includes("Raw")) {
        content = content.replace(/^---[\s\S]*?---/, "").trim();
        content = content.replace(/^::\w+.*$/gm, "> ");
        content = content.replace(/^::$/gm, "");
      }
      content = content.replace(/\]\(\/(?!^)/g, `](${siteUrl}/`);
      fullText += `## ${doc.title}

`;
      fullText += content.trim();
      fullText += `

`;
    } else {
      console.error(`Failed to retrieve content for ${doc.title}`);
      if (doc.description) {
        fullText += `> ${doc.description}

`;
      }
    }
  }
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  setHeader(event, "X-Robots-Tag", "noindex");
  return fullText;
});

export { llmsFull_txt_get as default };
//# sourceMappingURL=llms-full.txt.get.mjs.map
