
import { serverQueryContent } from "#content/server";

export default defineEventHandler(async (event) => {
    const runtime = useRuntimeConfig(event);
    const siteUrl: string = runtime.public.siteUrl;

    // Fetch all documents
    const allDocs = await serverQueryContent(event).where({ _partial: false }).find();

    // Filter for English docs only
    const englishDocs = allDocs.filter((d: any) => String(d._path).startsWith("/en") || String(d._path) === "/");

    const toAbsolute = (path: string) => {
        if (path.startsWith("http")) return path;
        return `${siteUrl}${path}`;
    };

    // Helper to prioritize content types
    const getPriority = (doc: any) => {
        // 1. Identity (Home)
        if (doc._path === "/en" || doc._path === "/") return 1;
        // 2. World Model (Lore)
        if (doc._path?.includes("mustan-kilven-kantoni") || doc.tags?.includes("world")) return 2;
        // 3. Systems (Games)
        if (doc.contentType?.includes("Game") || doc.contentType?.includes("Product")) return 3;
        // 4. Inventory/Others
        return 4;
    };

    // Sort docs
    const sortedDocs = englishDocs.sort((a: any, b: any) => {
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB) return pA - pB;
        return (a.title || "").localeCompare(b.title || "");
    });

    let fullText = "";

    for (const doc of sortedDocs) {
        // Skip if it's a redirect? 
        // if (!doc.body) continue;

        fullText += `\n---\n`;
        fullText += `Title: ${doc.title}\n`;
        if (doc.datePublished) fullText += `Date Published: ${doc.datePublished}\n`;
        if (doc.author) fullText += `Author: ${typeof doc.author === 'string' ? doc.author : doc.author.name}\n`;
        fullText += `URL: ${toAbsolute(doc._path)}\n`;
        fullText += `\n`;

        try {
            const fs = await import('node:fs/promises');
            const path = await import('node:path');

            // Try to resolve content directory relative to cwd
            // In Docker (Nitro), cwd is usually /app. content should be /app/content.
            const contentDir = path.resolve(process.cwd(), 'content');
            const filePath = path.resolve(contentDir, doc._file);

            let content = await fs.readFile(filePath, 'utf-8');

            // Strip Frontmatter
            content = content.replace(/^---[\s\S]*?---/, '').trim();

            // Strip MDC components (::alert{...})
            content = content.replace(/^::\w+.*$/gm, '> '); // Start of block
            content = content.replace(/^::$/gm, ''); // End of block

            // Ensure Absolute Links
            content = content.replace(/\]\(\/(?!^)/g, `](${siteUrl}/`);

            fullText += `## ${doc.title}\n\n`;
            fullText += content;
            fullText += `\n\n`;

        } catch (e) {
            console.error(`Error reading file ${doc._file}:`, e);
            fullText += `[Error reading content file: ${doc._file}]\n\n`;
            // Fallback: Use description if body is missing
            if (doc.description) {
                fullText += `> ${doc.description}\n\n`;
            }
        }
    }

    setHeader(event, "Content-Type", "text/plain; charset=utf-8");
    return fullText;
});
