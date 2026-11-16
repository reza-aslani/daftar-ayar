import type { DocumentKind } from "@prisma/client";
import Decimal from "decimal.js";
import { mesghalToGramFactor } from "@/lib/accounting";
import { formatAyar, formatCount, formatRial, formatWeight, gramBalance, rialBalance, toEnDigits, toFaDigits } from "@/lib/format";
import { COIN_OP_LABEL, DOC_LABEL, KIND_LABEL } from "@/lib/labels";

export type InvoicePaper = "receipt" | "a5" | "a4";

export const PAPER_OPTIONS: { id: InvoicePaper; label: string }[] = [
  { id: "receipt", label: "رسید ۸۰ میلی‌متر" },
  { id: "a5", label: "A5" },
  { id: "a4", label: "A4" },
];

export function parseInvoicePaper(value: string | null | undefined, fallback: InvoicePaper = "a5"): InvoicePaper {
  if (value === "receipt" || value === "a5" || value === "a4") return value;
  return fallback;
}

export type InvoiceSourceRow = {
  id: string;
  lineNo: number;
  accountId: string;
  accountTitle: string;
  direction: "IN" | "OUT";
  rowKind: "GOLD" | "RIAL" | "COIN" | "ADJUSTMENT" | "NOTE";
  description: string;
  goldKind: "MOTAFARREQE" | "ABSHODE" | null;
  pieceLabel: string | null;
  ang: string;
  scaleWeight: string | null;
  ayar: string | null;
  weight750: string | null;
  amountRial: string | null;
  count: number | null;
  unitPrice: string | null;
  coinName: string | null;
  coinOp: "BUY" | "SELL" | "RECEIVE" | "PAY" | null;
  gramDelta: string;
  rialDelta: string;
};

export type InvoiceLine = {
  id: string;
  title: string;
  weight: string | null;
  weight750: string | null;
  ayar: string | null;
  priceLabel: string | null;
  price: string | null;
  priceExtra: string | null;
  /** «در مبلغ» یعنی اجرت و سود جدا نیست و داخل مبلغ طلا آمده است. */
  wage: string | null;
  amount: string | null;
  side: string | null;
};

export type BalancePair = { rial: string; gram: string };

export type InvoiceShare = {
  title: string;
  text: string;
  brief: string;
  url: string;
  phone: string;
};

export type InvoiceDocument = {
  id: string;
  number: number;
  numberLabel: string;
  barcode: string;
  kind: DocumentKind;
  kindLabel: string;
  description: string;
  dateLabel: string;
  timeLabel: string;
  voided: boolean;
  voidLabel: string | null;
  createdByName: string;
  shopName: string;
  footer: string;
  paper: InvoicePaper;
  accountId: string;
  accountTitle: string;
  accountCodeLabel: string;
  groupLabel: string;
  phone: string;
  asset: boolean;
  lines: InvoiceLine[];
  ledger: InvoiceSourceRow[];
  wageMerged: boolean;
  tradeAmount: string | null;
  receivedAmount: string | null;
  paidAmount: string | null;
  before: BalancePair;
  after: BalancePair;
  share: InvoiceShare;
};

const MONEY_KINDS = new Set<DocumentKind>(["CASH", "GOLD_BUY", "GOLD_SELL", "COIN", "TRANSFER"]);

function money(value: bigint): string | null {
  if (value === 0n) return null;
  return formatRial(value < 0n ? -value : value);
}

export function rialPhrase(value: string, asset: boolean): string {
  const view = rialBalance(value);
  if (view.side === "zero") return "صفر ریال";
  const label = asset ? (view.side === "debit" ? "موجودی" : "کسری") : view.label;
  return `${label} ${view.abs} ریال`;
}

export function gramPhrase(value: string): string {
  const view = gramBalance(value);
  if (view.side === "zero") return "صفر گرم";
  return `${view.label} ${view.abs} گرم`;
}

export function normalizeIranMobile(phone: string): string | null {
  let digits = toEnDigits(phone).replace(/\D/g, "");
  if (digits.startsWith("0098")) digits = digits.slice(4);
  else if (digits.startsWith("98") && digits.length >= 12) digits = digits.slice(0, 12);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10 && digits.startsWith("9")) return `98${digits}`;
  if (digits.length === 12 && digits.startsWith("98")) return digits;
  return null;
}

export function whatsAppHref(brief: string, url: string, phone: string): string {
  const text = encodeURIComponent(`${brief}\n${url}`.trim());
  const mobile = normalizeIranMobile(phone);
  return mobile ? `https://wa.me/${mobile}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function telegramHref(brief: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(brief)}`;
}

function sideOf(row: InvoiceSourceRow): string | null {
  const rial = BigInt(row.rialDelta);
  if (rial !== 0n) {
    const view = rialBalance(rial);
    return view.side === "zero" ? null : view.label;
  }
  const gram = gramBalance(row.gramDelta);
  return gram.side === "zero" ? null : gram.label;
}

