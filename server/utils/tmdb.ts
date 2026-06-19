import type { EnrichedMovie } from "#shared/types";
import enrichedCatalog from "./enriched-catalog.json";

/**
 * Serves the TMDb-enriched catalog.
 *
 * The catalog is a fixed set of 70 films, so its TMDb assets (poster, backdrop,
 * logo, overview, genres, rating) are resolved ONCE at build time by
 * `scripts/generate-catalog.mjs` and committed to `enriched-catalog.json`. The
 * server simply returns that static data:
 *   - zero runtime TMDb calls (no Cloudflare sub-request limits),
 *   - no runtime API key needed,
 *   - no dependency on `$fetch`/`fetch` (which the Nuxt dev SSR layer patches).
 *
 * To refresh the data (e.g. new artwork or catalog changes):
 *   TMDB_API_KEY=xxxx node scripts/generate-catalog.mjs
 */
export function getEnrichedCatalog(): EnrichedMovie[] {
  return enrichedCatalog as unknown as EnrichedMovie[];
}
