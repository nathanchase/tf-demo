import type { RecommendationsResponse } from "~~/shared/types";

/**
 * Fetches recommendations from the BFF whenever the selection changes,
 * debounced so rapid toggling collapses into a single request. Intended to be
 * used once, on the main page.
 */
export function useRecommendations(limit = 12) {
  const { selected } = useSelection();

  const data = ref<RecommendationsResponse | null>(null);
  const pending = ref(false);
  const error = ref(false);

  let timer: ReturnType<typeof setTimeout> | undefined;
  let requestId = 0;

  async function run() {
    if (selected.value.length === 0) {
      data.value = null;
      pending.value = false;
      return;
    }

    const id = ++requestId;
    pending.value = true;
    error.value = false;
    try {
      const res = await $fetch<RecommendationsResponse>("/api/recommendations", {
        method: "POST",
        body: { likedIds: selected.value, limit },
      });
      if (id === requestId) data.value = res; // ignore out-of-order responses
    } catch {
      if (id === requestId) error.value = true;
    } finally {
      if (id === requestId) pending.value = false;
    }
  }

  watch(
    selected,
    () => {
      clearTimeout(timer);
      timer = setTimeout(run, 300);
    },
    { deep: true, immediate: true },
  );

  return { data, pending, error, refresh: run };
}
