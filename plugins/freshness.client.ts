export default defineNuxtPlugin((nuxtApp) => {
  const runtime = useRuntimeConfig();
  const route = useRoute();
  const enhancementsEnabled = useState<boolean>("content-enhance-ready", () => false);
  const firstCheckDone = useState<boolean>("content-first-check-done", () => false);

  // Activate progressive enhancements immediately on client hydration completion,
  // independent of content freshness polling.
  nuxtApp.hook("app:mounted", async () => {
    enhancementsEnabled.value = true;

    // Only run filesystem mtime freshness polling in development
    if (
      !import.meta.dev ||
      runtime.public.disableFreshness === "1" ||
      String(runtime.public.disableFreshness) === "1"
    ) {
      firstCheckDone.value = true;
      return;
    }

    const staticHosting =
      runtime.public.staticHosting === "1" ||
      String(runtime.public.staticHosting) === "1" ||
      Boolean(runtime.public.staticHosting) === true;

    const ssrRenderedAt = useState<string>("ssrRenderedAt").value;
    const buildAt = ssrRenderedAt || String(runtime.public.buildAt || "");
    const shownAtState = useState<number>("content-shown-at", () => 0);
    const defaultLocale = String(runtime.public.defaultLocale || "fi");

    const normalize = (p: string): string => {
      const withSlash = p.startsWith("/") ? p : `/${p}`;
      let collapsed = withSlash.replace(/\/{2,}/g, "/");
      if (collapsed !== "/" && collapsed.endsWith("/")) collapsed = collapsed.slice(0, -1);
      collapsed = collapsed.replace(/^\/(\w{2})\/index$/i, "/$1");
      return collapsed;
    };

    const poll = async (): Promise<boolean> => {
      let updated = false;
      const isLocalized = /^\/[a-z]{2}(?:\/|$)/i.test(route.path);
      const currentDoc = useState<Record<string, unknown> | null>("content-doc", () => null).value;
      const docPath = typeof currentDoc?.path === "string" ? currentDoc.path : null;
      const candidatePath = normalize(
        docPath ||
          (isLocalized
            ? route.path
            : route.path === "/"
              ? `/${defaultLocale}`
              : `/${defaultLocale}${route.path}`),
      );
      const localeForApi = candidatePath.split("/")[1] || defaultLocale;
      const url = staticHosting
        ? `/content-index.json?ts=${Date.now()}`
        : `/api/content-index?ts=${Date.now()}&locale=${encodeURIComponent(localeForApi)}&path=${encodeURIComponent(candidatePath)}`;

      const res = await $fetch<{
        items?: Array<{ path: string; dateModified?: string | number }>;
      }>(url, { headers: { "cache-control": "no-cache" } }).catch(() => null);

      const items = res?.items || [];
      const current = items.find((i) => i.path === candidatePath || i.path === route.path);
      if (current?.dateModified) {
        const modified = new Date(current.dateModified).getTime();
        const built = new Date(buildAt).getTime();
        const shown = Number(shownAtState.value || 0);
        const lsKey = `content-mtime:${candidatePath}`;
        const lsRaw = typeof localStorage !== "undefined" ? localStorage.getItem(lsKey) : null;
        const lsSeen = lsRaw ? Number(lsRaw) : 0;
        const seenMax = Math.max(shown, lsSeen, Number.isNaN(built) ? 0 : built);
        const shouldUpdate = modified > seenMax;

        if (shouldUpdate) {
          const fresh = staticHosting
            ? ((await queryCollection("content").path(normalize(candidatePath)).first()) as Record<
                string,
                unknown
              > | null)
            : (
                await $fetch<{ doc: Record<string, unknown> | null }>("/api/content-doc", {
                  params: { path: candidatePath, ts: Date.now() },
                  headers: { "cache-control": "no-cache" },
                }).catch(() => ({ doc: null }))
              ).doc ||
              ((await queryCollection("content").path(normalize(candidatePath)).first()) as Record<
                string,
                unknown
              > | null);

          if (fresh) {
            const docState = useState<Record<string, unknown> | null>("content-doc", () => null);
            docState.value = fresh;
            const version = useState<number>("content-doc-version", () => 0);
            version.value = (version.value || 0) + 1;
            shownAtState.value = modified;
            if (typeof localStorage !== "undefined") localStorage.setItem(lsKey, String(modified));
            updated = true;
          } else {
            await refreshNuxtData();
            shownAtState.value = modified;
            if (typeof localStorage !== "undefined") localStorage.setItem(lsKey, String(modified));
            updated = true;
          }
        }
      }
      return updated;
    };

    try {
      await poll();
      firstCheckDone.value = true;
    } catch {}

    if (!staticHosting) {
      const baseSec = 5;
      let pollsWithoutChange = 0;
      let nextDelaySec = baseSec;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const schedule = async () => {
        try {
          const changed = await poll();
          if (changed) {
            pollsWithoutChange = 0;
            nextDelaySec = baseSec;
          } else {
            pollsWithoutChange += 1;
            nextDelaySec = nextDelaySec + baseSec + pollsWithoutChange;
          }
        } catch {}
        timer = setTimeout(schedule, nextDelaySec * 1000);
      };

      timer = setTimeout(schedule, nextDelaySec * 1000);

      window.addEventListener("beforeunload", () => {
        if (timer) clearTimeout(timer);
      });
    }
  });
});