function goldTitle(row: InvoiceSourceRow, kind: DocumentKind): string {
  if (row.description.startsWith("مانده از قبل")) return row.description;
  const metal = row.goldKind ? KIND_LABEL[row.goldKind] : "طلا";
  const code = row.pieceLabel ? ` ${row.pieceLabel}` : "";
  const ang = row.ang.trim() ? ` · ${row.ang.trim()}` : "";
  const conditional = row.description.includes("شرطی") ? " شرطی" : "";
  let verb = "طلا";
  if (kind === "GOLD_SELL" && row.lineNo === 1) verb = "فروش";
  else if (kind === "GOLD_BUY" && row.lineNo === 1) verb = "خرید";
  else if (row.description.startsWith("خرید")) verb = "خرید";
  else if (row.description.startsWith("خروج")) verb = "خروج";
  else if (row.description.startsWith("ورود")) verb = "ورود";
  else if (row.description.startsWith("دریافت از ذوب")) verb = "برگشت ذوب";
  else if (row.description.startsWith("دریافت")) verb = "دریافت";
  else if (row.description.startsWith("پرداخت")) verb = "پرداخت";
  return `${verb} ${metal}${conditional}${code}${ang}`;
}

function cashTitle(row: InvoiceSourceRow): string {
  const text = row.description;
  if (text.startsWith("حواله")) return "حواله";
  if (text.startsWith("مانده از قبل") || text.startsWith("موجودی") || text.startsWith("سرمایه")) return text;
  const received = BigInt(row.rialDelta) < 0n;
  if (text.includes("تسویه نقد") || (text.includes("صندوق") && text.includes("نقد"))) return received ? "دریافت نقد" : "پرداخت نقد";
  if (text.startsWith("تسویه ")) {
    const name = text.replace(/^تسویه\s+/, "").split(/\s+[\d۰-۹]/)[0]?.trim() || "بانک";
    return received ? `دریافت ${name}` : `پرداخت ${name}`;
  }
  if (text.startsWith("دریافت")) return "دریافت وجه";
  if (text.startsWith("پرداخت")) return "پرداخت وجه";
  return text;
}

function coinTitle(row: InvoiceSourceRow): string {
  if (row.description.startsWith("مانده از قبل")) return row.description;
  const op = row.coinOp ? COIN_OP_LABEL[row.coinOp] : "سکه";
  const count = row.count ? `${formatCount(row.count)} عدد ` : "";
  const name = row.coinName ?? "سکه";
  const settle = row.description.startsWith("دریافت سکه بابت تسویه") || row.description.startsWith("پرداخت سکه بابت تسویه") ? " بابت تسویه" : "";
  return `${op} ${count}${name}${settle}`;
}

function isSettlement(row: InvoiceSourceRow, kind: DocumentKind): boolean {
  if (row.rowKind === "RIAL") return true;
  if (row.description.startsWith("دریافت سکه بابت تسویه") || row.description.startsWith("پرداخت سکه بابت تسویه") || row.description.startsWith("دریافت در تسویه")) {
    return true;
  }
  if ((kind === "GOLD_BUY" || kind === "GOLD_SELL" || kind === "COIN") && row.lineNo > 1 && (row.rowKind === "GOLD" || row.rowKind === "COIN")) {
    return true;
  }
  return false;
}

function goldQuote(amount: bigint, weight750: string, factor: Decimal): { price: string; extra: string } | null {
  const weight = new Decimal(weight750);
  if (amount <= 0n || weight.lte(0)) return null;
  const gram = new Decimal(amount.toString()).div(weight);
  const mesghal = gram.mul(factor).toDecimalPlaces(0);
  return {
    price: formatRial(BigInt(mesghal.toFixed(0))),
    extra: `فی گرم ${formatRial(BigInt(gram.toDecimalPlaces(0).toFixed(0)))}`,
  };
}

function lineFrom(row: InvoiceSourceRow, kind: DocumentKind, factor: Decimal): InvoiceLine {
  const amount = row.amountRial && BigInt(row.amountRial) > 0n ? formatRial(BigInt(row.amountRial)) : null;
  const base = {
    id: row.id,
    weight: row.scaleWeight ? formatWeight(row.scaleWeight) : null,
    weight750: row.weight750 ? formatWeight(row.weight750) : null,
    ayar: row.ayar ? formatAyar(row.ayar) : null,
    priceLabel: null as string | null,
    price: null as string | null,
    priceExtra: null as string | null,
    wage: null as string | null,
    amount,
    side: sideOf(row),
  };
  if (row.rowKind === "GOLD") {
    const quote = row.amountRial && row.weight750 ? goldQuote(BigInt(row.amountRial), row.weight750, factor) : null;
    return {
      ...base,
      title: goldTitle(row, kind),
      priceLabel: quote ? "مظنه مثقال" : null,
      price: quote?.price ?? null,
      priceExtra: quote?.extra ?? null,
      wage: quote ? "در مبلغ" : null,
    };
  }
  if (row.rowKind === "COIN") {
    const unit = row.unitPrice && BigInt(row.unitPrice) > 0n ? formatRial(BigInt(row.unitPrice)) : null;
    return {
      ...base,
      title: coinTitle(row),
      weight: null,
      priceLabel: unit ? "فی عدد" : null,
      price: unit,
    };
  }
  if (row.rowKind === "RIAL") return { ...base, title: cashTitle(row), weight: null, weight750: null, ayar: null };
  return { ...base, title: row.description };
}

