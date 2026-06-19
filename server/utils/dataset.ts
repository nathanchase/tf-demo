import type { CatalogMovie, MovieId, MoviesDataset, RawUser } from "~~/shared/types";
import rawData from "../../app/assets/movies.json";

/**
 * Loads, normalizes and validates the static dataset once at module load.
 *
 * The raw file is awkward in two ways the rest of the app shouldn't have to
 * think about: movie IDs are string keys under `movies` but numbers inside each
 * user's `movies` array, and titles bake in the year plus an inverted article
 * ("Usual Suspects, The (1995)"). We fix both here.
 */

const data = rawData as MoviesDataset;

/** Leading articles that get moved to the end in the source titles. */
const TRAILING_ARTICLES = new Set([
  "the",
  "a",
  "an",
  "la",
  "le",
  "les",
  "l", // French (l' handled specially)
  "il",
  "lo",
  "gli",
  "i", // Italian
  "el",
  "los",
  "las",
  "un",
  "una", // Spanish
  "der",
  "die",
  "das",
  "den",
  "ein",
  "eine", // German
]);

/**
 * Parses a raw catalog title like `"Usual Suspects, The (1995)"` into a clean
 * display title and year. The de-inverted article is needed for accurate TMDb
 * matching ("The Usual Suspects" searches far better than "Usual Suspects, The").
 */
export function parseTitle(raw: string): { title: string; year: number | null } {
  let working = raw.trim();
  let year: number | null = null;

  // Pull the trailing "(YYYY)" if present.
  const yearMatch = working.match(/\((\d{4})\)\s*$/);
  if (yearMatch) {
    year = Number(yearMatch[1]);
    working = working.slice(0, yearMatch.index).trim();
  }

  // De-invert a trailing article: "Godfather, The" -> "The Godfather".
  const commaIdx = working.lastIndexOf(", ");
  if (commaIdx !== -1) {
    const tail = working.slice(commaIdx + 2).trim();
    const normalized = tail.replace(/'$/, "").toLowerCase();
    if (TRAILING_ARTICLES.has(normalized)) {
      const head = working.slice(0, commaIdx).trim();
      // "L'" attaches with no space ("L'America"); others get a space.
      working = tail.endsWith("'") ? `${tail}${head}` : `${tail} ${head}`;
    }
  }

  return { title: working, year };
}

/** The normalized catalog, ordered by ID. */
export const catalog: CatalogMovie[] = Object.entries(data.movies)
  .map(([id, raw]): CatalogMovie => {
    const { title, year } = parseTitle(raw);
    return { id: Number(id), title, year, raw };
  })
  .sort((a, b) => a.id - b.id);

/** Fast lookup from ID to catalog entry. */
export const catalogById: ReadonlyMap<MovieId, CatalogMovie> = new Map(
  catalog.map((m) => [m.id, m]),
);

/** All user preference rows. */
export const users: RawUser[] = data.users;

/** Sorted list of every valid movie ID. */
export const movieIds: MovieId[] = catalog.map((m) => m.id);

// Dev-time sanity checks: fail loudly if the dataset drifts from expectations.
if (import.meta.dev) {
  const ids = new Set(movieIds);
  const referenced = new Set<number>();
  for (const u of users) for (const m of u.movies) referenced.add(m);
  const orphans = [...referenced].filter((id) => !ids.has(id));
  if (orphans.length) {
    console.warn("[dataset] user preferences reference unknown movie IDs:", orphans);
  }
  console.info(`[dataset] loaded ${catalog.length} movies, ${users.length} users`);
}
