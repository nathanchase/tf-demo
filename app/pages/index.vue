<script setup lang="ts">
import type { MoviesResponse } from "~~/shared/types";

const { selected, isSelected, toggle, clear, count } = useSelection();
const { data: recData, pending: recPending, error: recError } = useRecommendations(12);

// SSR-fetched catalog (enriched on the server, cached).
const { data, pending, error } = await useFetch<MoviesResponse>("/api/movies");
const movies = computed(() => data.value?.movies ?? []);

// A handful of posters for the hero marquee.
const heroPosters = computed(() => movies.value.filter((m) => m.tmdb?.posterUrl).slice(0, 16));

const recommendations = computed(() => recData.value?.recommendations ?? []);
const isFallback = computed(() => recData.value?.fallback ?? false);

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div>
    <!-- ---------------------------------------------------------------- Hero -->
    <header class="hero">
      <div v-if="heroPosters.length" class="hero__marquee" aria-hidden="true">
        <div class="hero__row">
          <img
            v-for="m in heroPosters"
            :key="`a-${m.id}`"
            :src="m.tmdb!.posterUrl!"
            :alt="''"
            loading="eager"
            decoding="async"
          />
          <img
            v-for="m in heroPosters"
            :key="`b-${m.id}`"
            :src="m.tmdb!.posterUrl!"
            :alt="''"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      <div class="hero__content container">
        <h1 class="hero__title">Tell us what you love.<br />We'll find your next favorite.</h1>
        <p class="hero__lede">
          Pick the movies you enjoy and we'll surface what fans with the same taste watched next.
        </p>
        <button class="btn btn--primary" type="button" @click="scrollTo('catalog')">
          Start picking
        </button>
      </div>
    </header>

    <!-- ----------------------------------------------------- Sticky selection -->
    <Transition name="slide-down">
      <div v-if="count > 0" class="actionbar">
        <div class="actionbar__inner container">
          <p class="actionbar__count">
            <strong>{{ count }}</strong> {{ count === 1 ? "movie" : "movies" }} liked
          </p>
          <div class="actionbar__buttons">
            <button class="btn btn--ghost" type="button" @click="clear">Clear</button>
            <button class="btn btn--primary" type="button" @click="scrollTo('recommendations')">
              See recommendations
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <div class="workspace container">
      <!-- ---------------------------------------------------- Recommendations -->
      <section id="recommendations" class="section workspace__recs">
      <div class="section__head">
        <h2 class="section__title">Recommended for you</h2>
        <p v-if="isFallback" class="section__note">
          Popular picks to get you started — like a few and these will tailor to your taste.
        </p>
        <p v-else-if="recommendations.length" class="section__note">
          Ranked by how often fans of your picks also loved these.
        </p>
      </div>

      <!-- Empty: nothing selected yet -->
      <div v-if="count === 0 && !recPending" class="placeholder">
        <span class="placeholder__icon" aria-hidden="true">🍿</span>
        <p>Like some movies and your personalised recommendations appear here.</p>
      </div>

      <!-- Loading skeletons -->
      <div v-else-if="recPending" class="rec-grid">
        <div v-for="n in 6" :key="n" class="skeleton" />
      </div>

      <p v-else-if="recError" class="placeholder placeholder--error">
        Couldn't load recommendations. Try changing your selection.
      </p>

      <TransitionGroup v-else tag="div" name="pop" class="rec-grid">
        <RecommendationCard
          v-for="(rec, i) in recommendations"
          :key="rec.id"
          :rec="rec"
          :rank="i + 1"
        />
      </TransitionGroup>
    </section>

      <!-- ------------------------------------------------------- The catalog -->
      <section id="catalog" class="section workspace__catalog">
        <div class="section__head">
          <h2 class="section__title">The collection</h2>
          <p class="section__note">Tap a poster to add it to your likes.</p>
        </div>

        <p v-if="pending" class="placeholder">Loading the collection…</p>
        <p v-else-if="error" class="placeholder placeholder--error">
          Couldn't load the catalog. Please refresh.
        </p>

        <div v-else class="catalog-grid">
          <MovieCard
            v-for="(movie, i) in movies"
            :key="movie.id"
            :movie="movie"
            :selected="isSelected(movie.id)"
            :eager="i < 12"
            @toggle="toggle(movie.id)"
          />
        </div>
      </section>
    </div>

    <footer class="footer container">
      <p>
        Built with Nuxt 5 · Nitro BFF · item-based collaborative filtering. Artwork &amp; metadata
        from
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDb</a>.
      </p>
    </footer>
  </div>
</template>

<style scoped>
/* ----------------------------------------------------------------- Hero --- */
.hero {
  position: relative;
  overflow: hidden;
  padding-block: clamp(4rem, 12vw, 9rem);
  isolation: isolate;
}

.hero__marquee {
  position: absolute;
  inset: 0;
  z-index: -2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-4);
  opacity: 0.16;
  mask-image: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);
}

