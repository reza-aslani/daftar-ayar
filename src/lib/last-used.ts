const KEY = "daftar-ayar.last.v1";

type MemoryStorage = Pick<Storage, "getItem" | "setItem">;

export function readLast(storage: Pick<Storage, "getItem"> | null, form: string): Record<string, string> {
  if (!storage) return {};
  try {
    const parsed = JSON.parse(storage.getItem(KEY) || "{}") as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const row = (parsed as Record<string, unknown>)[form];
    if (!row || typeof row !== "object") return {};
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(row)) {
      if (typeof value === "string") out[name] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeLast(storage: MemoryStorage, form: string, values: Record<string, string>) {
  let all: Record<string, Record<string, string>> = {};
  try {
    const parsed = JSON.parse(storage.getItem(KEY) || "{}") as unknown;
    if (parsed && typeof parsed === "object") all = parsed as Record<string, Record<string, string>>;
  } catch {
    all = {};
  }
  all[form] = values;
  storage.setItem(KEY, JSON.stringify(all));
}

export function loadLast(form: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  return readLast(window.localStorage, form);
}

export function saveLast(form: string, values: Record<string, string>) {
  if (typeof window === "undefined") return;
  writeLast(window.localStorage, form, values);
}
