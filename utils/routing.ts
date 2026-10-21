export interface NewsRoutingResult {
  type: "article" | "archive" | "standard";
  queryPath: string;
  expectedDate?: string;
  paramYear?: string;
  lang?: string;
}

export interface CanonicalizableDoc {
  path?: string | null;
  _path?: string | null;
  canonical?: string | null;
  datePublished?: string | Date | null;
  template?: string | null;
}

export function ensureLeadingSlash(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function removeTrailingSlash(path: string): string {
  const withSlash = ensureLeadingSlash(path).replace(/\/{2,}/g, "/");
  if (withSlash === "/") return "/";
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

export function resolveContentPath(path: string, defaultLocale = "fi"): string {
  const normalized = removeTrailingSlash(path).replace(/^\/(\w{2})\/index$/i, "/$1");
  return normalized === "/" ? `/${defaultLocale}` : normalized;
}

export function getLocaleFromPath(path: string, defaultLocale = "fi"): string {
  const p = resolveContentPath(path, defaultLocale);
  const parts = p.split("/");
  const first = parts[1] || "";
  return /^[a-z]{2}$/i.test(first) ? first.toLowerCase() : defaultLocale;
}

export function resolveNewsRouting(currentPath: string, defaultLocale = "fi"): NewsRoutingResult {
  const norm = resolveContentPath(currentPath, defaultLocale);
  const articleMatch = norm.match(/^\/([a-z]{2})\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/);
  if (articleMatch) {
    const [, lang, yyyy, mm, dd, slug] = articleMatch;
    return {
      type: "article",
      queryPath: `/${lang}/${lang === "fi" ? "uutiset" : "news"}/${slug}`,
      expectedDate: `${yyyy}-${mm}-${dd}`,
      paramYear: yyyy,
      lang,
    };
  }
  const archiveMatch = norm.match(/^\/([a-z]{2})\/(\d{4})$/);
  if (archiveMatch) {
    const [, lang, yyyy] = archiveMatch;
    return {
      type: "archive",
      queryPath: norm,
      paramYear: yyyy,
      lang,
    };
  }
  return { type: "standard", queryPath: norm };
}

export function buildNewsArticlePath(
  rawPath: string,
  datePublished: string | Date,
  defaultLocale = "fi",
): string | null {
  const d = new Date(datePublished);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const cleanPath = removeTrailingSlash(rawPath);
  const slug = cleanPath.split("/").pop();
  const lang = cleanPath.split("/")[1] || defaultLocale;
  if (!slug || slug === "index") return null;
  return `/${lang}/${yyyy}/${mm}/${dd}/${slug}`;
}

export function resolveCanonicalPath(doc: CanonicalizableDoc, defaultLocale = "fi"): string {
  if (doc.canonical && typeof doc.canonical === "string" && doc.canonical.trim().startsWith("/")) {
    return removeTrailingSlash(doc.canonical.trim());
  }

  const rawPath = doc.path || doc._path || "/";
  if (
    (rawPath.includes("/news/") || rawPath.includes("/uutiset/")) &&
    doc.template !== "news-list" &&
    !rawPath.endsWith("/news") &&
    !rawPath.endsWith("/uutiset") &&
    doc.datePublished
  ) {
    const newsUrl = buildNewsArticlePath(rawPath, doc.datePublished, defaultLocale);
    if (newsUrl) return newsUrl;
  }

  return removeTrailingSlash(rawPath);
}
