<script setup lang="ts">
import type { EnrichedMovie } from "~~/shared/types";

defineProps<{
  movie: EnrichedMovie;
  selected: boolean;
  eager?: boolean;
}>();

defineEmits<{ toggle: [] }>();
</script>

<template>
  <button
    type="button"
    class="card"
    :class="{ 'is-selected': selected }"
    :aria-pressed="selected"
    :aria-label="`${selected ? 'Remove' : 'Add'} ${movie.title} ${selected ? 'from' : 'to'} your likes`"
    @click="$emit('toggle')"
  >
    <MoviePoster :movie="movie" :eager="eager" />

    <span class="card__check" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path
          d="M5 13l4 4L19 7"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>

    <span class="card__overlay">
      <span class="card__title">{{ movie.title }}</span>
      <span class="card__meta">
        <span v-if="movie.year">{{ movie.year }}</span>
        <span v-if="movie.tmdb?.rating" class="card__rating">
          ★ {{ movie.tmdb.rating.toFixed(1) }}
        </span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.card {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
  box-shadow: var(--shadow-card);
  outline: 1px solid var(--border);
  outline-offset: -1px;
  transition:
    transform 0.3s var(--ease),
    outline-color 0.3s var(--ease),
    box-shadow 0.3s var(--ease);

  &:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-pop);
    outline-color: var(--border-strong);

    & .card__overlay {
      transform: translateY(0);
      opacity: 1;
    }
  }

  &.is-selected {
    outline: 2px solid var(--accent);
    outline-offset: -2px;

    & .card__check {
      transform: scale(1);
      opacity: 1;
    }

    & :deep(.poster img) {
      filter: brightness(0.72) saturate(1.05);
    }
  }
}

.card__check {
  position: absolute;
  inset-block-start: var(--space-2);
  inset-inline-end: var(--space-2);
  display: grid;
  place-content: center;
  inline-size: 32px;
  block-size: 32px;
  color: var(--bg-900);
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 4px 12px -2px color-mix(in oklch, var(--accent) 60%, transparent);
  opacity: 0;
  transform: scale(0.4);
  transition:
    transform 0.3s var(--ease),
    opacity 0.2s var(--ease);
}

.card__overlay {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-5) var(--space-3) var(--space-3);
  text-align: start;
  background: linear-gradient(
    to top,
    var(--bg-900) 8%,
    color-mix(in oklch, var(--bg-900) 70%, transparent) 50%,
    transparent
  );
  transform: translateY(12%);
  opacity: 0;
  transition:
    transform 0.3s var(--ease),
    opacity 0.3s var(--ease);

  /* Always show the label on touch / coarse pointers where there's no hover. */
  @media (hover: none) {
    transform: none;
    opacity: 1;
  }
}

.card__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.92rem;
  line-height: 1.2;
}

.card__meta {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.card__rating {
  color: var(--accent);
}
</style>
