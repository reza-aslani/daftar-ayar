import { foldFa } from "@/lib/person-match";

const MAX_DOC_NUMBER = 2_000_000_000;

/** رقم‌های فارسی و عربی را انگلیسی می‌کند. اگر کل عبارت عدد نباشد، null. */
export function digitQuery(input: string): string | null {
  const folded = foldFa(input.trim());
  if (!/^\d+$/.test(folded)) return null;
  const digits = folded.replace(/^0+(?=\d)/, "");
  if (digits.length > 9) return null;
  return digits;
}

/**
 * بازه‌های شمارهٔ سند برای یک پیشوند.
 * «۱۲» خودِ ۱۲ و شماره‌هایی مثل ۱۲۰ و ۱۲۰۰ را هم می‌گیرد.
 */
export function documentNumberRanges(digits: string): { gte: number; lte: number }[] {
  if (!/^\d+$/.test(digits)) return [];
  const n = Number(digits);
  if (!Number.isSafeInteger(n) || n < 0 || n > MAX_DOC_NUMBER) return [];
  if (n === 0) return [{ gte: 0, lte: 0 }];
  const ranges: { gte: number; lte: number }[] = [{ gte: n, lte: n }];
  let width = 10;
  for (let extra = 1; extra <= 6; extra += 1) {
    const gte = n * width;
    if (!Number.isSafeInteger(gte) || gte > MAX_DOC_NUMBER) break;
    const next = (n + 1) * width;
    if (!Number.isSafeInteger(next)) break;
    const lte = Math.min(next - 1, MAX_DOC_NUMBER);
    if (gte <= lte) ranges.push({ gte, lte });
    width *= 10;
  }
  return ranges;
}
