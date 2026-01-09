
import { serverQueryContent } from "#content/server";

export default defineEventHandler(async (event) => {
    const runtime = useRuntimeConfig(event);
    const siteUrl: string = runtime.public.siteUrl;

    // Fetch all documents
    const allDocs = await serverQueryContent(event).where({ _partial: false }).find();

    // Sort to prioritize Identity -> World -> Systems -> Other
    const sortedDocs = allDocs.sort((a: any, b: any) => {
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

    for (const doc of sortedDocs) {
        fullText += `\n---\n`;
        fullText += `Title: ${doc.title}\n`;
        if (doc.datePublished) fullText += `Date Published: ${doc.datePublished}\n`;
        if (doc.author) fullText += `Author: ${typeof doc.author === 'string' ? doc.author : doc.author.name}\n`;
        fullText += `URL: ${toAbsolute(doc._path)}\n`;
        fullText += `\n`;

        try {
            // Using standard fs because this route is PRERENDERED.
            // It runs at build time, where source files exist on disk.
            const fs = await import('node:fs/promises');
            const path = await import('node:path');

            // Resolve path relative to project root (CWD during build)
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

        } catch (e: any) {
            console.error(`Error reading file ${doc._file}:`, e);
            fullText += `[Error reading content file: ${doc._file} - CWD: ${process.cwd()} - Error: ${e.message}]\n\n`;
            // Fallback: Use description if body is missing
            if (doc.description) {
                fullText += `> ${doc.description}\n\n`;
            }
        }
    }

    setHeader(event, "Content-Type", "text/plain; charset=utf-8");
    return fullText;
});
