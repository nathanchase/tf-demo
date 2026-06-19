<script setup lang="ts">
import type { EnrichedMovie } from "~~/shared/types";

const props = defineProps<{
  movie: EnrichedMovie;
  /** Eager-load above-the-fold posters; lazy-load the rest. */
  eager?: boolean;
}>();

const failed = ref(false);
const loaded = ref(false);
const src = computed(() => (failed.value ? null : (props.movie.tmdb?.posterUrl ?? null)));

const imgEl = ref<HTMLImageElement | null>(null);

// If the image was already cached/complete before hydration attached the
// @load listener, the event never fires — check `complete` on mount so the
// poster doesn't stay stuck at opacity: 0.
onMounted(() => {
  if (imgEl.value?.complete && imgEl.value.naturalWidth > 0) loaded.value = true;
});
</script>

<template>
  <div class="poster" :class="{ 'is-loaded': loaded }">
    <img
      v-if="src"
      ref="imgEl"
      :src="src"
      :alt="`${movie.title} poster`"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : 'auto'"
      decoding="async"
      width="500"
      height="750"
      @load="loaded = true"
      @error="failed = true"
    />
    <!-- Text fallback when TMDb has no artwork (or none is configured). -->
    <div v-else class="poster__fallback">
      <span class="poster__title">{{ movie.title }}</span>
      <span v-if="movie.year" class="poster__year">{{ movie.year }}</span>
    </div>
  </div>
</template>

<style scoped>
.poster {
  position: relative;
  aspect-ratio: 2 / 3;
  background: linear-gradient(160deg, var(--surface-raised), var(--bg-800));
  overflow: hidden;

  & img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.5s var(--ease);
  }

  &.is-loaded img {
    opacity: 1;
  }
}

.poster__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  text-align: center;

  &::before {
    content: "🎬";
    font-size: 2rem;
    opacity: 0.5;
  }
}

.poster__title {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--text-muted);
}

.poster__year {
  color: var(--text-faint);
  font-size: 0.85rem;
}
</style>
