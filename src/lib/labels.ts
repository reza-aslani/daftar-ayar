import type { AccountGroup, DocumentKind, GoldKind } from "@prisma/client";
import Decimal from "decimal.js";
import { formatAyar, formatCount, formatRial, formatWeight } from "@/lib/format";

export const GROUP_LABEL: Record<AccountGroup, string> = {
  CUSTOMER: "مشتری",
  MAKER: "سازنده",
  BANK: "بانک",
  CASH: "صندوق",
  EXPENSE: "هزینه / سوخت",
  INVESTOR: "سرمایه‌گذار",
};

export const KIND_LABEL: Record<GoldKind, string> = {
  MOTAFARREQE: "متفرقه",
  ABSHODE: "آبشده",
};

export const DOC_LABEL: Record<DocumentKind, string> = {
  GOLD_IN: "ورود طلا",
  GOLD_OUT: "خروج طلا",
  GOLD_BUY: "خرید پولی",
  GOLD_SELL: "فروش پولی",
  ASSAY: "جواب ری",
  MELT: "ذوب",
  COIN: "سکه",
  CASH: "دریافت و پرداخت",
  OPENING: "افتتاحیه",
  SEND_PIECES: "ارسال تکه",
  TRANSFER: "حواله صندوق و بانک",
};

export const COIN_OP_LABEL = {
  BUY: "خرید",
  SELL: "فروش",
  RECEIVE: "دریافت",
  PAY: "پرداخت",
} as const;

export function accountTitle(name: string, family: string): string {
  return `${name} ${family}`.trim();
}

export function pieceCode(code: number): string {
  return `ط-${formatCount(code)}`;
}

export function goldSentence(input: {
  verb: string;
  kind: GoldKind;
  scale: Decimal.Value;
  ayar: Decimal.Value;
  weight750: Decimal.Value;
  conditional?: boolean;
}): string {
  const kind = KIND_LABEL[input.kind];
  if (input.conditional) {
    return `${input.verb} ${kind} شرطی ${formatWeight(input.scale)} گرم (عیار موقت ۷۵۰، معادل ${formatWeight(input.weight750)})`;
  }
  return `${input.verb} ${kind} ${formatWeight(input.scale)} گرم عیار ${formatAyar(input.ayar)} (معادل ۷۵۰: ${formatWeight(input.weight750)})`;
}

export function moneySentence(total: bigint): string {
  return `${formatRial(total)} ریال`;
}
