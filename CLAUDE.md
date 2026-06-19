# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A movie recommendation web app built for a senior frontend technical interview (TrueFire Studios). Given the movies a user says they like, it recommends other movies from a fixed catalog of 70 — "users who liked A, B, C also liked…", the Amazon item-to-item idea. The emphasis is on a **visually impressive** UI and clean architecture, not ML novelty.

See `PRD.md` for the product spec and `TASKS.md` for the phased build plan. Keep both in sync with the code as it evolves.

## Commands

Package manager is **pnpm** (Node 24, Nuxt 5 nightly).

```bash
pnpm install          # install (runs `nuxt prepare` via postinstall)
pnpm dev              # dev server on http://localhost:3000
pnpm build            # production build (.output/)
pnpm preview          # preview the production build
pnpm generate         # static prerender
```

There is no test or lint tooling configured yet. If you add tests, prefer **Vitest** (Nuxt's default) and wire a `test` script before relying on it.

TMDb access needs an API key — set `TMDB_API_KEY` in `.env` (read via `runtimeConfig`, server-side only). Never expose it to the client.

## The dataset (read this before touching recommendations)

`app/assets/movies.json` is the single source of truth. Its shape is **not** a flat array:

```jsonc
{
  "movies": { "1": "Toy Story (1995)", "2": "GoldenEye (1995)", ... }, // 70 entries, id -> "Title (Year)"
  "users":  [ { "user_id": 1, "movies": [5, 9, 12, 13, 26, 34, 37, 53] }, ... ] // 806 users
}
```

Non-obvious things that matter:

- Movie IDs are **string keys** in `movies` but **numbers** in each user's `movies` array. Normalize on load.
- Feedback is **binary and implicit** — a movie is either in a user's liked list or absent. There are no ratings, so treat presence as a positive signal and absence as unknown (not negative).
- Titles encode the year and sometimes article inversion, e.g. `"Usual Suspects, The (1995)"`, `"Postino, Il (1994)"`. Parsing into `{ title, year }` (and de-inverting the article) is required to get good TMDb matches.
- ~15.3k total likes, avg 19 per user, range 1–70. Small enough to compute an item–item similarity matrix in memory.

## Architecture & conventions

The build follows constraints the reviewer cares about — honor them:

- **Nitro BFF in `/server`.** All TMDb calls and the recommendation engine run server-side. The browser only ever talks to our own `/api/*` routes, never TMDb directly. See https://nitro.build/docs.
- **Shared types live in `shared/types/`.** Every interface (dataset shape, API request/response, TMDb DTOs, recommendation results) goes there and is imported by both `app/` and `server/`. Don't redeclare types locally.
- **Recommendation engine** is item-based collaborative filtering: build a 70×70 cosine similarity matrix over the user–item matrix once, then score a user's liked set against it. Keep the algorithm in a `server/utils/` module, pure and unit-testable, separate from the HTTP route. Each recommendation should be able to explain itself ("because you liked X").
- **TMDb enrichment** (poster, backdrop, logo, overview, genres, rating) is layered on top of the catalog server-side and **memoized** (`server/utils/tmdb.ts`, in-memory TTL promise cache) so the 70 lookups happen once, not per request. The recommender must work even if TMDb is unavailable — assets are progressive enhancement, not a hard dependency.
- **TMDb resolution is by curated ID, not live search.** `server/utils/tmdb-ids.ts` maps each catalog ID to a hand-verified TMDb ID; we fetch the exact film via `/movie/{id}?append_to_response=images` (one call → details, genres, logo). This is deterministic and avoids wrong-title/year-mismatch search hits (e.g. "Independence Day (ID4)" → 602, not a featurette). Title+year search remains only as a fallback for an unmapped ID.
- **CSS: modern, hand-written, no framework.** Use native CSS nesting, custom properties, `color-mix()`, container/`@layer`, `clamp()` etc. **Do not** add Tailwind and **do not** use BEM naming. Prefer scoped `<style>` in components and a small global token layer.

### Nitro v3 gotchas (this nightly)

- **No server auto-imports.** Nitro v3 removed them. Server code must import explicitly: `defineHandler` (not `defineEventHandler`) and `HTTPError` from `nitro`; `readBody`, `createError`, `getQuery` from `nitro/h3`. `nitro` is a direct dependency so these bare specifiers resolve at runtime.
- **Don't use the global `$fetch` for external APIs.** Nitro's `$fetch` intercepts/normalizes absolute URLs and breaks upstream calls — use the native `fetch` (see `tmdbGet` in `tmdb.ts`).
- The TMDb key is read via `process.env.TMDB_API_KEY` (mirrored by `runtimeConfig.tmdbApiKey`).

## Layout

- `app/` — Nuxt app (pages, components, composables, assets). `app/assets/movies.json` is the dataset.
- `server/` — Nitro: `api/` routes (the BFF), `utils/` (recommender, TMDb client, curated TMDb ID map).
- `shared/types/` — all TypeScript interfaces shared across app and server.
- `public/` — static files served as-is.
