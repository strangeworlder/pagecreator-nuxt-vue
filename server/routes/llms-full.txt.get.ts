
import { serverQueryContent } from "#content/server";
import { promises as fs } from 'node:fs';
import path from 'node:path';

export default defineEventHandler(async (event) => {
    const runtime = useRuntimeConfig(event);
    const siteUrl: string = runtime.public.siteUrl;

    const allDocs = await serverQueryContent(event).where({ _partial: false }).find();

    const sortedDocs = allDocs.sort((a: any, b: any) => {
        const getPriority = (doc: any) => {
            if (doc._path === "/en" || doc._path === "/") return 1;
            if (doc._path?.includes("mustan-kilven-kantoni") || doc.tags?.includes("world")) return 2;
            if (doc.contentType?.includes("Game") || doc.contentType?.includes("Product")) return 3;
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
        let storageKeys: string[] = [];

        // STRATEGY 1: Nitro Server Assets
        try {
            const storage = useStorage('assets:content');
            let fileKey = doc._file.replace(/^\//, '');
            content = await storage.getItem(fileKey) as string;

            if (!content) {
                const colonKey = fileKey.replace(/\//g, ':');
                content = await storage.getItem(colonKey) as string;
            }

            if (!content) {
                // Collect keys only on failure to avoid perf hit on success
                storageKeys = await storage.getKeys();
                errors.push(`Storage: Item null. Available keys (${storageKeys.length}): ${storageKeys.slice(0, 5).join(', ')}`);
            }
        } catch (e: any) {
            errors.push(`Storage Error: ${e.message}`);
        }

        // STRATEGY 2: Node FS Fallback
        if (!content) {
            try {
                const cwd = process.cwd();
                const filePath = path.resolve(cwd, 'content', doc._file);
                content = await fs.readFile(filePath, 'utf-8');
            } catch (e: any) {
                errors.push(`FS Error: ${e.message} (CWD: ${process.cwd()})`);
            }
        }

        if (content) {
            content = content.replace(/^---[\s\S]*?---/, '').trim();
            content = content.replace(/^::\w+.*$/gm, '> ');
            content = content.replace(/^::$/gm, '');
            content = content.replace(/\]\(\/(?!^)/g, `](${siteUrl}/`);

            fullText += `## ${doc.title}\n\n`;
            fullText += content;
            fullText += `\n\n`;
        } else {
            console.error(`Error reading ${doc._file}:`, errors);
            fullText += `[Error reading content file: ${doc._file}]\n`;
            // Be very explicit in the output
            fullText += `> Debug Info: ${errors.join(' | ')}\n\n`;
            if (doc.description) {
                fullText += `> ${doc.description}\n\n`;
            }
        }
    }

    setHeader(event, "Content-Type", "text/plain; charset=utf-8");
    return fullText;
});
