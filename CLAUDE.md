# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A movie recommendation web app. Given the movies a user says they like, it recommends other movies from a fixed catalog of 70 — "users who liked A, B, C also liked…", the Amazon item-to-item idea. The emphasis is on a **visually impressive** UI and clean architecture.

Status: **complete and deployed** to Cloudflare Workers — https://movie-recs.nathanchase.workers.dev.

See `PRD.md` for the product spec and `TASKS.md` for the build plan. Keep both in sync with the code as it evolves.

## Commands

Package manager is **pnpm** (Node 24, Nuxt 5 nightly).

```bash
pnpm install           # install (runs `nuxt prepare` via postinstall)
pnpm dev               # dev server on http://localhost:3000
pnpm build             # production build (.output/)
pnpm preview           # preview the production build
pnpm cf:preview        # build + run the Cloudflare Worker locally (workerd)
pnpm deploy            # build + deploy to Cloudflare Workers (needs `wrangler login`)
pnpm generate:catalog  # re-bake the TMDb-enriched catalog (needs TMDB_API_KEY)
```

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

- **Nitro BFF in `/server`.** The recommendation engine runs server-side and the browser only ever talks to our own `/api/*` routes, never TMDb directly. See https://nitro.build/docs.
- **Shared types live in `shared/types/`.** Every interface (dataset shape, API request/response, TMDb DTOs, recommendation results) goes there and is imported by both `app/` and `server/`. Don't redeclare types locally.
- **Recommendation engine** is item-based collaborative filtering: build a 70×70 cosine similarity matrix over the user–item matrix once, then score a user's liked set against it. Keep the algorithm in `server/utils/recommender.ts`, pure and unit-testable, separate from the HTTP route. Each recommendation explains itself ("because you liked X").
- **TMDb assets are pre-baked at build time, not fetched at runtime.** The catalog is a fixed 70 films, so `scripts/generate-catalog.mjs` resolves every poster/backdrop/logo/overview/genre/rating once and writes `server/utils/enriched-catalog.json` (committed). At runtime `server/utils/tmdb.ts` just returns that static data — **zero runtime TMDb calls, no runtime API key, no Cloudflare sub-request limits**. Regenerate with `pnpm generate:catalog` (needs `TMDB_API_KEY`).
- **TMDb resolution is by curated ID, not live search.** `server/utils/tmdb-ids.json` maps each catalog ID to a hand-verified TMDb ID; the generator fetches the exact film via `/movie/{id}?append_to_response=images` (one call → details, genres, logo). This is deterministic and avoids wrong-title/year-mismatch search hits (e.g. "Independence Day (ID4)" → 602, not a featurette). Title+year search is only a generator-side fallback for an unmapped ID.
- **CSS: modern, hand-written, no framework.** Use native CSS nesting, custom properties, `color-mix()`, container/`@layer`, `clamp()` etc. **Do not** add Tailwind and **do not** use BEM naming. Prefer scoped `<style>` in components and a small global token layer.

### Nitro v3 / nightly gotchas

- **No server auto-imports.** Nitro v3 removed them. Server code must import explicitly: `defineHandler` (not `defineEventHandler`) and `HTTPError` from `nitro`; `readBody`, `createError`, `getQuery` from `nitro/h3`. `nitro` is a direct dependency so these bare specifiers resolve at runtime.
- **Outbound HTTP uses `node:https`** — but only in the build-time generator (`scripts/generate-catalog.mjs`), never in the deployed Worker. During dev SSR, the global `$fetch`/`fetch` and Nitro's `fetch` route absolute URLs through the local app (host dropped → matched against Vue Router → 404s). The generator runs as a standalone Node script (no Nuxt patch), so it could use plain `fetch`, but `node:https` is unambiguous. The runtime makes no outbound calls at all.
- **Cloudflare `import.meta.url` fix.** Nuxt's SSR runtime has a stray `import.meta.url.replace(...)` whose result is discarded; on workerd `import.meta.url` is undefined in that chunk and the call throws during SSR. A targeted `nitro.replace` neutralizes that exact expression (see `nuxt.config.ts`) without touching the entry module's valid `import.meta.url` use.

## Deployment

Cloudflare Workers via the `cloudflare_module` Nitro preset + `wrangler.jsonc` (worker name `movie-recs`, `nodejs_compat`). `nuxt build` emits `.output/server/` and a `.wrangler/deploy/config.json` redirect, so `wrangler deploy` from the repo root uses the generated config. `pnpm deploy` does build + deploy; needs `wrangler login`. No runtime secrets — assets are baked in.

## Layout

- `app/` — Nuxt app (pages, components, composables, assets). `app/assets/movies.json` is the dataset.
- `server/` — Nitro: `api/` routes (the BFF), `utils/` (recommender, dataset loader, `enriched-catalog.json` baked data, `tmdb-ids.json` curated map, `tmdb.ts` static-catalog server).
- `scripts/` — `generate-catalog.mjs`, the build-time TMDb enrichment generator.
- `shared/types/` — all TypeScript interfaces shared across app and server.
- `public/` — static files served as-is.
