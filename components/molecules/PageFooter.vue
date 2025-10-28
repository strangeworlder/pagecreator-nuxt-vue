<script setup lang="ts">
// @ts-nocheck
import { ref } from "vue";

const email = ref("");
</script>

<template>
  <footer>
    <FormField id="email" label="Email" help-text="We will not share your email.">
      <template #control="{ id, ariaDescribedby }">
        <BaseInput v-model="email" :id="id" type="email" :aria-describedby="ariaDescribedby" />
      </template>
    </FormField>

    <div>
      <BaseButton variant="primary" @click="() => alert(`Email: ${email}`)">Submit</BaseButton>
    </div>
    <BaseImage
      src="/images/spinskull.gif"
      alt="Spinning skull"
      :width="100"
      :height="100"
      class="footer-image"
      eager
    />
  </footer>
</template>
