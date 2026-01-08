<script setup lang="ts">
import type { NuxtError } from "#app";

// Define props to receive the error object
const props = defineProps({
  error: Object as () => NuxtError,
});

// Clear error and go home
const handleError = () => clearError({ redirect: "/" });
</script>

<template>
  <div class="error-page">
    <div class="error-container">
      <div class="error-content">
        <h1 class="error-title">
          {{ error?.statusCode === 404 ? "Page Not Found" : "Something Went Wrong" }}
        </h1>
        
        <p class="error-message">
          <template v-if="error?.statusCode === 404">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </template>
          <template v-else>
            An unexpected error occurred. Please try again later.
          </template>
        </p>
        
        <div v-if="process.dev && error?.stack" class="error-debug">
          <pre>{{ error.stack }}</pre>
        </div>

        <div class="error-action">
          <BaseButton @click="handleError">
            Return Home
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-sans);
}

.error-container {
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.error-title {
  font-size: var(--h1-font-size);
  font-weight: var(--h1-font-weight);
  margin-bottom: 1.5rem;
  line-height: var(--line-height);
}

.error-message {
  font-size: var(--size-4);
  color: var(--color-muted);
  margin-bottom: 2.5rem;
  line-height: 1.6;
}

.error-debug {
  margin: 1rem 0 2rem;
  padding: 1rem;
  background: var(--color-bg-mute);
  border-radius: var(--radius-md);
  text-align: left;
  overflow-x: auto;
  font-size: var(--size-1);
  font-family: monospace;
}

.error-action {
  display: flex;
  justify-content: center;
}
</style>
