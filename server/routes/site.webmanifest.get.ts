import { serverQueryContent } from "#content/server";

export default defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig();
  const defaultLocale = runtime.public.defaultLocale || "en";

  const homePath = `/${defaultLocale}`;
  const home = await serverQueryContent(event).where({ _path: homePath }).findOne();

  const name = String(home?.title || "Gogam");
  const shortName = "Gogam";
  const description = String(home?.description || "Roleplaying games by Petri Leinonen.");

  const themeColor = "#405e95";
  const backgroundColor = "#304e85";

  const manifest = {
    name,
    short_name: shortName,
    description,
    lang: (home as Record<string, unknown>)?.language || defaultLocale,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  setHeader(event, "Content-Type", "application/manifest+json; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=600, stale-while-revalidate=86400");
  return manifest;
});
