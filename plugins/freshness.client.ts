// @ts-nocheck
export default defineNuxtPlugin(async () => {
  const route = useRoute();
  const runtime = useRuntimeConfig();
  const ssrRenderedAt = useState<string>("ssrRenderedAt").value;
  const buildAt = ssrRenderedAt || runtime.public.buildAt;
  // Track the timestamp of the version currently shown to the user
  const shownAtState = useState<number>("content-shown-at", () => new Date(buildAt).getTime());
  const defaultLocale = runtime.public.defaultLocale || "en";

  // Attempt a lightweight freshness check on client
  const poll = async () => {
    let updated = false;
    const url = `/api/content-index?ts=${Date.now()}`;
    const { data } = await useFetch<{
      items: Array<{ _path: string; dateModified?: string | number }>;
    }>(url, { server: false, headers: { "cache-control": "no-cache" } });
    const items = data.value?.items || [];
    // Normalize path: if route already starts with a locale (e.g., /en, /fi, /sv), use it as-is.
    // Otherwise, prefix with defaultLocale. This avoids generating "/en/fi/..." paths.
    const isLocalized = /^\/[a-z]{2}(?:\/|$)/i.test(route.path);
    const candidatePath = isLocalized
      ? route.path
      : route.path === "/"
        ? `/${defaultLocale}`
        : `/${defaultLocale}${route.path}`;
    const current = items.find((i) => i._path === candidatePath || i._path === route.path);
    if (current?.dateModified) {
      const modified = new Date(current.dateModified).getTime();
      const built = new Date(buildAt).getTime();
      const shown = Number(shownAtState.value || built);
      console.log("[freshness] Modified:", modified, "Shown:", shown, "Built:", built);
      if (modified > shown) {
        // Prefer a server API to fetch the fully-resolved doc; bust any caches with a ts param
        const freshResp = await $fetch<{ doc: Record<string, unknown> | null }>("/api/content-doc", {
          params: { path: candidatePath, ts: Date.now() },
          headers: { "cache-control": "no-cache" },
        });
        const fresh = freshResp?.doc || (await queryContent(candidatePath).findOne());
        if (fresh) {
          // Log exactly where we swap in the fresh document
          console.log("[freshness] Replacing SSR content with fresh content", {
            path: route.path,
            candidatePath,
            modified,
            built,
            shown,
          });
          const docState = useState<Record<string, unknown> | null>("content-doc", () => null);
          docState.value = fresh;
          const version = useState<number>("content-doc-version", () => 0);
          version.value = (version.value || 0) + 1;
          shownAtState.value = modified;
          updated = true;
        } else {
          // Log fallback refresh when fresh doc query didn't resolve
          console.log("[freshness] Fresh content detected; falling back to refreshNuxtData()", {
            path: route.path,
            candidatePath,
            modified,
            built,
            shown,
          });
          await refreshNuxtData();
          shownAtState.value = modified;
          updated = true;
        }
      }
    }
    return updated;
  };

  try {
    await poll();
  } catch {}

  // Incremental backoff: start with base, increase linearly to 15 minutes, reset on update
  const baseMs = process.dev ? 5000 : 60000;
  const maxMs = 15 * 60 * 1000;
  let currentMs = baseMs;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = async () => {
    try {
      const changed = await poll();
      if (changed) {
        currentMs = baseMs; // reset on fresh content
      } else {
        currentMs = Math.min(maxMs, currentMs + baseMs); // linear backoff
      }
    } catch {}
    timer = setTimeout(schedule, currentMs);
  };

  timer = setTimeout(schedule, currentMs);
  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer);
  });
});
