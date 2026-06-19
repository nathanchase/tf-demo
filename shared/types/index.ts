/**
 * Shared type definitions used by both the Nuxt app (`app/`) and the Nitro
 * server (`server/`). Nothing here should be redeclared locally.
 */

// ----------------------------------------------------------------------------
// Raw dataset (`app/assets/movies.json`)
// ----------------------------------------------------------------------------

/** Numeric movie identifier (1–70). Stored as a string key in the raw file. */
export type MovieId = number;

/** A single user's implicit, binary preferences as they appear on disk. */
export interface RawUser {
  user_id: number;

  /** IDs of the movies this user liked. */
  movies: number[];
}

/** Exact shape of `movies.json`. Note `movies` keys are strings. */
export interface MoviesDataset {
  movies: Record<string, string>;
  users: RawUser[];
}

// ----------------------------------------------------------------------------
// Normalized catalog
// ----------------------------------------------------------------------------

/** A catalog entry after IDs are coerced and the title is parsed. */
export interface CatalogMovie {
  id: MovieId;

  /** Display title with any inverted article restored (e.g. "The Usual Suspects"). */
  title: string;

  /** Release year parsed from the raw title, or null if absent. */
  year: number | null;

  /** Original, unparsed string from the dataset (e.g. "Usual Suspects, The (1995)"). */
  raw: string;
}

// ----------------------------------------------------------------------------
// TMDb enrichment
// ----------------------------------------------------------------------------

/** Visual + descriptive assets resolved from TMDb for a catalog movie. */
export interface TmdbAssets {
  tmdbId: number;
  posterUrl: string | null;
  backdropUrl: string | null;

  /** Title logo (PNG, transparent) when available. */
  logoUrl: string | null;
  overview: string | null;
  genres: string[];

  /** TMDb vote average, 0–10. */
  rating: number | null;

  /** Canonical TMDb title (may differ slightly from the catalog title). */
  tmdbTitle: string | null;
}

/** A catalog movie plus optional TMDb assets (absent if lookup failed). */
export interface EnrichedMovie extends CatalogMovie {
  tmdb: TmdbAssets | null;
}

// ----------------------------------------------------------------------------
// Recommendation engine
// ----------------------------------------------------------------------------

/** One movie that contributed to a recommendation, with its similarity. */
export interface ReasonMovie {
  id: MovieId;
  title: string;

  /** Cosine similarity between this liked movie and the recommended one (0–1). */
  similarity: number;
}

/** A scored recommendation produced by the engine (pre-enrichment). */
export interface ScoredRecommendation {
  id: MovieId;

  /** Summed cosine-similarity score against the user's liked set. */
  score: number;

  /** Score mapped to a 0–100 "match" indicator for display. */
  matchPercent: number;

  /** Strongest contributing liked movies, for the "because you liked…" reason. */
  because: ReasonMovie[];
}

/** A recommendation enriched with the full movie + TMDb assets, for the client. */
export interface Recommendation extends ScoredRecommendation {
  movie: EnrichedMovie;
}

// ----------------------------------------------------------------------------
// API contracts (BFF)
// ----------------------------------------------------------------------------

/** Response of `GET /api/movies`. */
export interface MoviesResponse {
  movies: EnrichedMovie[];
}

/** Body of `POST /api/recommendations`. */
export interface RecommendationsRequest {
  /** Movie IDs the visitor has marked as liked. */
  likedIds: MovieId[];

  /** Max recommendations to return (default 12). */
  limit?: number;
}

/** Response of `POST /api/recommendations`. */
export interface RecommendationsResponse {
  recommendations: Recommendation[];

  /** Echo of the liked IDs the recommendations were based on. */
  basedOn: MovieId[];

  /** True when results are a popularity fallback (no/insufficient signal). */
  fallback: boolean;
}
