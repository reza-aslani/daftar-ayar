import { toEnDigits, toFaDigits } from "@/lib/format";

export type NumberKind = "money" | "decimal" | "int";

const DIGIT = /[0-9۰-۹٠-٩]/;

/** English digits only, for phone and national-id fields. */
export function normalizeDigits(input: string): string {
  return toEnDigits(input).replace(/\D/g, "");
}

/**
 * Drop trailing zeros from a stored decimal so a field can show ۷۴۰ instead of ۷۴۰٫۰۰.
 * Live typing should keep the formatter, which preserves a zero the person just typed.
 */
export function trimDecimal(input: string): string {
  let s = toEnDigits(input).trim().replace(/٬/g, "").replace(/،/g, "").replace(/٫/g, ".");
  if (s.includes("/")) return toEnDigits(input).trim();
  if (!s.includes(".")) return s;
  s = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return s;
}

function digitsOnly(input: string): string {
  return toEnDigits(input).replace(/\D/g, "");
}

type Parts = { int: string; frac: string; trailingSep: boolean };

function splitLive(input: string, kind: NumberKind): Parts {
  let s = toEnDigits(input).replace(/[٬،,\s_]/g, "");
  if (!s) return { int: "", frac: "", trailingSep: false };

  if (kind === "money" || kind === "int") {
    const dot = s.search(/[.٫]/);
    const head = dot >= 0 ? s.slice(0, dot) : s;
    const int = digitsOnly(head).replace(/^0+(?=\d)/, "");
    return { int, frac: "", trailingSep: false };
  }

  const slashCount = (s.match(/\//g) ?? []).length;
  const hasDot = s.includes(".") || s.includes("٫");
  if (slashCount > 1 && !hasDot) s = s.replace(/\//g, "");
  else s = s.replace("/", ".");
  s = s.replace("٫", ".");
  const extra = s.indexOf(".", s.indexOf(".") + 1);
  if (extra >= 0) s = s.slice(0, extra) + s.slice(extra + 1).replace(/\./g, "");

  const dot = s.indexOf(".");
  if (dot < 0) {
    return { int: digitsOnly(s).replace(/^0+(?=\d)/, ""), frac: "", trailingSep: false };
  }
  let intPart = digitsOnly(s.slice(0, dot)).replace(/^0+(?=\d)/, "");
  const frac = digitsOnly(s.slice(dot + 1));
  const trailingSep = dot === s.length - 1;
  if (!intPart && (frac || trailingSep)) intPart = "0";
  return { int: intPart, frac, trailingSep };
}

/** Persian digits and thousands separators, still accepted by parseAmount. */
export function formatNumberInput(input: string, kind: NumberKind = "decimal"): string {
  const parts = splitLive(input, kind);
  if (!parts.int && !parts.frac && !parts.trailingSep) return "";
  const grouped = parts.int.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  let out = grouped;
  if (kind === "decimal" && (parts.frac || parts.trailingSep)) out += `٫${parts.frac}`;
  return toFaDigits(out);
}

function isSignificant(ch: string): boolean {
  return DIGIT.test(ch) || ch === "." || ch === "٫" || ch === "/";
}

export function significantCount(input: string, end = input.length): number {
  let count = 0;
  const slice = input.slice(0, Math.max(0, end));
  for (const ch of slice) if (isSignificant(ch)) count += 1;
  return count;
}

export function caretAfterFormat(raw: string, formatted: string, caret: number): number {
  const wanted = significantCount(raw, caret);
  if (wanted <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (!isSignificant(formatted[i] ?? "")) continue;
    seen += 1;
    if (seen === wanted) return i + 1;
  }
  return formatted.length;
}

/**
 * Reformat a keystroke. Deleting only a thousands separator also drops the digit
 * beside it, so backspace can move through ۱٬۵۰۰.
 */
export function editNumber(prev: string, nextRaw: string, caret: number, kind: NumberKind): { text: string; caret: number } {
  let raw = nextRaw;
  let pos = caret;
  if (digitsOnly(raw) === digitsOnly(prev) && raw.length < prev.length) {
    const hole = firstDiff(prev, raw);
    let removeAt = -1;
    for (let i = hole - 1; i >= 0; i -= 1) {
      if (DIGIT.test(prev[i] ?? "")) {
        removeAt = i;
        break;
      }
    }
    if (removeAt >= 0) {
      raw = prev.slice(0, removeAt) + prev.slice(removeAt + 1);
      pos = removeAt;
    }
  }
  const text = formatNumberInput(raw, kind);
  return { text, caret: caretAfterFormat(raw, text, pos) };
}

function firstDiff(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return i;
  return n;
}