.hero__row {
  display: flex;
  gap: var(--space-4);
  width: max-content;
  animation: marquee 80s linear infinite;

  & img {
    width: 120px;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: var(--radius-sm);
  }
}

@keyframes marquee {
  to {
    transform: translateX(-50%);
  }
}

.hero::after {
  /* Vignette so text stays legible over the marquee. */
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(80% 90% at 50% 40%, transparent, var(--bg-900) 75%);
}

.hero__content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
  max-width: 46rem;
}

.hero__eyebrow {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.hero__title {
  font-size: clamp(2.2rem, 6vw, 4rem);
  font-weight: 800;
}

.hero__lede {
  font-size: clamp(1rem, 2.2vw, 1.2rem);
  color: var(--text-muted);
  max-width: 38rem;
}

/* ----------------------------------------------------------- Action bar --- */
.actionbar {
  position: sticky;
  inset-block-start: 0;
  z-index: 20;
  background: color-mix(in oklch, var(--bg-800) 82%, transparent);
  backdrop-filter: blur(14px) saturate(1.2);
  border-block-end: 1px solid var(--border);
}

.actionbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-block: var(--space-3);
}

.actionbar__count {
  color: var(--text-muted);

  & strong {
    color: var(--text);
    font-family: var(--font-display);
    font-size: 1.1rem;
  }
}

.actionbar__buttons {
  display: flex;
  gap: var(--space-2);

  .btn {
    font-size: 0.8rem;
  }
}

/* -------------------------------------------------------------- Buttons --- */
.btn {
  padding: 0.7em 1.3em;
  font-weight: 600;
  font-size: 1.2rem;
  border-radius: 999px;
  transition:
    transform 0.2s var(--ease),
    background 0.2s var(--ease),
    border-color 0.2s var(--ease);

  &:active {
    transform: scale(0.96);
  }
}

.btn--primary {
  color: var(--bg-900);
  background: var(--accent);

  &:hover {
    background: color-mix(in oklch, var(--accent) 88%, white);
  }
}

.btn--ghost {
  color: var(--text);
  border: 1px solid var(--border-strong);

  &:hover {
    background: var(--surface);
  }
}

/* ------------------------------------------------------------ Workspace --- */
.workspace {
  display: grid;
  gap: clamp(var(--space-5), 4vw, var(--space-7));
  padding-block: clamp(2.5rem, 6vw, 4.5rem);
  /* Mobile: stacked, recommendations above the collection (as before). */
  grid-template-areas: "recs" "catalog";
}

.workspace__recs {
  grid-area: recs;
}

.workspace__catalog {
  grid-area: catalog;
}

@media (min-width: 1024px) {
  .workspace {
    /* Desktop: collection on the left, recommendations on the right. */
    grid-template-columns: minmax(0, 1fr) clamp(320px, 30vw, 420px);
    grid-template-areas: "catalog recs";
    align-items: start;
  }

  /* Keep recommendations in view while scrolling the long collection. */
  .workspace__recs {
    position: sticky;
    inset-block-start: var(--space-8);
  }
}

/* ------------------------------------------------------------- Sections --- */
.section {
  padding-block: clamp(2.5rem, 6vw, 4.5rem);
}

.workspace .section {
  padding-block: 0;
}

.section__head {
  margin-block-end: var(--space-5);
}

.section__title {
  font-size: clamp(1.5rem, 4vw, 2.2rem);
}

.section__note {
  margin-block-start: var(--space-2);
  color: var(--text-muted);
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: clamp(var(--space-3), 2vw, var(--space-5));
}

.rec-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: clamp(var(--space-4), 2vw, var(--space-5));
}

/* ---------------------------------------------------- Placeholders/skel --- */
.placeholder {
  display: grid;
  place-items: center;
  gap: var(--space-3);
  padding: var(--space-7) var(--space-4);
  text-align: center;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
}

.placeholder__icon {
  font-size: 2.5rem;
}

.placeholder--error {
  color: var(--danger);
  border-color: color-mix(in oklch, var(--danger) 40%, transparent);
}

.skeleton {
  aspect-ratio: 2 / 3;
  border-radius: var(--radius);
  background: linear-gradient(
    100deg,
    var(--surface) 30%,
    var(--surface-raised) 50%,
    var(--surface) 70%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

/* --------------------------------------------------------------- Footer --- */
.footer {
  padding-block: var(--space-7);
  color: var(--text-faint);
  font-size: 0.85rem;
  border-block-start: 1px solid var(--border);
}

/* ----------------------------------------------------------- Transitions -- */
.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    transform 0.3s var(--ease),
    opacity 0.3s var(--ease);
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.pop-enter-active {
  transition:
    opacity 0.4s var(--ease),
    transform 0.4s var(--ease);
}
.pop-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.pop-move {
  transition: transform 0.4s var(--ease);
}
</style>
