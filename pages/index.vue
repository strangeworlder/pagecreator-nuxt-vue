<script setup lang="ts">
// @ts-nocheck
import { computed, watch } from "vue";
import ProseA from "~/components/prose/ProseA.vue";
import ProseBlockquote from "~/components/prose/ProseBlockquote.vue";
import ProseCode from "~/components/prose/ProseCode.vue";
import ProseH1 from "~/components/prose/ProseH1.vue";
import ProseH2 from "~/components/prose/ProseH2.vue";
import ProseH3 from "~/components/prose/ProseH3.vue";
import ProseLi from "~/components/prose/ProseLi.vue";
import ProseOl from "~/components/prose/ProseOl.vue";
import ProseP from "~/components/prose/ProseP.vue";
import ProsePre from "~/components/prose/ProsePre.vue";
import ProseUl from "~/components/prose/ProseUl.vue";
import ProseImg from "~/components/prose/ProseImg.vue";
import PageHeader from "~/components/molecules/PageHeader.vue";
import PageFooter from "~/components/molecules/PageFooter.vue";
import { queryContent } from "#imports";
import { useCustomContentHead } from "~/composables/useContentHead";

const route = useRoute();
const runtime = useRuntimeConfig();
const defaultLocale = runtime.public.defaultLocale || "en";

const resolveContentPath = (path: string) => {
  return path === "/" ? `/${defaultLocale}` : path;
};

const initial = await queryContent(resolveContentPath(route.path))
  .where({ _path: resolveContentPath(route.path) })
  .findOne();
const docState = useState<Record<string, unknown> | null>("content-doc", () => null);
const version = useState<number>("content-doc-version", () => 0);
const data = computed(() => {
  void version.value; // depend on version updates
  return docState.value ?? initial;
});
useCustomContentHead(data);

watch(
  () => route.fullPath,
  async () => {
    const path = resolveContentPath(route.path);
    const next = await queryContent(path).where({ _path: path }).findOne();
    const currentPath = (data.value as any)?._path;
    if (next && next._path !== currentPath) {
      docState.value = next;
      version.value = (version.value || 0) + 1;
    }
  }
);

const proseComponents = {
  h1: ProseH1,
  h2: ProseH2,
  h3: ProseH3,
  p: ProseP,
  a: ProseA,
  code: ProseCode,
  pre: ProsePre,
  ul: ProseUl,
  ol: ProseOl,
  li: ProseLi,
  blockquote: ProseBlockquote,
  img: ProseImg,
};

// Get title and description from front-matter
const pageTitle = computed(() => {
  return (data.value as any)?.title || "Welcome";
});

const pageDescription = computed(() => {
  return (data.value as any)?.description || "This is the TSS starter. Content below is rendered from Markdown.";
});
</script>

<template>
  <div class="prose">
    <PageHeader :title="pageTitle" :description="pageDescription" />

    <div>
      <ContentRenderer v-if="data" :key="version" :value="data" :components="proseComponents" />
    </div>

    <PageFooter />
  </div>
</template>

