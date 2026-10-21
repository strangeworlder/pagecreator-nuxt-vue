<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { NAVIGATION_ITEMS } from "~/utils/navigationItems";
import { useRoute } from "#imports";

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

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    const floatingNavHeight = floatingNavRef.value?.offsetHeight || 0;
    const offsetTop = element.offsetTop - floatingNavHeight - 20; // 20px extra padding

    window.scrollTo({
      top: offsetTop,
      behavior: "smooth",
    });
  }
};

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});

const route = useRoute();
const items = computed(() =>
  route.path.startsWith("/en") ? NAVIGATION_ITEMS.en : NAVIGATION_ITEMS.fi,
);
</script>

<template>
  <div>
    <!-- Original navigation -->
    <nav ref="navRef">
      <ul>
        <li v-for="item in items" :key="item.href">
          <a :href="item.href" @click.prevent="scrollToSection(item.targetId)">{{ item.label }}</a> &mdash; {{ item.description }}
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
        <li v-for="item in items" :key="item.href">
          <a :href="item.href" @click.prevent="scrollToSection(item.targetId)">{{ item.label }}</a>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style scoped>
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
  transition: transform var(--transition-normal);
  padding: var(--space-sm) var(--space-md);
  @media (max-width: 768px) {
    display: none;
  }
}

.floating-nav--visible {
  transform: translateY(0);
}

.floating-nav ul {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-xl);
  margin: 0;
  padding: 0;
  list-style: none;
  max-width: 1200px;
  margin: 0 auto;
}

.floating-nav li {
  margin: 0;
}

.floating-nav a {
  text-decoration: none;
  color: #333;
  font-weight: var(--font-weight-medium);
  font-size: var(--size-2);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.floating-nav a:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #000;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .floating-nav {
    background: rgba(0, 0, 0, 0.95);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  
  .floating-nav a {
    color: #e5e5e5;
  }
  
  .floating-nav a:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .floating-nav ul {
    gap: var(--space-md);
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .floating-nav a {
    font-size: var(--size-1);
    padding: var(--space-xs) var(--space-sm);
  }
}

@media (max-width: 480px) {
  .floating-nav ul {
    gap: var(--space-sm);
  }
  
  .floating-nav a {
    font-size: var(--size-1);
    padding: var(--space-xs) var(--space-sm);
  }
}
</style>
