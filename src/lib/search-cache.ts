import type { SearchDocument, SearchPerson } from "@/lib/search-types";

let generation = 0;
let people: SearchPerson[] | null = null;
let pending: Promise<SearchPerson[]> | null = null;
const listeners = new Set<(people: SearchPerson[]) => void>();

function emit() {
  if (!people) return;
  for (const listener of listeners) listener(people);
}

export function subscribeSearchPeople(listener: (people: SearchPerson[]) => void) {
  listeners.add(listener);
  if (people) listener(people);
  return () => listeners.delete(listener);
}

export function clearSearchCache() {
  generation += 1;
  people = null;
  pending = null;
}

export function invalidateSearchPeople() {
  clearSearchCache();
  void loadSearchPeople().catch(() => undefined);
}

export function loadSearchPeople(): Promise<SearchPerson[]> {
  if (people) return Promise.resolve(people);
  if (pending) return pending;
  const gen = generation;
  pending = fetch("/api/search", { headers: { accept: "application/json" }, cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("search failed");
      const body = (await response.json()) as { people?: SearchPerson[] };
      if (gen !== generation) return people ?? [];
      people = body.people ?? [];
      pending = null;
      emit();
      return people;
    })
    .catch((error: unknown) => {
      if (gen === generation) pending = null;
      throw error;
    });
  return pending;
}

export async function searchDocuments(query: string, signal?: AbortSignal): Promise<SearchDocument[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal,
  });
  if (!response.ok) return [];
  const body = (await response.json()) as { documents?: SearchDocument[] };
  return body.documents ?? [];
}
