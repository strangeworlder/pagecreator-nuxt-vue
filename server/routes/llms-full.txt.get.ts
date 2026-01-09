
import { serverQueryContent } from "#content/server";
import { promises as fs } from 'node:fs';
import path from 'node:path';

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

        let content = null;
        let errors = [];

        // STRATEGY 1: Nitro Server Assets (Bundle Access)
        // Primary method for both Prerender & Runtime
        try {
            const storage = useStorage('assets:content');
            let fileKey = doc._file.replace(/^\//, '');
            content = await storage.getItem(fileKey) as string;

            if (!content) {
                // Try colon separator
                const colonKey = fileKey.replace(/\//g, ':');
                content = await storage.getItem(colonKey) as string;
            }
        } catch (e: any) {
            errors.push(`Storage: ${e.message}`);
        }

        // STRATEGY 2: Node FS Fallback (Build/Prerender Only)
        // If storage fails, we might be in the build environment where FS is available
        if (!content) {
            try {
                const cwd = process.cwd();
                // Try standard path inside content folder
                const filePath = path.resolve(cwd, 'content', doc._file);
                content = await fs.readFile(filePath, 'utf-8');
            } catch (e: any) {
                errors.push(`FS: ${e.message}`);
            }
        }

        if (content) {
            // Success! Process content
            content = content.replace(/^---[\s\S]*?---/, '').trim();
            content = content.replace(/^::\w+.*$/gm, '> ');
            content = content.replace(/^::$/gm, '');
            content = content.replace(/\]\(\/(?!^)/g, `](${siteUrl}/`);

            fullText += `## ${doc.title}\n\n`;
            fullText += content;
            fullText += `\n\n`;
        } else {
            // Failure: Log errors and use description
            console.error(`Error reading ${doc._file}:`, errors);
            fullText += `[Error reading content file: ${doc._file}]\n`;
            fullText += `> Debug Info: ${errors.join(', ')}\n\n`;

            if (doc.description) {
                fullText += `> ${doc.description}\n\n`;
            }
        }
    }

    setHeader(event, "Content-Type", "text/plain; charset=utf-8");
    return fullText;
});
