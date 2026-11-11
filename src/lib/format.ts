import Decimal from "decimal.js";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";

export function toEnDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const fa = FA.indexOf(ch);
    if (fa >= 0) return String(fa);
    const ar = AR.indexOf(ch);
    return ar >= 0 ? String(ar) : ch;
  });
}

export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (digit) => FA[Number(digit)]);
}

export function formatInt(value: bigint | number): string {
  const v = typeof value === "bigint" ? value : BigInt(Math.trunc(value));
  const neg = v < 0n;
  const abs = (neg ? -v : v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return toFaDigits(`${neg ? "−" : ""}${abs}`);
}

export function formatRial(value: bigint | number | string): string {
  return formatInt(typeof value === "bigint" ? value : BigInt(value));
}

function asDecimal(value: Decimal.Value): Decimal {
  if (typeof value === "string") {
    const cleaned = toEnDigits(value).replaceAll("−", "-").replaceAll("٬", "").replaceAll(",", "").replaceAll("٫", ".").trim();
    return new Decimal(cleaned);
  }
  return new Decimal(value);
}

export function formatWeight(value: Decimal.Value): string {
  const d = asDecimal(value).toDecimalPlaces(3);
  const neg = d.isNeg();
  const [whole, frac] = d.abs().toFixed(3).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return toFaDigits(`${neg ? "−" : ""}${grouped}.${frac}`);
}

export function formatAyar(value: Decimal.Value): string {
  return toFaDigits(asDecimal(value).toDecimalPlaces(2).toFixed(2));
}

export function formatCount(value: number): string {
  return toFaDigits(String(value));
}

/**
 * مبلغ و وزن را می‌پذیرد.
 * یک ممیز `/` با یک تا سه رقم اعشار، جداکنندهٔ اعشار است (۷۰/۵۳).
 * چند `/` جداکنندهٔ هزارگان است (۱۵۹/۰۰۰/۰۰۰).
 */
export function parseAmount(input: string): number {
  let s = toEnDigits(input).trim().replaceAll(" ", "").replaceAll("٬", "").replaceAll("،", "").replaceAll("_", "");
  if (!s) throw new Error("عدد را وارد کنید");
  const slashes = s.split("/");
  if (slashes.length === 2 && slashes[1].length > 0 && slashes[1].length <= 3 && !s.includes(".") && !s.includes("٫")) {
    s = `${slashes[0]}.${slashes[1]}`;
  } else {
    s = s.replaceAll("/", "").replaceAll(",", "");
  }
  s = s.replaceAll("٫", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error("عدد نامعتبر است");
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error("عدد نامعتبر است");
  return n;
}

export function parseRial(input: string): bigint {
  const n = parseAmount(input);
  if (n < 0) throw new Error("مبلغ منفی مجاز نیست");
  return BigInt(new Decimal(n).toDecimalPlaces(0).toFixed(0));
}

export type BalanceSide = "zero" | "debit" | "credit";

export function gramBalance(value: Decimal.Value): { side: BalanceSide; abs: string; label: string } {
  const d = asDecimal(value);
  if (d.abs().lt("0.0005")) return { side: "zero", abs: formatWeight(0), label: "صفر" };
  if (d.gt(0)) return { side: "debit", abs: formatWeight(d), label: "بدهکار" };
  return { side: "credit", abs: formatWeight(d.neg()), label: "بستانکار" };
}

export function rialBalance(value: bigint | string | number): { side: BalanceSide; abs: string; label: string } {
  const v = typeof value === "bigint" ? value : BigInt(value);
  if (v === 0n) return { side: "zero", abs: formatRial(0), label: "صفر" };
  if (v > 0n) return { side: "debit", abs: formatRial(v), label: "بدهکار" };
  return { side: "credit", abs: formatRial(-v), label: "بستانکار" };
}

export function tomanOf(value: bigint): bigint {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const toman = abs / 10n;
  return neg ? -toman : toman;
}
