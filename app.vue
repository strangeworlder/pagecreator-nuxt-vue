<script setup lang="ts">
// Apply saved/system theme as early as possible to avoid FOUC
if (process.client) {
  const saved = (() => {
    try {
      return localStorage.getItem("ui-theme");
    } catch {
      return null;
    }
  })();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const next = saved === "dark" || saved === "light" ? saved : prefersDark ? "dark" : "light";
  if (document.documentElement.dataset.theme !== next) {
    document.documentElement.dataset.theme = next;
  }
}
</script>

<template>
  <NuxtLayout>
    <div>
      <BaseThemeToggle />
    </div>
    <NuxtPage />
  </NuxtLayout>
</template>

