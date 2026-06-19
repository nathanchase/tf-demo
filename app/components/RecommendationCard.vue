<script setup lang="ts">
import type { Recommendation } from "~~/shared/types";

const props = defineProps<{
  rec: Recommendation;
  rank: number;
}>();

/** "Because you liked A, B & C" from the top contributing movies. */
const reason = computed(() => {
  const titles = props.rec.because.map((b) => b.title);
  if (titles.length === 0) return "A crowd favourite";
  if (titles.length === 1) return `Because you liked ${titles[0]}`;
  const last = titles[titles.length - 1];
  return `Because you liked ${titles.slice(0, -1).join(", ")} & ${last}`;
});
</script>

<template>
  <article class="rec">
    <div class="rec__poster">
      <MoviePoster :movie="rec.movie" />
      <span class="rec__rank">#{{ rank }}</span>
      <span
        class="rec__match"
        :style="{ '--pct': rec.matchPercent }"
        :title="`${rec.matchPercent}% match`"
      >
        <span class="rec__match-num">{{ rec.matchPercent }}<small>%</small></span>
      </span>
    </div>

    <div class="rec__body">
      <h3 class="rec__title">
        {{ rec.movie.title }}
        <span v-if="rec.movie.year" class="rec__year">{{ rec.movie.year }}</span>
      </h3>
      <p class="rec__reason">{{ reason }}</p>
      <ul v-if="rec.movie.tmdb?.genres?.length" class="rec__genres">
        <li v-for="g in rec.movie.tmdb.genres.slice(0, 3)" :key="g">{{ g }}</li>
      </ul>
    </div>
  </article>
</template>

<style scoped>
.rec {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
  outline: 1px solid var(--border);
  outline-offset: -1px;
  box-shadow: var(--shadow-card);
  animation: rise 0.45s var(--ease) both;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}

.rec__poster {
  position: relative;
}

.rec__rank {
  position: absolute;
  inset-block-start: var(--space-2);
  inset-inline-start: var(--space-2);
  padding: 2px 8px;
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text);
  background: color-mix(in oklch, var(--bg-900) 70%, transparent);
  backdrop-filter: blur(6px);
  border-radius: 999px;
}

/* Conic-gradient match ring driven by the --pct custom property. */
.rec__match {
  position: absolute;
  inset-block-end: -18px;
  inset-inline-end: var(--space-3);
  display: grid;
  place-content: center;
  inline-size: 48px;
  block-size: 48px;
  border-radius: 50%;
  background: conic-gradient(
    var(--accent) calc(var(--pct) * 1%),
    color-mix(in oklch, var(--text) 16%, transparent) 0
  );
  box-shadow: var(--shadow-card);

  &::before {
    content: "";
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: var(--surface);
  }
}

.rec__match-num {
  position: relative;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--accent);

  & small {
    font-size: 0.6em;
    color: var(--text-muted);
  }
}

.rec__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5) var(--space-4) var(--space-4);
}

.rec__title {
  font-size: 1rem;
  font-weight: 600;
}

.rec__year {
  color: var(--text-faint);
  font-weight: 400;
}

.rec__reason {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.rec__genres {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-block-start: auto;
  padding-block-start: var(--space-2);
  list-style: none;

  & li {
    padding: 3px 10px;
    font-size: 0.72rem;
    color: var(--text-muted);
    background: var(--bg-800);
    border: 1px solid var(--border);
    border-radius: 999px;
  }
}
</style>
