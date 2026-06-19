/**
 * Persists the visitor's selection to localStorage and rehydrates it on load,
 * so picks survive a refresh. Client-only — there is no server-side storage.
 *
 * The stored selection is applied AFTER hydration (`app:mounted`). The server
 * renders with an empty selection (it can't read localStorage), so setting it
 * during plugin init — before hydration — would cause a hydration mismatch and
 * Vue would keep the server's markup (liked cards stay unchecked). Applying it
 * post-hydration is a normal reactive update that patches the DOM correctly.
 */
const STORAGE_KEY = "reelpicks:selection";

export default defineNuxtPlugin((nuxtApp) => {
  const { selected } = useSelection();

  nuxtApp.hook("app:mounted", () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) selected.value = parsed.filter((x) => Number.isInteger(x));
      }
    } catch {
      // Corrupt/blocked storage — start fresh, no-op.
    }

    // Persist subsequent changes. Set up after the initial load so we never
    // clobber stored picks with the empty pre-load value.
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
});
