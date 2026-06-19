<script setup lang="ts">
import type { Recommendation } from "~~/shared/types";

const props = defineProps<{
  rec: Recommendation;
  rank: number;
}>();

const backdropUrl = computed(() => props.rec.movie.tmdb?.backdropUrl ?? null);
const logoUrl = computed(() => props.rec.movie.tmdb?.logoUrl ?? null);

/** Fade the backdrop in once loaded; handle already-cached images on mount. */
const bgEl = ref<HTMLImageElement | null>(null);
const bgLoaded = ref(false);
const bgFailed = ref(false);
onMounted(() => {
  if (bgEl.value?.complete && bgEl.value.naturalWidth > 0) bgLoaded.value = true;
});

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
    <div class="rec__media" :class="{ 'is-loaded': bgLoaded }">
      <img
        v-if="backdropUrl && !bgFailed"
        ref="bgEl"
        class="rec__backdrop"
        :src="backdropUrl"
        :alt="`${rec.movie.title} backdrop`"
        loading="lazy"
        decoding="async"
        width="1280"
        height="720"
        @load="bgLoaded = true"
        @error="bgFailed = true"
      >

      <span class="rec__rank">#{{ rank }}</span>
      <span
        class="rec__match"
        :style="{ '--pct': rec.matchPercent }"
        :title="`${rec.matchPercent}% match`"
      >
        <span class="rec__match-num">{{ rec.matchPercent }}<small>%</small></span>
      </span>

      <!-- Logo over the backdrop, with the title as a text fallback. -->
      <div class="rec__label">
        <img
          v-if="logoUrl"
          class="rec__logo"
          :src="logoUrl"
          :alt="rec.movie.title"
          loading="lazy"
          decoding="async"
        >
        <span v-else class="rec__title-fallback">{{ rec.movie.title }}</span>
      </div>
    </div>

    <div class="rec__body">
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

.rec__media {
  position: relative;
  aspect-ratio: 16 / 9;
  background: linear-gradient(150deg, var(--surface-raised), var(--bg-800));
  overflow: hidden;
}

.rec__backdrop {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.5s var(--ease);

  .rec__media.is-loaded & {
    opacity: 1;
  }
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
  inset-block-start: var(--space-2);
  inset-inline-end: var(--space-2);
  display: grid;
  place-content: center;
  inline-size: 44px;
  block-size: 44px;
  border-radius: 50%;
  background: conic-gradient(
    var(--accent) calc(var(--pct) * 1%),
    color-mix(in oklch, var(--bg-900) 55%, transparent) 0
  );
  box-shadow: var(--shadow-card);

  &::before {
    content: "";
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: color-mix(in oklch, var(--bg-900) 85%, transparent);
    backdrop-filter: blur(4px);
  }
}

.rec__match-num {
  position: relative;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--accent);

  & small {
    font-size: 0.6em;
    color: var(--text-muted);
  }
}

/* Bottom label area with scrim for logo/title legibility. */
.rec__label {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  display: flex;
  align-items: flex-end;
  min-block-size: 50%;
  padding: var(--space-4) var(--space-3) var(--space-3);
  background: linear-gradient(
    to top,
    var(--bg-900) 4%,
    color-mix(in oklch, var(--bg-900) 55%, transparent) 45%,
    transparent
  );
}

.rec__logo {
  max-inline-size: 65%;
  max-block-size: 56px;
  width: auto;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
}

.rec__title-fallback {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}

.rec__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4) var(--space-4);
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
  list-style: none;
  padding-inline-start: 0;

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
