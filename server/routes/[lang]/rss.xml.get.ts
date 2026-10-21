import { queryCollection } from "@nuxt/content/server";
import { type CanonicalizableDoc, resolveCanonicalPath } from "~/utils/routing";

export default defineEventHandler(async (event) => {
  const lang = getRouterParam(event, "lang");

  if (lang !== "en" && lang !== "fi") {
    throw createError({ statusCode: 404, statusMessage: "Page Not Found" });
  }

  const baseUrl = String(useRuntimeConfig(event).public.siteUrl || "");
  const siteName = String(useRuntimeConfig(event).public.siteName || "Gogam");

  const newsPath = `/${lang}/${lang === "fi" ? "uutiset" : "news"}`;
  const docs = await queryCollection(event, "content")
    .where("path", "LIKE", `${newsPath}/%`)
    .where("template", "=", "article")
    .order("datePublished", "DESC")
    .all();

  const title = lang === "fi" ? `${siteName} Uutiset` : `${siteName} News`;
  const description =
    lang === "fi"
      ? `Uusimmat uutiset ja artikkelit ${siteName}lta`
      : `Latest news and articles from ${siteName}`;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
  xml += "  <channel>\n";
  xml += `    <title><![CDATA[${title}]]></title>\n`;
  xml += `    <link>${baseUrl}/${lang}/news</link>\n`;
  xml += `    <description><![CDATA[${description}]]></description>\n`;
  xml += `    <language>${lang}</language>\n`;
  xml += `    <atom:link href="${baseUrl}/${lang}/rss.xml" rel="self" type="application/rss+xml"/>\n`;

  for (const doc of docs) {
    const loc = resolveCanonicalPath(doc as CanonicalizableDoc, lang);
    const path = loc === "/" ? "" : loc.replace(/\/$/, "");
    const url = `${baseUrl.replace(/\/$/, "")}${path}`;

    const date = doc.datePublished
      ? new Date(doc.datePublished).toUTCString()
      : new Date().toUTCString();

    const authorName =
      typeof doc.author === "string"
        ? doc.author
        : doc.author && typeof doc.author === "object" && "name" in doc.author
          ? doc.author.name
          : undefined;

    xml += "    <item>\n";
    xml += `      <title><![CDATA[${doc.title}]]></title>\n`;
    xml += `      <link>${url}</link>\n`;
    xml += `      <guid isPermaLink="true">${url}</guid>\n`;
    xml += `      <description><![CDATA[${doc.description || ""}]]></description>\n`;
    xml += `      <pubDate>${date}</pubDate>\n`;

    if (authorName) {
      xml += `      <author>no-reply@gogam.eu (${authorName})</author>\n`;
    }

    xml += "    </item>\n";
  }

  xml += "  </channel>\n";
  xml += "</rss>";

  setHeader(event, "Content-Type", "application/rss+xml; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600");

  return xml;
});
