export type UiTheme = "light" | "dark";

export function useTheme() {
  const theme = useState<UiTheme>("ui-theme", () => "light");

  const applyTheme = (next: UiTheme) => {
    theme.value = next;
    if (process.client) {
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("ui-theme", next);
      } catch {}
    }
  };

  const toggleTheme = () => applyTheme(theme.value === "light" ? "dark" : "light");

  if (process.client) {
    // Initialize on first use
    if (!document.documentElement.dataset.theme) {
      try {
        const saved = localStorage.getItem("ui-theme") as UiTheme | null;
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme(saved ?? (prefersDark ? "dark" : "light"));
      } catch {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme(prefersDark ? "dark" : "light");
      }
    }
  }

  return { theme, setTheme: applyTheme, toggleTheme };
}
