import type { MovieId } from "~~/shared/types";

/**
 * Shared "movies I like" selection state. Backed by `useState` so it is a
 * single source of truth across components; persisted to localStorage by
 * `plugins/persist-selection.client.ts`.
 */
export function useSelection() {
  const selected = useState<MovieId[]>("selection", () => []);

  const isSelected = (id: MovieId) => selected.value.includes(id);

  const toggle = (id: MovieId) => {
    selected.value = isSelected(id)
      ? selected.value.filter((x) => x !== id)
      : [...selected.value, id];
  };

  const clear = () => {
    selected.value = [];
  };

  const count = computed(() => selected.value.length);

  return { selected, isSelected, toggle, clear, count };
}
