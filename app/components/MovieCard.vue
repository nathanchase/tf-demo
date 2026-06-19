<template>
  <button
    type="button"
    class="card"
    :class="{ 'is-selected': selected }"
    :aria-pressed="selected"
    :aria-label="`${selected ? 'Remove' : 'Add'} ${movie.title} ${selected ? 'from' : 'to'} your likes`"
    @click="$emit('toggle')"
  >
    <MoviePoster
      :movie="movie"
      :eager="eager"
    />

    <span
      class="card__check"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
      >
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

        <span
          v-if="movie.tmdb?.rating"
          class="card__rating"
        >
          ★ {{ movie.tmdb.rating.toFixed(1) }}
        </span>
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import type { EnrichedMovie } from '~~/shared/types';

defineProps<{
  movie: EnrichedMovie
  selected: boolean
  eager?: boolean
}>();

defineEmits<{ toggle: [] }>();
</script>

<style scoped>
.card {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  overflow: hidden;
  outline: 1px solid var(--border);
  outline-offset: -1px;
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  transition:
    transform 0.3s var(--ease),
    outline-color 0.3s var(--ease),
    box-shadow 0.3s var(--ease);

  &:hover {
    outline-color: var(--border-strong);
    box-shadow: var(--shadow-pop);
    transform: translateY(-6px);

    & .card__overlay {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &.is-selected {
    outline: 2px solid var(--accent);
    outline-offset: -2px;

    & .card__check {
      opacity: 1;
      transform: scale(1);
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
  inset-block-end: 0;
  inset-inline: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-5) var(--space-3) var(--space-3);
  text-align: start;
  background:
    linear-gradient(
      to top,
      var(--bg-900) 8%,
      color-mix(in oklch, var(--bg-900) 70%, transparent) 50%,
      transparent
    );
  opacity: 0;
  transform: translateY(12%);
  transition:
    transform 0.3s var(--ease),
    opacity 0.3s var(--ease);

  /* Always show the label on touch / coarse pointers where there's no hover. */
  @media (hover: none) {
    opacity: 1;
    transform: none;
  }
}

.card__title {
  font-family: var(--font-display);
  font-size: 0.92rem;
  font-weight: 600;
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
