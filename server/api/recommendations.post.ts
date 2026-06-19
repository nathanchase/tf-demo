import { defineHandler } from "nitro";
import { createError, readBody } from "nitro/h3";
import type {
  EnrichedMovie,
  MovieId,
  Recommendation,
  RecommendationsRequest,
  RecommendationsResponse,
} from "~~/shared/types";
import { recommend } from "../utils/recommender";
import { getEnrichedCatalog } from "../utils/tmdb";

const MAX_LIMIT = 24;

/**
 * POST /api/recommendations
 * Body: { likedIds: number[], limit?: number }
 *
 * Runs item-based collaborative filtering over the supplied likes and returns
 * ranked, TMDb-enriched recommendations, each with the liked movies that drove
 * it. Invalid likedIds are ignored by the engine; a missing/empty list yields a
 * popularity fallback (flagged via `fallback`).
 */
export default defineHandler(async (event): Promise<RecommendationsResponse> => {
  const body = await readBody<RecommendationsRequest>(event);

  if (!body || !Array.isArray(body.likedIds)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request body must include a `likedIds` array of movie IDs.",
    });
  }

  const likedIds = body.likedIds.map((id) => Number(id)).filter((id) => Number.isInteger(id));

  const limit = Math.min(Math.max(1, Number(body.limit) || 12), MAX_LIMIT);

  const { recommendations: scored, isFallback } = recommend(likedIds, limit);

  // Join recommendations with enriched movie data (cached catalog lookup).
  const catalog = await getEnrichedCatalog();
  const byId = new Map<MovieId, EnrichedMovie>(catalog.map((m) => [m.id, m]));

  const recommendations: Recommendation[] = scored
    .map((rec): Recommendation | null => {
      const movie = byId.get(rec.id);
      return movie ? { ...rec, movie } : null;
    })
    .filter((r): r is Recommendation => r !== null);

  return {
    recommendations,
    basedOn: likedIds,
    fallback: isFallback,
  };
});
