# Product Requirements — Movie Recommender

> **Status: complete & deployed** — https://movie-recs.nathanchase.workers.dev (Cloudflare Workers).

## 1. Goal

Build a visually impressive, single-purpose web app that recommends movies from a fixed 70-title catalog based on what a user likes, leveraging the preferences of ~806 other users. **Clean architecture + an explainable algorithm + a standout UI**.

## 2. Users & primary flow

A single anonymous visitor, no auth.

1. Land on a browsable catalog of the 70 films, each with artwork.
2. Select the movies they like (a few clicks).
3. See a ranked list of recommended movies they haven't selected, each with a one-line explanation.
4. Refine selections and watch recommendations update.

## 3. The data

Source: `app/assets/movies.json` (committed, static).

- `movies`: object mapping **string id → `"Title (Year)"`**, 70 entries.
- `users`: array of `{ user_id: number, movies: number[] }`, 806 entries — each user's liked movie IDs.
- Binary implicit feedback: liked or unknown. No ratings. ~15.3k total likes, ~19/user.

Parsing requirements:

- Coerce movie IDs to a single type (numbers) on load.
- Split each title into `{ title, year }`; de-invert trailing articles (`"Usual Suspects, The"` → `"The Usual Suspects"`, `"Postino, Il"` → `"Il Postino"`) before querying TMDb.

## 4. Recommendation approach

**Item-based collaborative filtering** (item-to-item), the same family Amazon popularized, stable for a small catalog, and matches the "users who liked X also liked Y" brief requirement.

1. Build the binary user–item matrix from `users` (806 × 70).
2. Compute a **70 × 70 item–item cosine similarity matrix** once (precompute/cache at server start; it's tiny).
3. For a user's set of liked IDs `L`, score every candidate movie `c ∉ L` as the sum (or mean) of `similarity(c, l)` for `l ∈ L`.
4. Return the top-N candidates ranked by score, excluding already-liked movies.
5. For each recommendation, surface the **strongest contributing liked movie(s)** as the explanation ("Because you liked …").

Decisions to make explicit in code/comments:

- Similarity metric (cosine over binary vectors) and why.
- **Decision:** use a plain cosine-similarity sum for scoring (simplest, most explainable). Acknowledge the popularity-bias trade-off in comments; a popularity-normalized variant is a stretch toggle, not the default.
- Cold start: with zero selections, fall back to most-liked / popular movies.

Acceptance: recommendations are deterministic for a given input, never include already-liked movies, and degrade sensibly at the edges (0 likes, 1 like, all 70 liked).

## 5. Architecture

- **Nitro BFF (`/server`)**: the only thing the browser calls.
  - `GET /api/movies` — the catalog enriched with TMDb assets (served from baked static data).
  - `POST /api/recommendations` — body: liked IDs; returns ranked recommendations with explanations and enriched assets.
  - `server/utils/recommender.ts` — pure CF engine (no HTTP), unit-testable.
  - `server/utils/tmdb.ts` — returns the pre-baked enriched catalog (no runtime network).
- **TMDb enrichment is pre-baked at build time.** The catalog is fixed (70 films), so `scripts/generate-catalog.mjs` resolves every poster/backdrop/logo/overview/genre/rating once and writes `server/utils/enriched-catalog.json` (committed). Resolution is by a curated `catalogId → tmdbId` map (`server/utils/tmdb-ids.json`), fetched by exact ID (`/movie/{id}?append_to_response=images`) — deterministic, no wrong-title hits; title+year search is a generator-side fallback only. Result: the running server makes **no** TMDb calls, needs **no** runtime key, and isn't subject to Cloudflare sub-request limits.
- **Shared types** in `shared/types/`: dataset shape, API request/response DTOs, TMDb DTOs, recommendation result. Imported by both `app/` and `server/`.
- **Deployment**: Cloudflare Workers via the `cloudflare_module` Nitro preset + `wrangler.jsonc`. The TMDb key is needed only at catalog-generation time (`TMDB_API_KEY` for `pnpm generate:catalog`), never at runtime.

## 6. UI / UX requirements

The differentiator. Hand-built, modern, framework-free CSS.

- Responsive catalog grid of poster cards; clear selected/liked state with smooth transitions.
- A recommendations view/section that updates from the user's selections, each card showing artwork, title, year, score/match indicator, and the "because you liked…" reason.
- Considered visual design: a cohesive token system (custom properties), tasteful motion, dark cinematic aesthetic, good empty/loading/error states.
- Accessible: keyboard operable, focus states, semantic markup, `prefers-reduced-motion` respected.
- **CSS constraints**: native nesting, custom properties, `color-mix()`, `clamp()`, cascade layers; scoped component styles. **No Tailwind, no BEM.**

## 7. Non-goals

- User accounts, persistence beyond the session, or writing back preferences.
- Recommending movies outside the 70-title catalog.
- Production-grade model training, A/B testing, or analytics.

## 8. Success criteria

- The core flow works end-to-end and feels fast.
- Recommendations are sensible and explainable.
- Code is well-structured (BFF boundary respected, types shared, engine isolated).
- The UI looks genuinely polished and is responsive + accessible.
- A reviewer can clone, `pnpm dev` (no key needed — artwork is baked in), and understand the project from the docs.
