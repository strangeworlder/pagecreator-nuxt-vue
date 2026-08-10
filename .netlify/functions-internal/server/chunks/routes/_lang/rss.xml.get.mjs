import { d as defineEventHandler, i as getRouterParam, e as createError, b as useRuntimeConfig, q as queryCollection, s as setHeader } from '../../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'better-sqlite3';
import 'node:crypto';

const rss_xml_get = defineEventHandler(async (event) => {
  const lang = getRouterParam(event, "lang");
  if (lang !== "en" && lang !== "fi") {
    throw createError({ statusCode: 404, statusMessage: "Page Not Found" });
  }
  const baseUrl = useRuntimeConfig(event).public.siteUrl;
  const siteName = useRuntimeConfig(event).public.siteName;
  const newsPath = `/${lang}/${lang === "fi" ? "uutiset" : "news"}`;
  const docs = await queryCollection(event, "content").where("path", "LIKE", `${newsPath}/%`).where("template", "=", "article").order("datePublished", "DESC").all();
  const title = lang === "fi" ? `${siteName} Uutiset` : `${siteName} News`;
  const description = lang === "fi" ? `Uusimmat uutiset ja artikkelit ${siteName}lta` : `Latest news and articles from ${siteName}`;
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
`;
  xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
`;
  xml += `  <channel>
`;
  xml += `    <title><![CDATA[${title}]]></title>
`;
  xml += `    <link>${baseUrl}/${lang}/news</link>
`;
  xml += `    <description><![CDATA[${description}]]></description>
`;
  xml += `    <language>${lang}</language>
`;
  xml += `    <atom:link href="${baseUrl}/${lang}/rss.xml" rel="self" type="application/rss+xml"/>
`;
  for (const doc of docs) {
    let loc = doc.path;
    if (doc.canonical && typeof doc.canonical === "string" && doc.canonical.startsWith("/")) {
      loc = doc.canonical;
    }
    const path = loc === "/" ? "" : loc == null ? void 0 : loc.replace(/\/$/, "");
    const url = `${baseUrl.replace(/\/$/, "")}${path}`;
    const date = doc.datePublished ? new Date(doc.datePublished).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString();
    xml += `    <item>
`;
    xml += `      <title><![CDATA[${doc.title}]]></title>
`;
    xml += `      <link>${url}</link>
`;
    xml += `      <guid isPermaLink="true">${url}</guid>
`;
    xml += `      <description><![CDATA[${doc.description || ""}]]></description>
`;
    xml += `      <pubDate>${date}</pubDate>
`;
    if (doc.author) {
      xml += `      <author>no-reply@gogam.eu (${doc.author})</author>
`;
    }
    xml += `    </item>
`;
  }
  xml += `  </channel>
`;
  xml += `</rss>`;
  setHeader(event, "Content-Type", "application/rss+xml; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600");
  return xml;
});

export { rss_xml_get as default };
//# sourceMappingURL=rss.xml.get.mjs.map
