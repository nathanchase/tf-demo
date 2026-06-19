# Build Plan — Movie Recommender

Phased, checkable tasks. Each phase is independently demoable. See `PRD.md` for the spec and `CLAUDE.md` for conventions.

## Phase 0 — Foundations

- [ ] Confirm tooling: Node 24, pnpm, Nuxt 5 nightly; `pnpm dev` runs the starter.
- [ ] Replace the default `app/app.vue` welcome with an app shell (layout + page entry).
- [ ] Add `.env.example` with `TMDB_API_KEY=`; wire `runtimeConfig` (server-only) in `nuxt.config.ts`. (Key will be supplied — build full enrichment, but keep the no-key fallback path.)
- [ ] Establish global CSS: token layer (custom properties for color/space/type), `@layer` setup, reset, base typography. No Tailwind/BEM.

## Phase 1 — Data & types

- [ ] `shared/types/`: dataset shape, parsed movie (`{ id, title, year, raw }`), API DTOs, recommendation result, TMDb DTOs.
- [ ] Loader/util that reads `movies.json`, normalizes IDs to numbers, and parses titles into `{ title, year }` with article de-inversion.
- [ ] Sanity check: assert 70 movies, 806 users, all referenced IDs in 1–70.

## Phase 2 — Recommendation engine (server, pure)

- [ ] `server/utils/recommender.ts`: build binary user–item matrix.
- [ ] Compute 70×70 cosine item–item similarity; memoize/precompute.
- [ ] `recommend(likedIds, n)`: score candidates, exclude liked, return top-N with score + contributing movies (explanation).
- [ ] Handle edges: 0 likes (popularity fallback), 1 like, all liked.
- [ ] (If test tooling added) unit tests for similarity + ranking determinism.

## Phase 3 — TMDb enrichment (server)

- [ ] `server/utils/tmdb.ts`: search by `{ title, year }`; map to poster/backdrop/logo/overview/genres/rating.
- [ ] Cache results (`cachedFunction`/Nitro storage) so 70 lookups happen once; graceful fallback when key missing or API fails.
- [ ] Build image URLs from TMDb config (poster/backdrop/logo sizes).

## Phase 4 — API routes (BFF)

- [ ] `GET /api/movies` — enriched catalog.
- [ ] `POST /api/recommendations` — liked IDs → ranked, enriched recommendations with reasons.
- [ ] Validate input; consistent error shape; types from `shared/types/`.

## Phase 5 — UI: catalog & selection

- [ ] Responsive poster-card grid from `/api/movies`.
- [ ] Selectable/liked card state with smooth transitions; clear affordance.
- [ ] Selection state composable; loading + empty + error states.
- [ ] Keyboard operable, focus styles, semantic markup.

## Phase 6 — UI: recommendations

- [ ] Recommendations section driven by current selections (calls `/api/recommendations`).
- [ ] Recommendation card: artwork, title, year, match/score indicator, "Because you liked …" reason.
- [ ] Update on selection change (debounced); empty-state prompt when nothing selected.

## Phase 7 — Polish

- [ ] Cohesive cinematic visual design pass; tasteful motion; `prefers-reduced-motion`.
- [ ] Responsive across mobile/tablet/desktop.
- [ ] Accessibility pass (focus order, labels, contrast).
- [ ] Perf: caching verified, no client-side TMDb calls, fast first interaction.
- [ ] Final docs sync: README/PRD/CLAUDE match the build; `.env.example` accurate.

## Stretch (only if time remains)

- [ ] Popularity-normalized scoring toggle to reduce blockbuster bias.
- [ ] "Surprise me" / diversity in results.
- [ ] Shareable URL encoding the selected set.
