import type { CatalogMovie, EnrichedMovie, TmdbAssets } from "~~/shared/types";
import { catalog } from "./dataset";
import { TMDB_IDS } from "./tmdb-ids";

/**
 * TMDb client + catalog enrichment, kept entirely server-side.
 *
 * The browser never talks to TMDb — it only sees the enriched catalog this
 * module produces. Enrichment is a progressive enhancement: if the API key is
 * missing or TMDb is unreachable, movies come back with `tmdb: null` and the
 * app renders text-only. The full enriched catalog is memoized so the upstream
 * calls happen once, not per request.
 *
 * Resolution strategy: each catalog movie maps to a hand-verified TMDb ID
 * (`tmdb-ids.ts`), so we fetch the exact film by ID — deterministic and immune
 * to wrong-title/year-mismatch search hits. Title+year search is only a
 * fallback for an unmapped ID. A single `/movie/{id}?append_to_response=images`
 * call returns details, genres and the title logo together.
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE = "w500";
const BACKDROP_SIZE = "w1280";
const LOGO_SIZE = "w500";

/** How many movies to enrich concurrently (politeness vs. speed). */
const CONCURRENCY = 8;

interface TmdbImage {
  file_path: string;
  iso_639_1: string | null;
}

interface TmdbDetail {
  id: number;
  title: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: { id: number; name: string }[];
  vote_average: number;
  images?: { logos: TmdbImage[] };
}

interface TmdbSearchResult {
  id: number;
  release_date?: string;
}

function apiKey(): string | null {
  // Read straight from the environment (server-only). Mirrors the
  // `runtimeConfig.tmdbApiKey` binding in nuxt.config.ts.
  const key = process.env.TMDB_API_KEY;
  return typeof key === "string" && key.length > 0 ? key : null;
}

function imageUrl(path: string | null, size: string): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

/**
 * Thin TMDb GET helper using the native `fetch`. We deliberately avoid Nitro's
 * global `$fetch`, which intercepts/normalizes absolute URLs and breaks these
 * upstream calls. Throws on non-2xx so callers can fall back gracefully.
 */
async function tmdbGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`TMDb ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

/** Picks the transparent English title logo, falling back to any logo. */
function pickLogo(images: TmdbDetail["images"]): string | null {
  const logos = images?.logos ?? [];
  const logo = logos.find((l) => l.iso_639_1 === "en") ?? logos[0];
  return imageUrl(logo?.file_path ?? null, LOGO_SIZE);
}

/**
 * Resolves a catalog movie's TMDb ID: the curated map first, else a title+year
 * search (with a no-year retry for release-year drift).
 */
async function resolveTmdbId(movie: CatalogMovie, key: string): Promise<number | null> {
  const mapped = TMDB_IDS[movie.id];
  if (mapped) return mapped;

  let results = (
    await tmdbGet<{ results: TmdbSearchResult[] }>("/search/movie", {
      api_key: key,
      query: movie.title,
      ...(movie.year ? { year: String(movie.year) } : {}),
      include_adult: "false",
    })
  ).results;

  if (results.length === 0 && movie.year) {
    results = (
      await tmdbGet<{ results: TmdbSearchResult[] }>("/search/movie", {
        api_key: key,
        query: movie.title,
        include_adult: "false",
      })
    ).results;
  }

  if (movie.year) {
    const exact = results.find((r) => r.release_date?.startsWith(String(movie.year)));
    if (exact) return exact.id;
  }
  return results[0]?.id ?? null;
}

/** Resolves TMDb assets for a single catalog movie. Returns null on any miss. */
async function fetchAssets(movie: CatalogMovie, key: string): Promise<TmdbAssets | null> {
  try {
    const tmdbId = await resolveTmdbId(movie, key);
    if (!tmdbId) return null;

    // One call returns details, genres and logos together.
    const detail = await tmdbGet<TmdbDetail>(`/movie/${tmdbId}`, {
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
    console.error("[tmdb] enrichment failed for", movie.title, "-", (err as Error)?.message);
    return null;
  }
}

/** Maps over the catalog in bounded-concurrency batches. */
async function enrich(key: string): Promise<EnrichedMovie[]> {
  const out: EnrichedMovie[] = [];
  for (let i = 0; i < catalog.length; i += CONCURRENCY) {
    const batch = catalog.slice(i, i + CONCURRENCY);
    const assets = await Promise.all(batch.map((m) => fetchAssets(m, key)));
    batch.forEach((movie, idx) => out.push({ ...movie, tmdb: assets[idx] ?? null }));
  }
  return out;
}

/** Lifetime of the in-memory enriched-catalog cache (24h). */
const CATALOG_TTL = 1000 * 60 * 60 * 24;

let catalogCache: { at: number; data: Promise<EnrichedMovie[]> } | null = null;

/**
 * Returns the full catalog enriched with TMDb assets, memoized for a day.
 *
 * Memoizing the in-flight promise means concurrent first requests share a
 * single enrichment pass rather than each hammering TMDb. Without an API key it
 * returns the plain catalog (every `tmdb` is null), so the app degrades to
 * text-only and enrichment begins the moment a key is configured.
 */
export function getEnrichedCatalog(): Promise<EnrichedMovie[]> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < CATALOG_TTL) {
    return catalogCache.data;
  }

  const key = apiKey();
  const data = key ? enrich(key) : Promise.resolve(catalog.map((m) => ({ ...m, tmdb: null })));

  if (!key && import.meta.dev) {
    console.warn("[tmdb] no TMDB_API_KEY — serving text-only catalog");
  }

  const entry = { at: now, data };
  catalogCache = entry;
  // On failure, drop the cache so the next request retries instead of caching the error.
  data.catch(() => {
    if (catalogCache === entry) catalogCache = null;
  });

  return data;
}
