
import { serverQueryContent } from "#content/server";
import { promises as fs } from 'node:fs';
import path from 'node:path';

export default defineEventHandler(async (event) => {
    const runtime = useRuntimeConfig(event);
    const siteUrl: string = runtime.public.siteUrl;

    // Fetch all documents
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

    // CONFIG: LOCATE CONTENT DIRECTORY
    // During PRERENDER (Build), this typically works from project root.
    const cwd = process.cwd();

    // Potentially search multiple depths if CWD is somehow nested
    const potentialPaths = [
        path.resolve(cwd, 'content'),
        path.resolve(cwd, '../content'),
        path.resolve(cwd, '../../content'),
        path.resolve(cwd, 'src/content')
    ];

    let contentDir = "";
    let dirExists = false;

    for (const p of potentialPaths) {
        try {
            await fs.access(p);
            // Verify it's a directory
            const stat = await fs.stat(p);
            if (stat.isDirectory()) {
                contentDir = p;
                dirExists = true;
                break;
            }
        } catch { }
    }

    // DEBUG: Collect environment info to proving Prerender context
    // If successful, this text ends up in the static file, but valid content overwrites/appends.
    let fsDebugLog = "";
    if (!dirExists) {
        try {
            const files = await fs.readdir(cwd);
            fsDebugLog += `[DEBUG - PRERENDER FAIL?] Content dir not found. CWD: ${cwd}.\nChecked paths: ${potentialPaths.join(', ')}\nFiles in CWD: ${files.join(', ')}\n`;
        } catch (e: any) {
            fsDebugLog += `[DEBUG] ReadDir failed: ${e.message}\n`;
        }
    }

    for (const doc of sortedDocs) {
        fullText += `\n---\n`;
        fullText += `Title: ${doc.title}\n`;
        if (doc.datePublished) fullText += `Date Published: ${doc.datePublished}\n`;
        if (doc.author) fullText += `Author: ${typeof doc.author === 'string' ? doc.author : doc.author.name}\n`;
        fullText += `URL: ${toAbsolute(doc._path)}\n`;
        fullText += `\n`;

        try {
            if (!dirExists) {
                throw new Error("Content directory not found.");
            }

            const filePath = path.resolve(contentDir, doc._file);
            let content = await fs.readFile(filePath, 'utf-8');

            // Strip Frontmatter
            content = content.replace(/^---[\s\S]*?---/, '').trim();
            // Strip MDC components
            content = content.replace(/^::\w+.*$/gm, '> ');
            content = content.replace(/^::$/gm, '');
            // Ensure Absolute Links
            content = content.replace(/\]\(\/(?!^)/g, `](${siteUrl}/`);

            fullText += `## ${doc.title}\n\n`;
            fullText += content;
            fullText += `\n\n`;

        } catch (e: any) {
            console.error(`Error reading file ${doc._file}:`, e);
            fullText += `[Error reading content file: ${doc._file}]\n`;
            fullText += `> Info: CWD=${cwd} ContentDir=${contentDir || 'NOT_FOUND'}\n`;
            if (fsDebugLog) {
                fullText += `> ${fsDebugLog}\n`;
            }
            // Fallback: Use description
            if (doc.description) {
                fullText += `> ${doc.description}\n\n`;
            }
        }
    }

    setHeader(event, "Content-Type", "text/plain; charset=utf-8");
    return fullText;
});
