# Build Plan — Movie Recommender

**Status: complete & deployed** → https://movie-recs.nathanchase.workers.dev

Phased checklist of the build. See `PRD.md` for the spec and `CLAUDE.md` for conventions.

## Phase 0 — Foundations

- [x] Confirm tooling: Node 24, pnpm, Nuxt 5 nightly; `pnpm dev` runs the starter.
- [x] Replace the default `app/app.vue` welcome with an app shell (layout + page entry).
- [x] Establish global CSS: token layer (custom properties for color/space/type), `@layer` setup, reset, base typography.

## Phase 1 — Data & types

- [x] `shared/types/`: dataset shape, parsed movie (`{ id, title, year, raw }`), API DTOs, recommendation result, TMDb DTOs.
- [x] Loader/util that reads `movies.json`, normalizes IDs to numbers, and parses titles into `{ title, year }` with article de-inversion.
- [x] Sanity check: assert 70 movies, 806 users, all referenced IDs in 1–70.

## Phase 2 — Recommendation engine (server, pure)

- [x] `server/utils/recommender.ts`: build binary user–item matrix.
- [x] Compute 70×70 cosine item–item similarity; precompute once at module load.
- [x] `recommend(likedIds, n)`: score candidates, exclude liked, return top-N with score + contributing movies (explanation).
- [x] Handle edges: 0 likes (popularity fallback), 1 like, all liked.
- [ ] (Future) Vitest unit tests for similarity + ranking determinism.

## Phase 3 — TMDb enrichment (build-time bake)

- [x] Curated `catalogId → tmdbId` map (`server/utils/tmdb-ids.json`), hand-verified (e.g. "Independence Day (ID4)" → 602, not a featurette).
- [x] `scripts/generate-catalog.mjs`: fetch each film by exact ID (`/movie/{id}?append_to_response=images`) → poster/backdrop/logo/overview/genres/rating; title+year search as fallback.
- [x] Bake the result to committed `server/utils/enriched-catalog.json`; runtime serves it statically (no runtime TMDb calls, no runtime key).

## Phase 4 — API routes (BFF)

- [x] `GET /api/movies` — enriched catalog.
- [x] `POST /api/recommendations` — liked IDs → ranked, enriched recommendations with reasons.
- [x] Validate input; consistent error shape; types from `shared/types/`.

## Phase 5 — UI: catalog & selection

- [x] Responsive poster-card grid from `/api/movies`.
- [x] Selectable/liked card state with smooth transitions; clear affordance.
- [x] Selection composable with localStorage persistence; loading + empty + error states.
- [x] Keyboard operable, focus styles, semantic markup.

## Phase 6 — UI: recommendations

- [x] Recommendations section driven by current selections (debounced calls to `/api/recommendations`).
- [x] Recommendation cards use TMDb **backdrops + logos**, with match ring and "Because you liked …" reason.
- [x] Empty-state prompt when nothing selected; loading skeletons; error state.

## Phase 7 — Polish & layout

- [x] Cohesive cinematic visual design pass; tasteful motion; `prefers-reduced-motion`.
- [x] Two-column workspace on desktop (collection left, sticky recommendations right); stacked on mobile.
- [x] Responsive across mobile/tablet/desktop; accessibility pass.
- [x] Perf: no client-side TMDb calls, static baked assets, fast first interaction.

## Phase 8 — Deployment

- [x] Cloudflare Workers via `cloudflare_module` Nitro preset + `nodejs_compat` + `wrangler.jsonc` (worker `movie-recs`).
- [x] `pnpm deploy` (build + `wrangler deploy`) and `pnpm cf:preview` (local workerd) scripts.
- [x] Verified live: SSR home, `/api/movies`, `/api/recommendations` all green.
