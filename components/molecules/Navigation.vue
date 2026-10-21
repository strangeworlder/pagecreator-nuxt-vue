<script setup lang="ts">
import { computed } from "vue";
import { NAVIGATION_ITEMS } from "~/utils/navigationItems";
import { useRoute } from "#imports";

const route = useRoute();
const items = computed(() =>
  route.path.startsWith("/en") ? NAVIGATION_ITEMS.en : NAVIGATION_ITEMS.fi,
);
</script>

<template>
  <nav>
    <ul>
      <li v-for="item in items" :key="item.href">
        <a :href="item.href">{{ item.label }}</a> &mdash; {{ item.description }}
      </li>
    </ul>
  </nav>
</template>

