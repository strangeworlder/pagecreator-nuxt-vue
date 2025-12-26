<script setup lang="ts">
// Apply system theme and default page theme early to avoid FOUC
if (process.client) {
  const html = document.documentElement;
  if (!html.dataset.pageTheme) html.dataset.pageTheme = "classic"; // default page theme

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const setTheme = () => {
    const next = mql.matches ? "dark" : "light";
    if (html.dataset.theme !== next) html.dataset.theme = next;
    try {
      (html as HTMLElement).style.colorScheme = next;
    } catch {}
  };
  setTheme();
  try {
    mql.addEventListener("change", setTheme);
  } catch {
    // @ts-ignore legacy Safari
    mql.addListener && mql.addListener(setTheme);
  }
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
html {
  margin: 0;
  padding: 0;
}
body {
  margin: 16px;
}
</style>