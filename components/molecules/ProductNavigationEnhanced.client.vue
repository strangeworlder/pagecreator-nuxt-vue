<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

interface LinkItem {
  href: string;
  text: string;
  rel?: string;
  target?: string;
}
const props = defineProps<{ links?: LinkItem[] }>();
const links = Array.isArray(props.links) ? props.links : [];

const navRef = ref<HTMLElement>();
const floatingNavRef = ref<HTMLElement>();
const isFloating = ref(false);

const handleScroll = () => {
  if (!navRef.value) return;
  const navRect = navRef.value.getBoundingClientRect();
  const scrolledPastNav = navRect.bottom < 0;
  if (scrolledPastNav && !isFloating.value) {
    isFloating.value = true;
  } else if (!scrolledPastNav && isFloating.value) {
    isFloating.value = false;
  }
};

const scrollToHref = (href: string) => {
  if (!href || !href.startsWith("#")) return;
  const raw = href.slice(1);
  // Our headings render with id="header-<id>" and a named anchor for offset
  const targetId = `header-${raw}`;
  const element = document.getElementById(targetId);
  if (element) {
    const floatingNavHeight = floatingNavRef.value?.offsetHeight || 0;
    const y = element.getBoundingClientRect().top + window.pageYOffset - floatingNavHeight - 20;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
};

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <div>
    <!-- Original navigation -->
    <nav ref="navRef">
      <div class="product-logo" aria-hidden="true" />
      <ul>
        <li v-for="(l, i) in links" :key="i">
          <a :href="l.href" :rel="l.rel" :target="l.target" @click.prevent="scrollToHref(l.href)">{{ l.text }}</a>
        </li>
      </ul>
    </nav>

    <!-- Floating navigation -->
    <nav 
      ref="floatingNavRef"
      class="floating-nav"
      :class="{ 'floating-nav--visible': isFloating }"
    >
      <ul>
        <li v-for="(l, i) in links" :key="i">
          <a :href="l.href" :rel="l.rel" :target="l.target" @click.prevent="scrollToHref(l.href)">{{ l.text }}</a>
        </li>
      </ul>
    </nav>
  </div>
  
</template>

<style scoped>

ul {
  padding: 0;
  margin: 20px;
  list-style: none;
}
li { margin: 0.35rem 0; }

.floating-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  transform: translateY(-100%);
  transition: transform 0.3s ease-in-out;
  padding: 0.75rem 1rem;
}

.floating-nav--visible { transform: translateY(0); }

.floating-nav ul {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin: 0;
  padding: 0;
  list-style: none;
  max-width: 1200px;
  margin: 0 auto;
}

.floating-nav li { margin: 0; }

.floating-nav a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.floating-nav a:hover { background-color: rgba(0, 0, 0, 0.05); color: #000; }

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .floating-nav { background: rgba(0, 0, 0, 0.95); border-bottom-color: rgba(255, 255, 255, 0.1); }
  .floating-nav a { color: #e5e5e5; }
  .floating-nav a:hover { background-color: rgba(255, 255, 255, 0.1); color: #fff; }
}

/* Responsive */
@media (max-width: 768px) {
  .floating-nav { display: none; }
  .floating-nav ul { gap: 1rem; flex-wrap: wrap; justify-content: center; }
  .floating-nav a { font-size: 0.8rem; padding: 0.4rem 0.6rem; }
}
@media (max-width: 480px) {
  .floating-nav ul { gap: 0.5rem; }
  .floating-nav a { font-size: 0.75rem; padding: 0.3rem 0.5rem; }
}
</style>