export function buildInvoice(input: {
  id: string;
  number: number;
  kind: DocumentKind;
  description: string;
  dateLabel: string;
  timeLabel: string;
  voided: boolean;
  voidLabel: string | null;
  createdByName: string;
  shopName: string;
  footer: string;
  paper: InvoicePaper;
  accountId: string;
  accountTitle: string;
  accountCode: number;
  groupLabel: string;
  phone: string;
  asset: boolean;
  rows: InvoiceSourceRow[];
  beforeRial: string;
  beforeGram: string;
  mesghalGrams: string;
  mesghalAyar: string;
  standardAyar: string;
  url: string;
}): InvoiceDocument {
  const party = input.rows.filter((row) => row.accountId === input.accountId);
  const shown = party.length ? party : input.rows;
  const factor = mesghalToGramFactor(input.mesghalGrams, input.mesghalAyar, input.standardAyar);
  const lines = shown.map((row) => lineFrom(row, input.kind, factor));
  let trade = 0n;
  let received = 0n;
  let paid = 0n;
  let effectRial = 0n;
  let effectGram = new Decimal(0);
  for (const row of shown) {
    effectRial += BigInt(row.rialDelta);
    effectGram = effectGram.plus(row.gramDelta || "0");
    const amount = row.amountRial ? BigInt(row.amountRial) : 0n;
    if (amount <= 0n) continue;
    if (!isSettlement(row, input.kind) && (row.rowKind === "GOLD" || row.rowKind === "COIN")) trade += amount;
    else if (BigInt(row.rialDelta) < 0n) received += amount;
    else if (BigInt(row.rialDelta) > 0n) paid += amount;
  }
  const before = { rial: input.beforeRial, gram: input.beforeGram };
  const after = input.voided
    ? before
    : { rial: (BigInt(input.beforeRial) + effectRial).toString(), gram: new Decimal(input.beforeGram).plus(effectGram).toFixed(3) };
  const showTotals = !input.asset && MONEY_KINDS.has(input.kind);
  const wageMerged = lines.some((line) => line.wage === "در مبلغ");
  const phone = input.phone.trim() ? toFaDigits(input.phone.trim()) : "";
  const numberLabel = toFaDigits(input.number);
  const codeLabel = toFaDigits(input.accountCode);
  const fullLines = lines.map((line) => {
    const bits = [line.title];
    if (line.weight) bits.push(`وزن ${line.weight} گرم`);
    if (line.ayar) bits.push(`عیار ${line.ayar}`);
    if (line.price) bits.push(`${line.priceLabel} ${line.price}`);
    if (line.amount) bits.push(`مبلغ ${line.amount} ریال${line.side ? ` ${line.side}` : ""}`);
    return bits.join(" · ");
  });
  const balanceLines = [
    `مانده قبل: ${rialPhrase(before.rial, input.asset)} · ${gramPhrase(before.gram)}`,
    `مانده بعد: ${rialPhrase(after.rial, input.asset)} · ${gramPhrase(after.gram)}`,
  ];
  const text = [
    input.shopName,
    `فاکتور ${numberLabel} · ${DOC_LABEL[input.kind]}`,
    `${input.dateLabel} · ${input.timeLabel}`,
    `${input.accountTitle} · کد ${codeLabel}`,
    "",
    ...fullLines,
    "",
    input.voided ? "این سند ابطال شده و در مانده اثر ندارد." : null,
    ...balanceLines,
    input.footer.trim() || null,
    input.url,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
  const brief = [
    input.shopName,
    `فاکتور ${numberLabel} · ${DOC_LABEL[input.kind]}`,
    input.dateLabel,
    `${input.accountTitle} · کد ${codeLabel}`,
    `مانده حساب: ${rialPhrase(after.rial, input.asset)}`,
    gramPhrase(after.gram),
    input.voided ? "این سند ابطال شده و در مانده اثر ندارد." : null,
    input.footer.trim() || null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
  return {
    id: input.id,
    number: input.number,
    numberLabel,
    barcode: String(input.number),
    kind: input.kind,
    kindLabel: DOC_LABEL[input.kind],
    description: input.description,
    dateLabel: input.dateLabel,
    timeLabel: input.timeLabel,
    voided: input.voided,
    voidLabel: input.voidLabel,
    createdByName: input.createdByName,
    shopName: input.shopName,
    footer: input.footer.trim(),
    paper: input.paper,
    accountId: input.accountId,
    accountTitle: input.accountTitle,
    accountCodeLabel: codeLabel,
    groupLabel: input.groupLabel,
    phone,
    asset: input.asset,
    lines,
    ledger: input.rows,
    wageMerged,
    tradeAmount: showTotals ? money(trade) : null,
    receivedAmount: showTotals ? money(received) : null,
    paidAmount: showTotals ? money(paid) : null,
    before,
    after,
    share: {
      title: `${input.shopName} · فاکتور ${numberLabel}`,
      text,
      brief,
      url: input.url,
      phone: input.phone,
    },
  };
}
