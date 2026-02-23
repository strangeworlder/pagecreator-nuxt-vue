import { serverQueryContent } from "#content/server";

export default defineEventHandler(async (event) => {
  const lang = getRouterParam(event, "lang");

  if (lang !== "en" && lang !== "fi") {
    throw createError({ statusCode: 404, statusMessage: "Page Not Found" });
  }

  const baseUrl = useRuntimeConfig(event).public.siteUrl;
  const siteName = useRuntimeConfig(event).public.siteName;

  const newsPath = `/${lang}/${lang === "fi" ? "uutiset" : "news"}`;
  const docs = await serverQueryContent(event, newsPath)
    .where({ template: "article" })
    .sort({ datePublished: -1 })
    .find();

  const title = lang === "fi" ? `${siteName} Uutiset` : `${siteName} News`;
  const description =
    lang === "fi"
      ? `Uusimmat uutiset ja artikkelit ${siteName}lta`
      : `Latest news and articles from ${siteName}`;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
  xml += `  <channel>\n`;
  xml += `    <title><![CDATA[${title}]]></title>\n`;
  xml += `    <link>${baseUrl}/${lang}/news</link>\n`;
  xml += `    <description><![CDATA[${description}]]></description>\n`;
  xml += `    <language>${lang}</language>\n`;
  xml += `    <atom:link href="${baseUrl}/${lang}/rss.xml" rel="self" type="application/rss+xml"/>\n`;

  for (const doc of docs) {
    let loc = doc._path;
    if (doc.canonical && typeof doc.canonical === "string" && doc.canonical.startsWith("/")) {
      loc = doc.canonical;
    }
    const path = loc === "/" ? "" : loc?.replace(/\/$/, "");
    const url = `${baseUrl.replace(/\/$/, "")}${path}`;

    const date = doc.datePublished
      ? new Date(doc.datePublished).toUTCString()
      : new Date().toUTCString();

    xml += `    <item>\n`;
    xml += `      <title><![CDATA[${doc.title}]]></title>\n`;
    xml += `      <link>${url}</link>\n`;
    xml += `      <guid isPermaLink="true">${url}</guid>\n`;
    xml += `      <description><![CDATA[${doc.description || ""}]]></description>\n`;
    xml += `      <pubDate>${date}</pubDate>\n`;

    if (doc.author) {
      xml += `      <author>no-reply@gogam.eu (${doc.author})</author>\n`;
    }

    xml += `    </item>\n`;
  }

  xml += `  </channel>\n`;
  xml += `</rss>`;

  setHeader(event, "Content-Type", "application/rss+xml; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600");

  return xml;
});
