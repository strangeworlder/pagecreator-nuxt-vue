
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
            // Use Nitro Server Assets storage to read raw files
            // This works in BOTH Prerender (Build) and Runtime (Lambda)
            // PROVIDED "serverAssets" is configured in nuxt.config.ts
            const storage = useStorage('assets:content');

            // Standard Nitro Asset Keys usually replace / with :
            // e.g. "en/index.md" -> "en:index.md"
            // We strip leading slash just in case
            let fileKey = doc._file.replace(/^\//, '');

            // Try fetching with slash (sometimes works in dev)
            let content = await storage.getItem(fileKey) as string;

            // Retry with colon separator (Standard Nitro)
            if (!content) {
                const colonKey = fileKey.replace(/\//g, ':');
                content = await storage.getItem(colonKey) as string;
            }

            if (!content) {
                // Debug info for logs
                const keys = await storage.getKeys();
                // If keys are empty, serverAssets config failed.
                throw new Error(`File not found in storage. Tried "${fileKey}". Keys available: ${keys.length}`);
            }

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
            fullText += `[Error reading content file: ${doc._file} - Error: ${e.message}]\n\n`;
            // Fallback: Use description if body is missing
            if (doc.description) {
                fullText += `> ${doc.description}\n\n`;
            }
        }
    }

    setHeader(event, "Content-Type", "text/plain; charset=utf-8");
    return fullText;
});
