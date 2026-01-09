
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

    // === EXCESSIVE DEBUGGING ===
    const debugInfo: string[] = [];

    // 1. Environment Variables & Context
    try {
        debugInfo.push(`ENV: NODE_ENV=${process.env.NODE_ENV}`);
        debugInfo.push(`ENV: NITRO_PRESET=${process.env.NITRO_PRESET}`);
        debugInfo.push(`CWD: ${process.cwd()}`);
        // @ts-ignore
        debugInfo.push(`__filename: ${typeof __filename !== 'undefined' ? __filename : 'undefined'}`);
    } catch (e: any) { debugInfo.push(`Env Error: ${e.message}`); }

    // 2. Storage Inspection (ROOT SCOPE)
    const storage = useStorage();
    try {
        const rootKeys = await storage.getKeys();
        debugInfo.push(`Storage (Root): Found ${rootKeys.length} keys.`);
        if (rootKeys.length > 0) {
            debugInfo.push(`Storage Sample: ${rootKeys.slice(0, 20).join(', ')}`);
        } else {
            debugInfo.push(`Storage: EMPTY (This explains why assets:content failed)`);
            // Check mount points directly if possible (internal API, risky but informative)
            // @ts-ignore
            if (storage.getMounts) {
                // @ts-ignore
                const mounts = storage.getMounts();
                debugInfo.push(`Storage Mounts: ${mounts.map(m => m.base).join(', ')}`);
            }
        }
    } catch (e: any) {
        debugInfo.push(`Storage Error: ${e.message}`);
    }

    // 3. Recursive FS Inspection (Up and Down)
    async function scanDir(dir: string, depth: number = 0) {
        if (depth > 1) return []; // Don't go too deep
        try {
            const files = await fs.readdir(dir, { withFileTypes: true });
            const result: string[] = [];
            for (const f of files) {
                if (f.isDirectory()) {
                    result.push(`${dir}/${f.name}/`);
                    if (depth < 1 && !['node_modules', '.git', '.output'].includes(f.name)) {
                        const sub = await scanDir(path.resolve(dir, f.name), depth + 1);
                        result.push(...sub);
                    }
                } else {
                    result.push(`${dir}/${f.name}`);
                }
            }
            return result;
        } catch (e) {
            return [`ERR reading ${dir}`];
        }
    }

    try {
        const cwdScan = await scanDir(process.cwd());
        debugInfo.push(`FS Scan (CWD): ${cwdScan.length} items. Sample: ${cwdScan.slice(0, 15).join(', ')}`);

        // Try ONE level up
        const parent = path.resolve(process.cwd(), '..');
        const parentScan = await scanDir(parent);
        debugInfo.push(`FS Scan (Parent ${parent}): ${parentScan.length} items. Sample: ${parentScan.slice(0, 15).join(', ')}`);
    } catch (e: any) {
        debugInfo.push(`FS Scan Error: ${e.message}`);
    }
    // ============================

    // Embed Debug info at the TOP of the file for visibility
    fullText += `=== DEBUG REPORT ===\n`;
    fullText += debugInfo.join('\n');
    fullText += `\n====================\n\n`;

    for (const doc of sortedDocs) {
        fullText += `\n---\n`;
        fullText += `Title: ${doc.title}\n`;
        fullText += `URL: ${toAbsolute(doc._path)}\n\n`;

        // Use the debug info to decide strategy? No, just try and fail/succeed logged.
        let content = null;

        // Try Storage
        try {
            let fileKey = doc._file.replace(/^\//, '');
            // Try prefixing based on what we see in debug logic? 
            // Just standard logic for now, the REPORT is what matters.
            content = await storage.getItem(`assets:content:${fileKey}`) as string;
            if (!content) content = await storage.getItem(fileKey) as string;
            if (!content) content = await storage.getItem(`content:${fileKey}`) as string;
        } catch { }

        // Try FS
        if (!content) {
            try {
                const filePath = path.resolve(process.cwd(), 'content', doc._file);
                content = await fs.readFile(filePath, 'utf-8');
            } catch { }
        }

        if (content) {
            content = content.replace(/^---[\s\S]*?---/, '').trim();
            content = content.replace(/^::\w+.*$/gm, '> ');
            content = content.replace(/^::$/gm, '');
            content = content.replace(/\]\(\/(?!^)/g, `](${siteUrl}/`);
            fullText += `## ${doc.title}\n\n${content}\n\n`;
        } else {
            fullText += `[Content Missing] ${doc.description || ''}\n\n`;
        }
    }

    setHeader(event, "Content-Type", "text/plain; charset=utf-8");
    return fullText;
});
