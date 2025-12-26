<script setup lang="ts">
// @ts-nocheck
interface LinkItem {
  href: string;
  text: string;
  rel?: string;
  target?: string;
}
const props = defineProps<{ links?: LinkItem[] }>();
const links = Array.isArray(props.links) ? props.links : [];
</script>

<template>
  <nav>
    <div class="product-logo" aria-hidden="true" />
    <ul>
      <li v-for="(l, i) in links" :key="i">
        <a :href="l.href" :rel="l.rel" :target="l.target">{{ l.text }}</a>
      </li>
    </ul>
  </nav>
  
</template>

<style scoped>
ul {
  padding: 0;
  margin: 20px;
  list-style: none;
}
li { margin: 0.35rem 0; }
</style>


