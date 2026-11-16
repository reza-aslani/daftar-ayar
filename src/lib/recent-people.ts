const KEY = "daftar-ayar-recent-people";

export type RecentPerson = {
  id: string;
  code: number;
  title: string;
  group: string;
  groupLabel: string;
};

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };

function browserStore(): Store | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecent(value: unknown): value is RecentPerson {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<RecentPerson>;
  return (
    typeof row.id === "string" &&
    typeof row.code === "number" &&
    typeof row.title === "string" &&
    typeof row.group === "string" &&
    typeof row.groupLabel === "string"
  );
}

export function readRecent(storage: Store | null = browserStore()): RecentPerson[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecent).slice(0, 8);
  } catch {
    return [];
  }
}

export function rememberPerson(person: RecentPerson, storage: Store | null = browserStore()) {
  if (!storage) return;
  const next = [person, ...readRecent(storage).filter((item) => item.id !== person.id)].slice(0, 8);
  storage.setItem(KEY, JSON.stringify(next));
}
