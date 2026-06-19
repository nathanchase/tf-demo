// Build-time generator for the TMDb-enriched catalog.
//
// The catalog of 70 films is fixed, so we resolve all TMDb assets ONCE here and
// commit the result to `server/utils/enriched-catalog.json`. The deployed server
// then serves that static file with zero runtime TMDb calls — important on
// Cloudflare Workers (per-request sub-request limits) and removes the need for a
// runtime API key.
//
// Usage:  TMDB_API_KEY=xxxx node scripts/generate-catalog.mjs
//
// Run as a standalone Node script (no Nuxt), so the global `fetch` is the real
// one — not the dev-SSR-patched version that misroutes absolute URLs.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE = "w500";
const BACKDROP_SIZE = "w1280";
const LOGO_SIZE = "w500";
const CONCURRENCY = 8;

const key = process.env.TMDB_API_KEY;
if (!key) {
  console.error("[generate-catalog] TMDB_API_KEY is required");
  process.exit(1);
}

const dataset = JSON.parse(readFileSync(resolve(root, "app/assets/movies.json"), "utf8"));
const tmdbIds = JSON.parse(readFileSync(resolve(root, "server/utils/tmdb-ids.json"), "utf8"));

const TRAILING_ARTICLES = new Set([
  "the", "a", "an",
  "la", "le", "les", "l",
  "il", "lo", "gli", "i",
  "el", "los", "las", "un", "una",
  "der", "die", "das", "den", "ein", "eine",
]);

/** Mirrors server/utils/dataset.ts parseTitle (year + article de-inversion). */
function parseTitle(raw) {
  let working = raw.trim();
  let year = null;
  const yearMatch = working.match(/\((\d{4})\)\s*$/);
  if (yearMatch) {
    year = Number(yearMatch[1]);
    working = working.slice(0, yearMatch.index).trim();
  }
  const commaIdx = working.lastIndexOf(", ");
  if (commaIdx !== -1) {
    const tail = working.slice(commaIdx + 2).trim();
    const normalized = tail.replace(/'$/, "").toLowerCase();
    if (TRAILING_ARTICLES.has(normalized)) {
      const head = working.slice(0, commaIdx).trim();
      working = tail.endsWith("'") ? `${tail}${head}` : `${tail} ${head}`;
    }
  }
  return { title: working, year };
}

function imageUrl(path, size) {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

async function tmdbGet(path, params) {
  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`TMDb ${path} -> ${res.status}`);
  return res.json();
}

async function resolveTmdbId(movie) {
  const mapped = tmdbIds[movie.id];
  if (mapped) return mapped;
  let results = (
    await tmdbGet("/search/movie", {
      api_key: key,
      query: movie.title,
      ...(movie.year ? { year: String(movie.year) } : {}),
      include_adult: "false",
    })
  ).results;
  if (results.length === 0 && movie.year) {
    results = (await tmdbGet("/search/movie", { api_key: key, query: movie.title, include_adult: "false" })).results;
  }
  if (movie.year) {
    const exact = results.find((r) => (r.release_date || "").startsWith(String(movie.year)));
    if (exact) return exact.id;
  }
  return results[0]?.id ?? null;
}

function pickLogo(images) {
  const logos = images?.logos ?? [];
  const logo = logos.find((l) => l.iso_639_1 === "en") ?? logos[0];
  return imageUrl(logo?.file_path ?? null, LOGO_SIZE);
}

async function fetchAssets(movie) {
  try {
    const tmdbId = await resolveTmdbId(movie);
    if (!tmdbId) return null;
    const detail = await tmdbGet(`/movie/${tmdbId}`, {
      api_key: key,
      append_to_response: "images",
      include_image_language: "en,null",
    });
    return {
      tmdbId: detail.id,
      posterUrl: imageUrl(detail.poster_path, POSTER_SIZE),
      backdropUrl: imageUrl(detail.backdrop_path, BACKDROP_SIZE),
      logoUrl: pickLogo(detail.images),
      overview: detail.overview || null,
      genres: (detail.genres ?? []).map((g) => g.name),
      rating: typeof detail.vote_average === "number" ? detail.vote_average : null,
      tmdbTitle: detail.title ?? null,
    };
  } catch (err) {
    console.error("[generate-catalog] failed for", movie.title, "-", err.message);
    return null;
  }
}

const catalog = Object.entries(dataset.movies)
  .map(([id, raw]) => ({ id: Number(id), ...parseTitle(raw), raw }))
  .sort((a, b) => a.id - b.id);

const out = [];
for (let i = 0; i < catalog.length; i += CONCURRENCY) {
  const batch = catalog.slice(i, i + CONCURRENCY);
  const assets = await Promise.all(batch.map(fetchAssets));
  batch.forEach((movie, idx) => out.push({ ...movie, tmdb: assets[idx] ?? null }));
}

const outPath = resolve(root, "server/utils/enriched-catalog.json");
writeFileSync(outPath, JSON.stringify(out));
const posters = out.filter((m) => m.tmdb?.posterUrl).length;
console.log(`[generate-catalog] wrote ${out.length} movies (${posters} with posters) -> ${outPath}`);
