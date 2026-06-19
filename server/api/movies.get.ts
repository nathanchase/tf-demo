import { defineHandler } from "nitro";
import type { MoviesResponse } from "~~/shared/types";
import { getEnrichedCatalog } from "../utils/tmdb";

/**
 * GET /api/movies — the full 70-title catalog enriched with TMDb assets.
 * Enrichment is cached server-side, so this is fast after the first call.
 */
export default defineHandler(async (): Promise<MoviesResponse> => {
  const movies = await getEnrichedCatalog();
  return { movies };
});
