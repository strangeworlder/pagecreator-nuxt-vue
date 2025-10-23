<script setup lang="ts">
// @ts-nocheck
import { ref, computed } from "vue";
import { queryContent } from "#imports";
const initial = await queryContent("/en").where({ _path: "/en" }).findOne();
const docState = useState<any>("content-doc", () => null);
const version = useState<number>("content-doc-version", () => 0)
const data = computed(() => (version.value, docState.value || initial));
const email = ref("");
</script>

<template>
  <div class="prose mx-auto p-6">
    <BaseHeader :level="1">Welcome</BaseHeader>
    <BaseParagraph>This is the TSS starter. Content below is rendered from Markdown.</BaseParagraph>

    <FormField id="email" label="Email" help-text="We will not share your email.">
      <template #control="{ id, ariaDescribedBy }">
        <BaseInput v-model="email" :id="id" type="email" :aria-describedby="ariaDescribedBy" />
      </template>
    </FormField>

    <div class="mt-4">
      <BaseButton variant="primary" @click="() => alert(`Email: ${email}`)">Submit</BaseButton>
    </div>

    <div class="mt-8">
      <ContentRenderer v-if="data" :key="version" :value="data" />
    </div>
  </div>
</template>

