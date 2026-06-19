import { defineHandler } from "nitro";
import type { MoviesResponse } from "#shared/types";
import { getEnrichedCatalog } from "../utils/tmdb";

/**
 * GET /api/movies — the full 70-title catalog enriched with TMDb assets.
 * Assets are pre-baked at build time, so this just returns static data.
 */
export default defineHandler((): MoviesResponse => {
  return { movies: getEnrichedCatalog() };
});
