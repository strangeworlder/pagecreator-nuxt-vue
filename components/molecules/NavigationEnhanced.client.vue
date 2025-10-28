<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const navRef = ref<HTMLElement>()
const floatingNavRef = ref<HTMLElement>()
const isFloating = ref(false)
const originalNavHeight = ref(0)
const lastScrollY = ref(0)
const scrollDirection = ref<'up' | 'down' | null>(null)

const handleScroll = () => {
  if (!navRef.value) return
  
  const navRect = navRef.value.getBoundingClientRect()
  const scrolledPastNav = navRect.bottom < 0
  
  if (scrolledPastNav && !isFloating.value) {
    isFloating.value = true
  } else if (!scrolledPastNav && isFloating.value) {
    isFloating.value = false
  }
}

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId)
  if (element) {
    const floatingNavHeight = floatingNavRef.value?.offsetHeight || 0
    const offsetTop = element.offsetTop - floatingNavHeight - 20 // 20px extra padding
    
    window.scrollTo({
      top: offsetTop,
      behavior: 'smooth'
    })
  }
}

onMounted(() => {
  if (navRef.value) {
    originalNavHeight.value = navRef.value.offsetHeight
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div>
    <!-- Original navigation -->
    <nav ref="navRef">
      <ul>
        <li>
          <a href="#gogam" @click.prevent="scrollToSection('header-gogam')">Gogam</a>
        </li>
        <li>
          <a href="#kustannusosakeyhtiö-gogam" @click.prevent="scrollToSection('header-kustannusosakeyhtiö-gogam')">Kustannusosakeyhtiö Gogam</a>
        </li>
        <li>
          <a href="#gogam-entertainment" @click.prevent="scrollToSection('header-gogam-entertainment')">Gogam Entertainment</a>
        </li>
        <li>
          <a href="#from-other-publishers" @click.prevent="scrollToSection('header-from-other-publishers')">Other publishers</a>
        </li>
        <li>
          <a href="#articles-for-free-to-read" @click.prevent="scrollToSection('header-articles-for-free-to-read')">Articles</a>
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
        <li>
          <a href="#gogam" @click.prevent="scrollToSection('header-gogam')">Gogam</a>
        </li>
        <li>
          <a href="#kustannusosakeyhtiö-gogam" @click.prevent="scrollToSection('header-kustannusosakeyhtiö-gogam')">Kustannusosakeyhtiö Gogam</a>
        </li>
        <li>
          <a href="#gogam-entertainment" @click.prevent="scrollToSection('header-gogam-entertainment')">Gogam Entertainment</a>
        </li>
        <li>
          <a href="#from-other-publishers" @click.prevent="scrollToSection('header-from-other-publishers')">Other publishers</a>
        </li>
        <li>
          <a href="#articles-for-free-to-read" @click.prevent="scrollToSection('header-articles-for-free-to-read')">Articles</a>
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
  transition: transform 0.3s ease-in-out;
  padding: 0.75rem 1rem;
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
  gap: 2rem;
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
  font-weight: 500;
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
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
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .floating-nav a {
    font-size: 0.8rem;
    padding: 0.4rem 0.6rem;
  }
}

@media (max-width: 480px) {
  .floating-nav ul {
    gap: 0.5rem;
  }
  
  .floating-nav a {
    font-size: 0.75rem;
    padding: 0.3rem 0.5rem;
  }
}
</style>
