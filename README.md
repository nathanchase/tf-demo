# 🎬 Movie Recommender

A small but polished movie recommendation app: pick the movies you love, get back the ones you'll love next. Built as a technical exercise for **TrueFire Studios** to demonstrate end-to-end proficiency: data modeling, a recommendation engine, a backend-for-frontend, and a genuinely nice-looking, modern user interface.

> **The brief.** Given a catalog of 70 movies and the "movie preferences" of ~800 users, build an app that makes recommendations the way Amazon does — _"the user likes movies A, B, C; what else from the list would you recommend based on what other users liked?"_

## What it does

- Browse the catalog of 70 films, each enriched with artwork and details from **TMDb**.
- Mark the movies you like.
- Get personalized recommendations ranked by an **item-to-item collaborative filtering** engine, with a short reason for each ("Recommended because you liked …").

## Why it's built this way

This project optimizes for what a senior frontend reviewer looks for: clear architecture, sensible data handling, an explainable algorithm, and a modern, hand-crafted UI.

- **Nuxt 5 + Vue 3** for the application layer.
- **Nitro backend-for-frontend** (`/server`) — the browser only talks to our own API; TMDb calls and the recommender run server-side, with caching. See [nitro.build](https://nitro.build/docs).
- **Collaborative filtering** over the supplied user data (no external ratings needed) — see `PRD.md` for the approach.
- **TMDb** for posters, backdrops, and metadata. See [TMDb API docs](https://developer.themoviedb.org/reference/getting-started).
- **Modern, framework-free CSS** — native nesting, custom properties, `color-mix()`, `clamp()` and cascade layers. No Tailwind, no BEM.
- **Shared TypeScript types** in `shared/types/`, consumed by both client and server.

## Getting started

Requires **Node 24+** and **pnpm**.

```bash
pnpm install
```

Add a TMDb API key (used server-side only) to a `.env` file:

```bash
TMDB_API_KEY=your_key_here
```

Then run the dev server on http://localhost:3000:

```bash
pnpm dev
```

The app degrades gracefully without a TMDb key — recommendations still work; only the artwork is unavailable.

## Scripts

| Command         | Description                      |
| --------------- | -------------------------------- |
| `pnpm dev`      | Start the dev server             |
| `pnpm build`    | Production build into `.output/` |
| `pnpm preview`  | Preview the production build     |
| `pnpm generate` | Static prerender                 |

## Project docs

- **[PRD.md](./PRD.md)** — product requirements and the recommendation design.
- **[TASKS.md](./TASKS.md)** — phased, checkable build plan.
- **[CLAUDE.md](./CLAUDE.md)** — architecture notes and conventions for contributors.

## The data

`app/assets/movies.json` holds the catalog (`movies`: id → `"Title (Year)"`) and ~806 users (`users`: each with the list of movie IDs they liked). 
Feedback is binary and implicit.
