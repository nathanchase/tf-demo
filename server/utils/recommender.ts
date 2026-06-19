import type { MovieId, ReasonMovie, ScoredRecommendation } from "#shared/types";
import { catalogById, movieIds, users } from "./dataset";

/**
 * Item-based collaborative filtering — the "users who liked X also liked Y"
 * approach Amazon popularized. We chose it because it is:
 *   - explainable: every recommendation cites the liked movies that drove it,
 *   - stable: a fixed 70-title catalog yields a tiny 70×70 similarity matrix,
 *   - cheap: the matrix is precomputed once and reused for every request.
 *
 * Feedback in the dataset is binary and implicit (liked / unknown), so each
 * movie is represented as the set of users who liked it and similarity is the
 * cosine between those binary vectors:
 *
 *     sim(i, j) = |U_i ∩ U_j| / (sqrt(|U_i|) · sqrt(|U_j|))
 *
 * Scoring sums a candidate's similarity to every movie the visitor liked. The
 * sum (rather than mean) intentionally rewards candidates connected to many of
 * the visitor's picks — this is the popularity/relevance trade-off noted in the
 * PRD; we keep it as the default for explainability.
 */

/** How many liked movies to cite as the reason for a recommendation. */
const MAX_REASONS = 3;

/** Per movie: the set of users who liked it, and that count for the norm. */
interface ItemStats {
  likers: Set<number>;
  count: number;
}

function buildItemStats(): Map<MovieId, ItemStats> {
  const stats = new Map<MovieId, ItemStats>();
  for (const id of movieIds) stats.set(id, { likers: new Set(), count: 0 });

  for (const user of users) {
    for (const movieId of user.movies) {
      const s = stats.get(movieId);
      if (s) s.likers.add(user.user_id);
    }
  }
  for (const s of stats.values()) s.count = s.likers.size;
  return stats;
}

/**
 * Builds the symmetric 70×70 cosine similarity matrix as nested maps.
 * Self-similarity is omitted (a movie never recommends itself).
 */
function buildSimilarityMatrix(stats: Map<MovieId, ItemStats>): Map<MovieId, Map<MovieId, number>> {
  const matrix = new Map<MovieId, Map<MovieId, number>>();
  for (const id of movieIds) matrix.set(id, new Map());

  for (let a = 0; a < movieIds.length; a++) {
    for (let b = a + 1; b < movieIds.length; b++) {
      const idA = movieIds[a]!;
      const idB = movieIds[b]!;
      const sa = stats.get(idA)!;
      const sb = stats.get(idB)!;
      if (sa.count === 0 || sb.count === 0) continue;

      // Intersect by iterating the smaller set.
      const [small, large] = sa.count <= sb.count ? [sa, sb] : [sb, sa];
      let overlap = 0;
      for (const user of small.likers) if (large.likers.has(user)) overlap++;
      if (overlap === 0) continue;

      const sim = overlap / (Math.sqrt(sa.count) * Math.sqrt(sb.count));
      matrix.get(idA)!.set(idB, sim);
      matrix.get(idB)!.set(idA, sim);
    }
  }
  return matrix;
}

// Precompute once at module load — reused across every request.
const itemStats = buildItemStats();
const similarity = buildSimilarityMatrix(itemStats);

/** Movies ranked by raw popularity, used for cold-start / fallback. */
const popularityRanked: MovieId[] = [...movieIds].sort(
  (a, b) => (itemStats.get(b)?.count ?? 0) - (itemStats.get(a)?.count ?? 0),
);

/** Total likes for a movie — exposed for popularity-aware UI if needed. */
export function likeCount(id: MovieId): number {
  return itemStats.get(id)?.count ?? 0;
}

function popularityFallback(exclude: Set<MovieId>, limit: number): ScoredRecommendation[] {
  const maxCount = itemStats.get(popularityRanked[0]!)?.count ?? 1;
  return popularityRanked
    .filter((id) => !exclude.has(id))
    .slice(0, limit)
    .map((id) => ({
      id,
      score: likeCount(id),
      matchPercent: Math.round((likeCount(id) / maxCount) * 100),
      because: [],
    }));
}

/**
 * Recommends movies for a set of liked IDs.
 *
 * - Unknown / out-of-range IDs are ignored.
 * - Already-liked movies are never recommended.
 * - With no usable signal (0 liked, or liked movies with no neighbours) it
 *   falls back to the most popular unseen movies.
 *
 * Returns scored recommendations (without TMDb enrichment); the API layer adds
 * assets. `fallback` is surfaced via the returned `isFallback` flag.
 */
export function recommend(
  rawLikedIds: MovieId[],
  limit = 12,
): { recommendations: ScoredRecommendation[]; isFallback: boolean } {
  const liked = new Set<MovieId>();
  for (const id of rawLikedIds) {
    if (catalogById.has(id)) liked.add(id);
  }

  if (liked.size === 0) {
    return { recommendations: popularityFallback(liked, limit), isFallback: true };
  }

  // Accumulate each candidate's summed similarity and track top contributors.
  const scores = new Map<MovieId, number>();
  const contributors = new Map<MovieId, ReasonMovie[]>();

  for (const likedId of liked) {
    const neighbours = similarity.get(likedId);
    if (!neighbours) continue;
    for (const [candidateId, sim] of neighbours) {
      if (liked.has(candidateId)) continue;
      scores.set(candidateId, (scores.get(candidateId) ?? 0) + sim);

      const reasons = contributors.get(candidateId) ?? [];
      reasons.push({
        id: likedId,
        title: catalogById.get(likedId)?.title ?? String(likedId),
        similarity: sim,
      });
      contributors.set(candidateId, reasons);
    }
  }

  if (scores.size === 0) {
    return { recommendations: popularityFallback(liked, limit), isFallback: true };
  }

  const maxScore = Math.max(...scores.values());

  const recommendations: ScoredRecommendation[] = [...scores.entries()]
    .map(([id, score]): ScoredRecommendation => {
      const because = (contributors.get(id) ?? [])
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, MAX_REASONS);
      return {
        id,
        score,
        // Relative match: strongest candidate ≈ 100%, the rest scaled against it.
        matchPercent: Math.round((score / maxScore) * 100),
        because,
      };
    })
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .slice(0, limit);

  return { recommendations, isFallback: false };
}
