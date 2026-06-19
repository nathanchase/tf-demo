/**
 * Persists the visitor's selection to localStorage and rehydrates it on load,
 * so picks survive a refresh. Client-only — there is no server-side storage.
 */
const STORAGE_KEY = "reelpicks:selection";

export default defineNuxtPlugin(() => {
  const { selected } = useSelection();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) selected.value = parsed.filter((x) => Number.isInteger(x));
    }
  } catch {
    // Corrupt/blocked storage — start fresh, no-op.
  }

  watch(
    selected,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // Storage full or unavailable — selection still works in-memory.
      }
    },
    { deep: true },
  );
});
