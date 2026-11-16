import { toEnDigits } from "@/lib/format";

export type PersonLike = { id: string; code: number; title: string; phone?: string; mobile?: string };

/** ی/ک عربی و فاصلهٔ مجازی را یکی می‌کند تا جستجوی ناقص اسم گیر نکند. */
export function foldFa(input: string): string {
  return toEnDigits(input)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ةۀ]/g, "ه")
    .replace(/\u200c/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function filterPeople<T extends PersonLike>(people: T[], query: string): T[] {
  const q = foldFa(query.trim());
  if (!q) return people;
  const digits = q.replace(/\D/g, "");
  const scored: { person: T; score: number }[] = [];
  for (const person of people) {
    const code = String(person.code);
    const title = foldFa(person.title);
    let score = 0;
    if (digits && code === digits && q === digits) score = 100;
    else if (digits && code.startsWith(digits) && q === digits) score = 80;
    if (title.startsWith(q)) score = Math.max(score, 60);
    else if (title.includes(q)) score = Math.max(score, 40);
    if (digits.length >= 4) {
      const phones = foldFa(`${person.mobile ?? ""}${person.phone ?? ""}`).replace(/\D/g, "");
      if (phones.includes(digits)) score = Math.max(score, phones.startsWith(digits) ? 70 : 55);
    }
    if (!score) continue;
    scored.push({ person, score });
  }
  scored.sort((a, b) => b.score - a.score || a.person.code - b.person.code);
  return scored.map((row) => row.person);
}
