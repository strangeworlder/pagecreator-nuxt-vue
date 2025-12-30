export type UiTheme = "light" | "dark";

export function useTheme() {
  const theme = useState<UiTheme>("ui-theme", () => "light");

  const applyTheme = (next: UiTheme) => {
    theme.value = next;
    if (process.client) {
      document.documentElement.dataset.theme = next;
      try {
        // Keep standard CSS color-scheme in sync for form controls, etc.
        (document.documentElement as HTMLElement).style.colorScheme = next;
      } catch {}
    }
  };

  if (process.client) {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const updateFromSystem = () => applyTheme(mql.matches ? "dark" : "light");
    // Initialize immediately
    updateFromSystem();
    // React to system preference changes
    try {
      mql.addEventListener("change", updateFromSystem);
      onBeforeUnmount(() => {
        mql.removeEventListener("change", updateFromSystem);
      });
    } catch {
      // Safari < 14 fallback
      // @ts-ignore
      mql.addListener?.(updateFromSystem);
      onBeforeUnmount(() => {
        // @ts-ignore
        mql.removeListener?.(updateFromSystem);
      });
    }
  }

  return { theme };
}
