import type { Account, DocumentKind, GoldKind, Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import {
  cashLegs,
  coinEconomics,
  computeAssay,
  cutPiece,
  fromMilli,
  gramOnPay,
  gramOnReceive,
  meltingLoss,
  mesghalPriceFromGram,
  mesghalToGramFactor,
  mScale,
  planMoneySettlement,
  priceGold,
  rialFromGram,
  transferLegs,
  weight750,
  type CoinOp,
  type MoneyLegDraft,
  type PlannedMoneyLeg,
  type PriceMode,
} from "@/lib/accounting";
import { parseJalali } from "@/lib/date";
import { prisma } from "@/lib/db";
import { formatAyar, formatCount, formatRial, formatWeight } from "@/lib/format";
import { COIN_OP_LABEL, goldSentence, pieceCode } from "@/lib/labels";

type Tx = Prisma.TransactionClient;

export type PostResult = { documentId: string; number: number; itemIds: string[] };

const txOptions = { timeout: 20_000 };

function dec3(value: Decimal.Value) {
  return new Decimal(value).toDecimalPlaces(3).toFixed(3);
}
function dec2(value: Decimal.Value) {
  return new Decimal(value).toDecimalPlaces(2).toFixed(2);
}

async function nextCounter(tx: Tx, key: string) {
  const rows = await tx.$queryRaw<Array<{ value: number }>>`
    UPDATE "Counter" SET value = value + 1 WHERE id = ${key} RETURNING value
  `;
  if (!rows[0]) throw new Error("شماره‌گذار سیستم آماده نیست. راه‌اندازی اولیه را اجرا کنید.");
  return Number(rows[0].value);
}

async function audit(tx: Tx, userId: string, action: string, entity: string, entityId: string, detail: string) {
  await tx.auditLog.create({ data: { userId, action, entity, entityId, detail: detail.slice(0, 500) } });
}

async function mustSettings(tx: Tx) {
  const settings = await tx.shopSettings.findUnique({ where: { id: 1 } });
  if (!settings) throw new Error("تنظیمات فروشگاه پیدا نشد");
  return settings;
}

async function partyAccount(tx: Tx, id: string) {
  const account = await tx.account.findUnique({ where: { id } });
  if (!account || !account.active) throw new Error("حساب پیدا نشد یا غیرفعال است");
  if (account.group === "CASH" || account.group === "BANK") {
    throw new Error("صندوق و بانک فقط محل پول هستند؛ سند را روی حساب شخص بزنید");
  }
  return account;
}

async function boxAccount(tx: Tx, settle: "cash" | "bank", bankId?: string) {
  if (settle === "bank") {
    if (!bankId) throw new Error("بانک تسویه را انتخاب کنید");
    const bank = await tx.account.findUnique({ where: { id: bankId } });
    if (!bank || !bank.active || bank.group !== "BANK") throw new Error("حساب بانک معتبر نیست");
    return bank;
  }
  const cash = await tx.account.findFirst({ where: { group: "CASH", system: true, active: true } });
  if (!cash) throw new Error("حساب صندوق پیدا نشد");
  return cash;
}

async function lockItem(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "GoldItem" WHERE id = ${id} FOR UPDATE`;
  if (!rows.length) throw new Error("قطعه پیدا نشد");
}

async function createDoc(
  tx: Tx,
  input: {
    date: Date;
    kind: DocumentKind;
    accountId: string;
    userId: string;
    description: string;
    meta?: Prisma.InputJsonValue;
  },
) {
  const number = await nextCounter(tx, "document");
  return tx.document.create({
    data: {
      number,
      date: input.date,
      kind: input.kind,
      accountId: input.accountId,
      createdById: input.userId,
      description: input.description.slice(0, 2000),
      meta: input.meta,
    },
  });
}

async function createPiece(
  tx: Tx,
  input: {
    docId: string;
    kind: GoldKind;
    scale: Decimal;
    ayar: Decimal;
    weight: Decimal;
    conditional: boolean;
    date: Date;
    sourceAccountId: string;
    labId?: string;
    envelopeNo?: string;
    ang?: string;
    note?: string;
  },
) {
  const code = await nextCounter(tx, "gold");
  return tx.goldItem.create({
    data: {
      code,
      kind: input.kind,
      conditional: input.conditional,
      status: "IN_STOCK",
      assayState: input.conditional ? "PENDING" : "NONE",
      originalScale: dec3(input.scale),
      original750: dec3(input.weight),
      remainingScale: dec3(input.scale),
      remaining750: dec3(input.weight),
      receiptAyar: dec2(input.ayar),
      ayar: dec2(input.ayar),
      ang: (input.ang ?? "").slice(0, 80),
      envelopeNo: (input.envelopeNo ?? "").slice(0, 40),
      note: (input.note ?? "").slice(0, 300),
      labId: input.labId || null,
      sourceAccountId: input.sourceAccountId,
      originDocumentId: input.docId,
      receivedOn: input.date,
    },
  });
}

function readAssayMeta(meta: Prisma.JsonValue): { goldItemId: string; ayar: string; kasr: string } | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const record = meta as Record<string, unknown>;
  if (typeof record.goldItemId !== "string" || typeof record.ayar !== "string") return null;
  return { goldItemId: record.goldItemId, ayar: record.ayar, kasr: typeof record.kasr === "string" ? record.kasr : "0" };
}

export async function recomputeGoldItem(tx: Tx, itemId: string) {
  const item = await tx.goldItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  const origin = await tx.document.findUnique({ where: { id: item.originDocumentId } });
  if (!origin || origin.voidedAt) {
    await tx.goldItem.update({
      where: { id: itemId },
      data: { hidden: true, status: "OUT", remainingScale: "0.000", remaining750: "0.000" },
    });
    return;
  }

  const outRows = await tx.documentRow.findMany({
    where: { goldItemId: itemId, direction: "OUT", rowKind: "GOLD", document: { voidedAt: null } },
  });
  const assay = await tx.document.findFirst({
    where: { kind: "ASSAY", voidedAt: null, rows: { some: { goldItemId: itemId } } },
    orderBy: { number: "desc" },
  });

  if (!assay) {
    const outScale = outRows.reduce((sum, row) => sum + mScale(row.scaleWeight?.toString() ?? 0), 0);
    const out750 = outRows.reduce((sum, row) => sum + mScale(row.weight750?.toString() ?? 0), 0);
    const remS = mScale(item.originalScale.toString()) - outScale;
    const remW = mScale(item.original750.toString()) - out750;
    if (remS < -1 || remW < -1) throw new Error("موجودی قطعه منفی می‌شود");
    await tx.goldItem.update({
      where: { id: itemId },
      data: {
        hidden: false,
        remainingScale: dec3(fromMilli(Math.max(0, remS))),
        remaining750: dec3(fromMilli(Math.max(0, remW))),
        ayar: item.receiptAyar,
        assayState: item.conditional ? "PENDING" : "NONE",
        assayAyar: null,
        assayKasr: null,
        status: remS <= 0 ? "OUT" : "IN_STOCK",
      },
    });
    return;
  }

  const meta = readAssayMeta(assay.meta);
  if (!meta || meta.goldItemId !== itemId) throw new Error("اطلاعات جواب ری ناقص است");
  const originRow = await tx.documentRow.findFirst({
    where: {
      goldItemId: itemId,
      documentId: item.originDocumentId,
      direction: "IN",
      rowKind: "GOLD",
      document: { voidedAt: null },
    },
  });
  const lines = computeAssay({
    originalScale: item.originalScale.toString(),
    original750: item.original750.toString(),
    actualAyar: meta.ayar,
    kasrScale: meta.kasr,
    originAffectsGram: !!originRow && !new Decimal(originRow.gramDelta.toString()).isZero(),
    originKey: item.sourceAccountId ?? "origin",
    outs: outRows.map((row) => ({
      key: row.id,
      scale: row.scaleWeight?.toString() ?? "0",
      booked750: row.weight750?.toString() ?? "0",
    })),
  });
  const stock = lines.find((line) => line.role === "STOCK");
  const remS = stock ? stock.newScale : new Decimal(0);
  const remW = stock ? stock.new750 : new Decimal(0);
  await tx.goldItem.update({
    where: { id: itemId },
    data: {
      hidden: false,
      remainingScale: dec3(remS),
      remaining750: dec3(remW),
      ayar: dec2(meta.ayar),
      assayState: "RESULTED",
      assayAyar: dec2(meta.ayar),
      assayKasr: dec3(meta.kasr),
      status: remS.lte(0) ? "OUT" : "IN_STOCK",
    },
  });
}

async function resolveAyar(input: { conditional: boolean; ayar?: number; kind: GoldKind }, settings: { defaultAyar: Prisma.Decimal; standardAyar: Prisma.Decimal }) {
  const standard = new Decimal(settings.standardAyar.toString());
  if (input.conditional) return standard;
  if (input.ayar === undefined) {
    return input.kind === "MOTAFARREQE" ? new Decimal(settings.defaultAyar.toString()) : standard;
  }
  const ayar = new Decimal(input.ayar);
  if (ayar.lte(0) || ayar.gt(1000)) throw new Error("عیار نامعتبر است");
  return ayar;
}

function assertScale(scale: Decimal) {
  if (scale.lte(0) || scale.gt(100000)) throw new Error("وزن نامعتبر است");
}

export async function postGoldIn(
  userId: string,
  input: {
    date: string;
    accountId: string;
    kind: GoldKind;
    scale: number;
    ayar?: number;
    conditional: boolean;
    labId?: string;
    envelopeNo?: string;
    ang?: string;
    note?: string;
  },
): Promise<PostResult> {
  return prisma.$transaction(async (tx) => {
    const settings = await mustSettings(tx);
    const account = await partyAccount(tx, input.accountId);
    const date = parseJalali(input.date);
    const scale = new Decimal(input.scale);
    assertScale(scale);
    const ayar = await resolveAyar(input, settings);
    const weight = weight750(scale, ayar, settings.standardAyar.toString());
    if (weight.lte(0)) throw new Error("وزن معادل ۷۵۰ صفر است");
    await ensureLab(tx, input.labId);
    const sentence = goldSentence({
      verb: "ورود",
      kind: input.kind,
      scale,
      ayar,
      weight750: weight,
      conditional: input.conditional,
    });
    const doc = await createDoc(tx, {
      date,
      kind: "GOLD_IN",
      accountId: account.id,
      userId,
      description: joinText(sentence, input.note),
    });
    const item = await createPiece(tx, {
      docId: doc.id,
      kind: input.kind,
      scale,
      ayar,
      weight,
      conditional: input.conditional,
      date,
      sourceAccountId: account.id,
      labId: input.labId,
      envelopeNo: input.envelopeNo,
      ang: input.ang,
      note: input.note,
    });
    await tx.documentRow.create({
      data: {
        documentId: doc.id,
        lineNo: 1,
        accountId: account.id,
        direction: "IN",
        rowKind: "GOLD",
        goldKind: input.kind,
        goldItemId: item.id,
        scaleWeight: dec3(scale),
        ayar: dec2(ayar),
        weight750: dec3(weight),
        gramDelta: dec3(gramOnReceive(weight)),
        description: sentence,
      },
    });
    await audit(tx, userId, "POST_DOCUMENT", "Document", doc.id, sentence);
    return { documentId: doc.id, number: doc.number, itemIds: [item.id] };
  }, txOptions);
}

async function applyGoldOut(
  tx: Tx,
  input: {
    docId: string;
    lineNo: number;
    accountId: string;
    itemId: string;
    scale?: Decimal;
    full?: boolean;
    affectGram: boolean;
    rialDelta?: bigint;
    amountRial?: bigint;
  },
) {
  await lockItem(tx, input.itemId);
  await recomputeGoldItem(tx, input.itemId);
  const item = await tx.goldItem.findUnique({ where: { id: input.itemId } });
  if (!item || item.hidden || item.status !== "IN_STOCK") throw new Error("قطعه در موجودی نیست");
  const scale = input.full ? new Decimal(item.remainingScale.toString()) : input.scale;
  if (!scale) throw new Error("وزن خروجی را وارد کنید");
  const cut = cutPiece({
    remainingScale: item.remainingScale.toString(),
    remaining750: item.remaining750.toString(),
    cutScale: scale,
    ayar: item.ayar.toString(),
  });
  const pending = item.conditional && item.assayState === "PENDING";
  let sentence = `${goldSentence({
    verb: "خروج",
    kind: item.kind,
    scale: cut.cutScale,
    ayar: item.ayar.toString(),
    weight750: cut.cut750,
    conditional: pending,
  })} از ${pieceCode(item.code)}`;
  if (input.amountRial && input.amountRial > 0n) sentence += ` به مبلغ ${formatRial(input.amountRial)} ریال`;
  await tx.documentRow.create({
    data: {
      documentId: input.docId,
      lineNo: input.lineNo,
      accountId: input.accountId,
      direction: "OUT",
      rowKind: "GOLD",
      goldKind: item.kind,
      goldItemId: item.id,
      scaleWeight: dec3(cut.cutScale),
      ayar: dec2(item.ayar.toString()),
      weight750: dec3(cut.cut750),
      gramDelta: input.affectGram ? dec3(gramOnPay(cut.cut750)) : "0.000",
      rialDelta: input.rialDelta ?? 0n,
      amountRial: input.amountRial ?? null,
      description: sentence,
    },
  });
  await recomputeGoldItem(tx, item.id);
  return { ...cut, sentence, item };
}

export async function postGoldOut(
  userId: string,
  input: { date: string; accountId: string; itemId: string; scale: number; note?: string },
): Promise<PostResult> {
  return prisma.$transaction(async (tx) => {
    const account = await partyAccount(tx, input.accountId);
    const date = parseJalali(input.date);
    const doc = await createDoc(tx, {
      date,
      kind: "GOLD_OUT",
      accountId: account.id,
      userId,
      description: "خروج طلا",
    });
    const applied = await applyGoldOut(tx, {
      docId: doc.id,
      lineNo: 1,
      accountId: account.id,
      itemId: input.itemId,
      scale: new Decimal(input.scale),
      affectGram: true,
    });
    await tx.document.update({
      where: { id: doc.id },
      data: { description: joinText(applied.sentence, input.note) },
    });
    await audit(tx, userId, "POST_DOCUMENT", "Document", doc.id, applied.sentence);
    return { documentId: doc.id, number: doc.number, itemIds: [input.itemId] };
  }, txOptions);
}

async function latestMazaneValue(tx: Tx, mode: PriceMode, explicit?: number) {
  if (explicit !== undefined) return new Decimal(explicit);
  if (mode === "total") return undefined;
  const mazane = await tx.mazane.findFirst({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
  if (!mazane) throw new Error("مظنهٔ روز ثبت نشده است");
  return new Decimal((mode === "mesghal" ? mazane.mazaneMesghal : mazane.mazaneGram).toString());
}

async function writeSettlement(
  tx: Tx,
  input: {
    docId: string;
    lineNo: number;
    partyId: string;
    settlePartyRial: bigint;
    box: Account | null;
    boxRial: bigint;
    label: string;
  },
) {
  let line = input.lineNo;
  if (input.settlePartyRial !== 0n) {
    await tx.documentRow.create({
      data: {
        documentId: input.docId,
        lineNo: line,
        accountId: input.partyId,
        direction: input.settlePartyRial > 0n ? "IN" : "OUT",
        rowKind: "RIAL",
        rialDelta: input.settlePartyRial,
        amountRial: input.settlePartyRial < 0n ? -input.settlePartyRial : input.settlePartyRial,
        description: input.label,
      },
    });
    line += 1;
  }
  if (input.box && input.boxRial !== 0n) {
    await tx.documentRow.create({
      data: {
        documentId: input.docId,
        lineNo: line,
        accountId: input.box.id,
        direction: input.boxRial > 0n ? "IN" : "OUT",
        rowKind: "RIAL",
        rialDelta: input.boxRial,
        amountRial: input.boxRial < 0n ? -input.boxRial : input.boxRial,
        description: input.label,
      },
    });
    line += 1;
  }
  return line;
}

type GoldOffsetInput = {
  scale: number;
  ayar?: number;
  kind?: GoldKind;
  itemId?: string;
  total?: string;
  ang?: string;
};

type CoinOffsetInput = {
  coinTypeId: string;
  count: number;
  unitPrice: bigint;
};

type OffsetQuote = {
  coinRial: bigint;
  goldRial: bigint;
  coin: null | {
    coinTypeId: string;
    name: string;
    op: "BUY" | "SELL";
    count: number;
    unitPrice: bigint;
    totalRial: bigint;
    stockCountDelta: number;
    tradePartyRial: bigint;
  };
  goldIn: null | {
    kind: GoldKind;
    scale: Decimal;
    ayar: Decimal;
    weight: Decimal;
    totalRial: bigint;
    ang: string;
  };
  goldOut: null | { itemId: string; scale: Decimal; totalRial: bigint };
};

function explicitMoney(
  total: bigint,
  input: { settle?: "account" | "cash" | "bank"; bankAccountId?: string; money?: MoneyLegDraft[] },
): MoneyLegDraft[] {
  if (input.money) return input.money.filter((leg) => leg.amount > 0n);
  if (!input.settle || input.settle === "account" || total <= 0n) return [];
  if (input.settle === "bank") {
    if (!input.bankAccountId) throw new Error("بانک تسویه را انتخاب کنید");
    return [{ via: "bank", amount: total, bankAccountId: input.bankAccountId }];
  }
  return [{ via: "cash", amount: total }];
}

async function quoteOffsets(
  tx: Tx,
  settings: { defaultAyar: Prisma.Decimal; standardAyar: Prisma.Decimal; mesghalGrams: Prisma.Decimal; mesghalAyar: Prisma.Decimal },
  opts: { mesghalGrams: string; mesghalAyar: string; standardAyar: string },
  incoming: boolean,
  input: { coin?: CoinOffsetInput | null; gold?: GoldOffsetInput | null; avoidItemId?: string },
): Promise<OffsetQuote> {
  const quote: OffsetQuote = { coinRial: 0n, goldRial: 0n, coin: null, goldIn: null, goldOut: null };
  if (input.coin && input.coin.count > 0) {
    const op = incoming ? "BUY" : "SELL";
    const eco = coinEconomics(op, input.coin.count, input.coin.unitPrice);
    const coin = await tx.coinType.findUnique({ where: { id: input.coin.coinTypeId } });
    if (!coin || !coin.active) throw new Error("نوع سکهٔ تسویه پیدا نشد");
    const total = input.coin.unitPrice * BigInt(input.coin.count);
    quote.coin = {
      coinTypeId: coin.id,
      name: coin.name,
      op,
      count: input.coin.count,
      unitPrice: input.coin.unitPrice,
      totalRial: total,
      stockCountDelta: eco.stockCountDelta,
      tradePartyRial: eco.tradePartyRial,
    };
    quote.coinRial = total;
  }
  if (input.gold && input.gold.scale > 0) {
    if (incoming) {
      const kind = input.gold.kind ?? "MOTAFARREQE";
      const scale = new Decimal(input.gold.scale);
      assertScale(scale);
      const ayar = await resolveAyar({ conditional: false, ayar: input.gold.ayar, kind }, settings);
      const mazane = input.gold.total === undefined ? await latestMazaneValue(tx, "mesghal") : undefined;
      const priced = priceGold({
        scale,
        ayar,
        mode: input.gold.total === undefined ? "mesghal" : "total",
        mazane,
        totalRial: input.gold.total,
        ...opts,
      });
      quote.goldIn = { kind, scale, ayar, weight: priced.weight750, totalRial: priced.totalRial, ang: input.gold.ang ?? "" };
      quote.goldRial = priced.totalRial;
    } else {
      if (!input.gold.itemId) throw new Error("قطعهٔ طلای تسویه را انتخاب کنید");
      if (input.gold.itemId === input.avoidItemId) throw new Error("قطعهٔ معامله را نمی‌توان هم‌زمان برای تسویه خارج کرد");
      await lockItem(tx, input.gold.itemId);
      await recomputeGoldItem(tx, input.gold.itemId);
      const item = await tx.goldItem.findUnique({ where: { id: input.gold.itemId } });
      if (!item || item.hidden || item.status !== "IN_STOCK") throw new Error("قطعهٔ تسویه در موجودی نیست");
      const preview = cutPiece({
        remainingScale: item.remainingScale.toString(),
        remaining750: item.remaining750.toString(),
        cutScale: input.gold.scale,
        ayar: item.ayar.toString(),
      });
      const mazane = input.gold.total === undefined ? await latestMazaneValue(tx, "mesghal") : undefined;
      const priced = priceGold({
        scale: preview.cut750,
        ayar: settings.standardAyar.toString(),
        mode: input.gold.total === undefined ? "mesghal" : "total",
        mazane,
        totalRial: input.gold.total,
        ...opts,
      });
      quote.goldOut = { itemId: item.id, scale: preview.cutScale, totalRial: priced.totalRial };
      quote.goldRial = priced.totalRial;
    }
  }
  return quote;
}

function settlementSummary(total: bigint, covered: bigint, moneyLegs: PlannedMoneyLeg[], offsets: OffsetQuote): string {
  const parts: string[] = [];
  for (const leg of moneyLegs) parts.push(leg.via === "cash" ? `نقد ${formatRial(leg.amount)}` : `بانک ${formatRial(leg.amount)}`);
  if (offsets.coin) {
    parts.push(`${offsets.coin.op === "BUY" ? "سکه دریافتی" : "سکه پرداختی"} ${formatCount(offsets.coin.count)} ${offsets.coin.name}`);
  }
  if (offsets.goldIn) parts.push(`طلای دریافتی ${formatWeight(offsets.goldIn.weight)} گرم ۷۵۰`);
  if (offsets.goldOut) parts.push("طلای پرداختی از موجودی");
  const rest = total - covered;
  parts.push(rest === 0n ? "تسویه کامل" : `مانده در حساب ${formatRial(rest)} ریال`);
  return parts.join("، ") || "مانده در حساب";
}

async function applyPlannedMoney(
  tx: Tx,
  input: { docId: string; lineNo: number; partyId: string; legs: PlannedMoneyLeg[] },
) {
  let line = input.lineNo;
  for (const leg of input.legs) {
    const box = await boxAccount(tx, leg.via === "bank" ? "bank" : "cash", leg.bankAccountId);
    const label = leg.via === "bank" ? `تسویه ${box.name} ${formatRial(leg.amount)} ریال` : `تسویه نقد صندوق ${formatRial(leg.amount)} ریال`;
    line = await writeSettlement(tx, {
      docId: input.docId,
      lineNo: line,
      partyId: input.partyId,
      settlePartyRial: leg.partyRial,
      box,
      boxRial: leg.boxRial,
      label,
    });
  }
  return line;
}

async function writeOffsets(
  tx: Tx,
  input: { docId: string; lineNo: number; partyId: string; date: Date; offsets: OffsetQuote },
): Promise<{ line: number; itemIds: string[] }> {
  let line = input.lineNo;
  const itemIds: string[] = [];
  const coin = input.offsets.coin;
  if (coin) {
    await tx.$queryRaw`SELECT id FROM "CoinType" WHERE id = ${coin.coinTypeId} FOR UPDATE`;
    const stockAgg = await tx.documentRow.aggregate({
      where: { coinTypeId: coin.coinTypeId, document: { voidedAt: null } },
      _sum: { stockCountDelta: true },
    });
    const stock = stockAgg._sum.stockCountDelta ?? 0;
    if (stock + coin.stockCountDelta < 0) {
      throw new Error(`موجودی ${coin.name} برای تسویه کافی نیست (موجودی ${formatCount(stock)})`);
    }
    const sentence = `${coin.op === "BUY" ? "دریافت سکه بابت تسویه" : "پرداخت سکه بابت تسویه"} ${formatCount(coin.count)} عدد ${coin.name}، ${formatRial(coin.totalRial)} ریال`;
    await tx.documentRow.create({
      data: {
        documentId: input.docId,
        lineNo: line,
        accountId: input.partyId,
        direction: coin.stockCountDelta > 0 ? "IN" : "OUT",
        rowKind: "COIN",
        coinTypeId: coin.coinTypeId,
        count: coin.count,
        unitPrice: coin.unitPrice,
        coinOp: coin.op,
        coinDelta: 0,
        stockCountDelta: coin.stockCountDelta,
        rialDelta: coin.tradePartyRial,
        amountRial: coin.totalRial,
        description: sentence,
      },
    });
    if (coin.unitPrice > 0n) {
      await tx.coinType.update({
        where: { id: coin.coinTypeId },
        data: coin.op === "BUY" ? { buyPrice: coin.unitPrice } : { sellPrice: coin.unitPrice },
      });
    }
    line += 1;
  }
  const incoming = input.offsets.goldIn;
  if (incoming) {
    const item = await createPiece(tx, {
      docId: input.docId,
      kind: incoming.kind,
      scale: incoming.scale,
      ayar: incoming.ayar,
      weight: incoming.weight,
      conditional: false,
      date: input.date,
      sourceAccountId: input.partyId,
      ang: incoming.ang,
    });
    const sentence = `${goldSentence({
      verb: "دریافت در تسویه",
      kind: incoming.kind,
      scale: incoming.scale,
      ayar: incoming.ayar,
      weight750: incoming.weight,
    })} به مبلغ ${formatRial(incoming.totalRial)} ریال`;
    await tx.documentRow.create({
      data: {
        documentId: input.docId,
        lineNo: line,
        accountId: input.partyId,
        direction: "IN",
        rowKind: "GOLD",
        goldKind: incoming.kind,
        goldItemId: item.id,
        scaleWeight: dec3(incoming.scale),
        ayar: dec2(incoming.ayar),
        weight750: dec3(incoming.weight),
        gramDelta: "0.000",
        rialDelta: -incoming.totalRial,
        amountRial: incoming.totalRial,
        description: sentence,
      },
    });
    itemIds.push(item.id);
    line += 1;
  }
  const outgoing = input.offsets.goldOut;
  if (outgoing) {
    await applyGoldOut(tx, {
      docId: input.docId,
      lineNo: line,
      accountId: input.partyId,
      itemId: outgoing.itemId,
      scale: outgoing.scale,
      affectGram: false,
      rialDelta: outgoing.totalRial,
      amountRial: outgoing.totalRial,
    });
    line += 1;
  }
  return { line, itemIds };
}

export async function postGoldTrade(
  userId: string,
  input: {
    side: "BUY" | "SELL";
    date: string;
    accountId: string;
    note?: string;
    settle: "account" | "cash" | "bank";
    bankAccountId?: string;
    money?: MoneyLegDraft[];
    coinOffset?: CoinOffsetInput | null;
    goldOffset?: GoldOffsetInput | null;
    mode: PriceMode;
    mazane?: number;
    total?: number;
    kind?: GoldKind;
    scale?: number;
    ayar?: number;
    itemId?: string;
    labId?: string;
    envelopeNo?: string;
    ang?: string;
  },
): Promise<PostResult> {
  return prisma.$transaction(async (tx) => {
    const settings = await mustSettings(tx);
    const account = await partyAccount(tx, input.accountId);
    const date = parseJalali(input.date);
    const opts = {
      mesghalGrams: settings.mesghalGrams.toString(),
      mesghalAyar: settings.mesghalAyar.toString(),
      standardAyar: settings.standardAyar.toString(),
    };
    const mazane = await latestMazaneValue(tx, input.mode, input.mazane);

    if (input.side === "BUY") {
      if (!input.kind || input.scale === undefined) throw new Error("نوع و وزن طلا را وارد کنید");
      const scale = new Decimal(input.scale);
      assertScale(scale);
      const ayar = await resolveAyar({ conditional: false, ayar: input.ayar, kind: input.kind }, settings);
      const priced = priceGold({
        scale,
        ayar,
        mode: input.mode,
        mazane,
        totalRial: input.total,
        ...opts,
      });
      const offsets = await quoteOffsets(tx, settings, opts, false, {
        coin: input.coinOffset,
        gold: input.goldOffset,
      });
      const instrument = offsets.coinRial + offsets.goldRial;
      if (instrument > priced.totalRial) throw new Error("تسویه با طلا و سکه از مبلغ سند بیشتر است");
      const money = planMoneySettlement({
        incoming: false,
        room: priced.totalRial - instrument,
        legs: explicitMoney(priced.totalRial, input),
      });
      const settleLabel = settlementSummary(priced.totalRial, money.settled + instrument, money.legs, offsets);
      const sentence = `${goldSentence({
        verb: "خرید",
        kind: input.kind,
        scale,
        ayar,
        weight750: priced.weight750,
      })} به مبلغ ${formatRial(priced.totalRial)} ریال — ${settleLabel}`;
      const doc = await createDoc(tx, {
        date,
        kind: "GOLD_BUY",
        accountId: account.id,
        userId,
        description: joinText(sentence, input.note),
      });
      await ensureLab(tx, input.labId);
      const item = await createPiece(tx, {
        docId: doc.id,
        kind: input.kind,
        scale,
        ayar,
        weight: priced.weight750,
        conditional: false,
        date,
        sourceAccountId: account.id,
        labId: input.labId,
        envelopeNo: input.envelopeNo,
        ang: input.ang,
        note: input.note,
      });
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo: 1,
          accountId: account.id,
          direction: "IN",
          rowKind: "GOLD",
          goldKind: input.kind,
          goldItemId: item.id,
          scaleWeight: dec3(scale),
          ayar: dec2(ayar),
          weight750: dec3(priced.weight750),
          gramDelta: "0.000",
          rialDelta: -priced.totalRial,
          amountRial: priced.totalRial,
          description: sentence,
        },
      });
      const written = await writeOffsets(tx, { docId: doc.id, lineNo: 2, partyId: account.id, date, offsets });
      await applyPlannedMoney(tx, { docId: doc.id, lineNo: written.line, partyId: account.id, legs: money.legs });
      await audit(tx, userId, "POST_DOCUMENT", "Document", doc.id, sentence);
      return { documentId: doc.id, number: doc.number, itemIds: [item.id, ...written.itemIds] };
    }

    if (!input.itemId) throw new Error("قطعهٔ فروشی را انتخاب کنید");
    await lockItem(tx, input.itemId);
    await recomputeGoldItem(tx, input.itemId);
    const item = await tx.goldItem.findUnique({ where: { id: input.itemId } });
    if (!item || item.hidden || item.status !== "IN_STOCK") throw new Error("قطعه در موجودی نیست");
    const preview = cutPiece({
      remainingScale: item.remainingScale.toString(),
      remaining750: item.remaining750.toString(),
      cutScale: input.scale ?? item.remainingScale.toString(),
      ayar: item.ayar.toString(),
    });
    const priced = priceGold({
      scale: preview.cut750,
      ayar: settings.standardAyar.toString(),
      mode: input.mode,
      mazane,
      totalRial: input.total,
      ...opts,
    });
    const offsets = await quoteOffsets(tx, settings, opts, true, {
      coin: input.coinOffset,
      gold: input.goldOffset,
      avoidItemId: item.id,
    });
    const instrument = offsets.coinRial + offsets.goldRial;
    if (instrument > priced.totalRial) throw new Error("تسویه با طلا و سکه از مبلغ سند بیشتر است");
    const money = planMoneySettlement({
      incoming: true,
      room: priced.totalRial - instrument,
      legs: explicitMoney(priced.totalRial, input),
    });
    const settleLabel = settlementSummary(priced.totalRial, money.settled + instrument, money.legs, offsets);
    const doc = await createDoc(tx, {
      date,
      kind: "GOLD_SELL",
      accountId: account.id,
      userId,
      description: "فروش طلا",
    });
    const applied = await applyGoldOut(tx, {
      docId: doc.id,
      lineNo: 1,
      accountId: account.id,
      itemId: item.id,
      scale: preview.cutScale,
      affectGram: false,
      rialDelta: priced.totalRial,
      amountRial: priced.totalRial,
    });
    const sentence = `${applied.sentence} — ${settleLabel}`;
    await tx.document.update({ where: { id: doc.id }, data: { description: joinText(sentence, input.note) } });
    const written = await writeOffsets(tx, { docId: doc.id, lineNo: 2, partyId: account.id, date, offsets });
    await applyPlannedMoney(tx, { docId: doc.id, lineNo: written.line, partyId: account.id, legs: money.legs });
    await audit(tx, userId, "POST_DOCUMENT", "Document", doc.id, sentence);
    return { documentId: doc.id, number: doc.number, itemIds: [item.id, ...written.itemIds] };
  }, txOptions);
}

export async function postMelt(
  userId: string,
  input: {
    date: string;
    meltAccountId: string;
    note?: string;
    sends: { itemId: string; scale: number }[];
    returns: { scale: number; ayar?: number; conditional: boolean; labId?: string; envelopeNo?: string; ang?: string }[];
  },
): Promise<PostResult> {
  if (!input.sends.length) throw new Error("حداقل یک قطعه برای ذوب انتخاب کنید");
  if (!input.returns.length) throw new Error("وزن برگشتی از ذوب را وارد کنید");
  return prisma.$transaction(async (tx) => {
    const settings = await mustSettings(tx);
    const melt = await tx.account.findUnique({ where: { id: input.meltAccountId } });
    if (!melt || !melt.active || melt.group !== "EXPENSE") throw new Error("حساب ذوب باید گروه هزینه / سوخت باشد");
    const date = parseJalali(input.date);
    const doc = await createDoc(tx, { date, kind: "MELT", accountId: melt.id, userId, description: "ذوب" });
    let line = 1;
    let sent = new Decimal(0);
    for (const send of input.sends) {
      const applied = await applyGoldOut(tx, {
        docId: doc.id,
        lineNo: line,
        accountId: melt.id,
        itemId: send.itemId,
        scale: new Decimal(send.scale),
        affectGram: true,
      });
      sent = sent.plus(applied.cut750);
      line += 1;
    }
    const itemIds: string[] = [];
    let received = new Decimal(0);
    for (const back of input.returns) {
      const scale = new Decimal(back.scale);
      assertScale(scale);
      const ayar = await resolveAyar({ conditional: back.conditional, ayar: back.ayar, kind: "ABSHODE" }, settings);
      const weight = weight750(scale, ayar, settings.standardAyar.toString());
      await ensureLab(tx, back.labId);
      const item = await createPiece(tx, {
        docId: doc.id,
        kind: "ABSHODE",
        scale,
        ayar,
        weight,
        conditional: back.conditional,
        date,
        sourceAccountId: melt.id,
        labId: back.labId,
        envelopeNo: back.envelopeNo,
        ang: back.ang,
      });
      const sentence = goldSentence({
        verb: "دریافت از ذوب",
        kind: "ABSHODE",
        scale,
        ayar,
        weight750: weight,
        conditional: back.conditional,
      });
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo: line,
          accountId: melt.id,
          direction: "IN",
          rowKind: "GOLD",
          goldKind: "ABSHODE",
          goldItemId: item.id,
          scaleWeight: dec3(scale),
          ayar: dec2(ayar),
          weight750: dec3(weight),
          gramDelta: dec3(gramOnReceive(weight)),
          description: sentence,
        },
      });
      received = received.plus(weight);
      itemIds.push(item.id);
      line += 1;
    }
    const loss = meltingLoss(sent, received);
    const summary = `ذوب: ارسال ${formatWeight(sent)} گرم ۷۵۰، دریافت ${formatWeight(received)}، اختلاف ${formatWeight(loss)} گرم`;
    await tx.document.update({
      where: { id: doc.id },
      data: { description: joinText(summary, input.note) },
    });
    await audit(tx, userId, "POST_DOCUMENT", "Document", doc.id, summary);
    return { documentId: doc.id, number: doc.number, itemIds };
  }, txOptions);
}

export async function postSendPieces(
  userId: string,
  input: { date: string; accountId: string; itemIds: string[]; note?: string },
): Promise<PostResult> {
  if (!input.itemIds.length) throw new Error("تکه‌ای انتخاب نشده است");
  return prisma.$transaction(async (tx) => {
    const account = await partyAccount(tx, input.accountId);
    const date = parseJalali(input.date);
    const doc = await createDoc(tx, {
      date,
      kind: "SEND_PIECES",
      accountId: account.id,
      userId,
      description: "ارسال تکه‌ها",
    });
    const ids = [...new Set(input.itemIds)].sort();
    for (const id of ids) await lockItem(tx, id);
    let line = 1;
    for (const id of ids) {
      await applyGoldOut(tx, {
        docId: doc.id,
        lineNo: line,
        accountId: account.id,
        itemId: id,
        full: true,
        affectGram: true,
      });
      line += 1;
    }
    const description = joinText(`ارسال ${formatCount(ids.length)} تکه`, input.note);
    await tx.document.update({ where: { id: doc.id }, data: { description } });
    await audit(tx, userId, "POST_DOCUMENT", "Document", doc.id, description);
    return { documentId: doc.id, number: doc.number, itemIds: ids };
  }, txOptions);
}

export async function postCoin(
  userId: string,
  input: {
    date: string;
    accountId: string;
    coinTypeId: string;
    op: CoinOp;
    count: number;
    unitPrice: bigint;
    settle: "account" | "cash" | "bank";
    bankAccountId?: string;
    money?: MoneyLegDraft[];
    coinOffset?: CoinOffsetInput | null;
    goldOffset?: GoldOffsetInput | null;
    note?: string;
  },
): Promise<PostResult> {
  const eco = coinEconomics(input.op, input.count, input.unitPrice);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "CoinType" WHERE id = ${input.coinTypeId} FOR UPDATE`;
    const coin = await tx.coinType.findUnique({ where: { id: input.coinTypeId } });
    if (!coin || !coin.active) throw new Error("نوع سکه پیدا نشد");
    const settings = await mustSettings(tx);
    const opts = {
      mesghalGrams: settings.mesghalGrams.toString(),
      mesghalAyar: settings.mesghalAyar.toString(),
      standardAyar: settings.standardAyar.toString(),
    };
    const abs = eco.tradePartyRial < 0n ? -eco.tradePartyRial : eco.tradePartyRial;
    const incoming = eco.tradePartyRial > 0n;
    const offsets = await quoteOffsets(tx, settings, opts, incoming, {
      coin: input.coinOffset,
      gold: input.goldOffset,
    });
    const instrument = offsets.coinRial + offsets.goldRial;
    if (abs === 0n && instrument > 0n) throw new Error("این سند مبلغی برای تسویه با طلا و سکه ندارد");
    if (instrument > abs) throw new Error("تسویه با طلا و سکه از مبلغ سند بیشتر است");
    const stockAgg = await tx.documentRow.aggregate({
      where: { coinTypeId: coin.id, document: { voidedAt: null } },
      _sum: { stockCountDelta: true },
    });
    const stock = stockAgg._sum.stockCountDelta ?? 0;
    const sameCoin = offsets.coin && offsets.coin.coinTypeId === coin.id ? offsets.coin.stockCountDelta : 0;
    if (stock + eco.stockCountDelta + sameCoin < 0) throw new Error(`موجودی ${coin.name} کافی نیست (موجودی ${formatCount(stock)})`);
    const money = planMoneySettlement({
      incoming,
      room: abs - instrument,
      legs: explicitMoney(abs, input),
    });
    const account = await partyAccount(tx, input.accountId);
    const date = parseJalali(input.date);
    const settleLabel = abs === 0n ? "بدون مبلغ" : settlementSummary(abs, money.settled + instrument, money.legs, offsets);
    const sentence = `${COIN_OP_LABEL[input.op]} ${formatCount(input.count)} عدد ${coin.name}${
      input.unitPrice > 0n ? ` فی ${formatRial(input.unitPrice)}، جمع ${formatRial(input.unitPrice * BigInt(input.count))}` : ""
    } — ${settleLabel}`;
    const doc = await createDoc(tx, {
      date,
      kind: "COIN",
      accountId: account.id,
      userId,
      description: joinText(sentence, input.note),
    });
    await tx.documentRow.create({
      data: {
        documentId: doc.id,
        lineNo: 1,
        accountId: account.id,
        direction: eco.stockCountDelta > 0 ? "IN" : "OUT",
        rowKind: "COIN",
        coinTypeId: coin.id,
        count: input.count,
        unitPrice: input.unitPrice,
        coinOp: input.op,
        coinDelta: eco.coinDelta,
        stockCountDelta: eco.stockCountDelta,
        rialDelta: eco.tradePartyRial,
        amountRial: input.unitPrice * BigInt(input.count),
        description: sentence,
      },
    });
    const written = await writeOffsets(tx, { docId: doc.id, lineNo: 2, partyId: account.id, date, offsets });
    await applyPlannedMoney(tx, { docId: doc.id, lineNo: written.line, partyId: account.id, legs: money.legs });
    if (input.op === "BUY" && input.unitPrice > 0n) {
      await tx.coinType.update({ where: { id: coin.id }, data: { buyPrice: input.unitPrice } });
    }
    if (input.op === "SELL" && input.unitPrice > 0n) {
      await tx.coinType.update({ where: { id: coin.id }, data: { sellPrice: input.unitPrice } });
    }
    await audit(tx, userId, "POST_DOCUMENT", "Document", doc.id, sentence);
    return { documentId: doc.id, number: doc.number, itemIds: written.itemIds };
  }, txOptions);
}

export async function postCash(
  userId: string,
  input: {
    date: string;
    accountId: string;
    direction: "IN" | "OUT";
    amount: bigint;
    via: "cash" | "bank";
    bankAccountId?: string;
    note?: string;
  },
): Promise<PostResult> {
  const legs = cashLegs(input.direction, input.amount);
  return prisma.$transaction(async (tx) => {
    const account = await partyAccount(tx, input.accountId);
    const box = await boxAccount(tx, input.via, input.bankAccountId);
    const date = parseJalali(input.date);
    const verb = input.direction === "IN" ? "دریافت وجه" : "پرداخت وجه";
    const place = input.via === "bank" ? box.name : "صندوق";
    const sentence = `${verb} ${formatRial(input.amount)} ریال — ${place}`;
    const doc = await createDoc(tx, {
      date,
      kind: "CASH",
      accountId: account.id,
      userId,
      description: joinText(sentence, input.note),
    });
    await tx.documentRow.create({
      data: {
        documentId: doc.id,
        lineNo: 1,
        accountId: account.id,
        direction: input.direction,
        rowKind: "RIAL",
        rialDelta: legs.partyRialDelta,
        amountRial: input.amount,
        description: sentence,
      },
    });
    await tx.documentRow.create({
      data: {
        documentId: doc.id,
        lineNo: 2,
        accountId: box.id,
        direction: input.direction,
        rowKind: "RIAL",
        rialDelta: legs.boxRialDelta,
        amountRial: input.amount,
        description: sentence,
      },
    });
    await audit(tx, userId, "POST_DOCUMENT", "Document", doc.id, sentence);
    return { documentId: doc.id, number: doc.number, itemIds: [] };
  }, txOptions);
}

function mergeLegs(legs: MoneyLegDraft[]): MoneyLegDraft[] {
  const map = new Map<string, MoneyLegDraft>();
  for (const leg of legs) {
    if (leg.amount === 0n) continue;
    if (leg.amount < 0n) throw new Error("مبلغ باید بزرگ‌تر از صفر باشد");
    if (leg.via === "bank" && !leg.bankAccountId) throw new Error("بانک را انتخاب کنید");
    const key = leg.via === "cash" ? "cash" : `bank:${leg.bankAccountId}`;
    const prev = map.get(key);
    if (prev) prev.amount += leg.amount;
    else map.set(key, { via: leg.via, amount: leg.amount, bankAccountId: leg.bankAccountId });
  }
  return [...map.values()];
}

async function moneyAccount(tx: Tx, id: string) {
  const account = await tx.account.findUnique({ where: { id } });
  if (!account || !account.active || (account.group !== "CASH" && account.group !== "BANK")) {
    throw new Error("حساب صندوق یا بانک معتبر نیست");
  }
  return account;
}

/** دریافت یا پرداخت چندوجهی: بخشی صندوق و بخشی یک یا چند بانک، در یک سند. */
export async function postFunds(
  userId: string,
  input: {
    date: string;
    accountId: string;
    direction: "IN" | "OUT";
    note?: string;
    legs: MoneyLegDraft[];
  },
): Promise<PostResult> {
  const legs = mergeLegs(input.legs);
  if (!legs.length) throw new Error("مبلغ دریافت یا پرداخت را وارد کنید");
  return prisma.$transaction(async (tx) => {
    const account = await partyAccount(tx, input.accountId);
    const date = parseJalali(input.date);
    const verb = input.direction === "IN" ? "دریافت" : "پرداخت";
    const resolved: { boxName: string; boxId: string; amount: bigint; partyRial: bigint; boxRial: bigint }[] = [];
    for (const leg of legs) {
      const box = await boxAccount(tx, leg.via === "bank" ? "bank" : "cash", leg.bankAccountId);
      const flow = cashLegs(input.direction, leg.amount);
      resolved.push({
        boxName: box.group === "CASH" ? "صندوق" : box.name,
        boxId: box.id,
        amount: leg.amount,
        partyRial: flow.partyRialDelta,
        boxRial: flow.boxRialDelta,
      });
    }
    const sentence = `${verb} ${resolved.map((row) => `${formatRial(row.amount)} ریال ${row.boxName}`).join(" و ")}`;
    const doc = await createDoc(tx, {
      date,
      kind: "CASH",
      accountId: account.id,
      userId,
      description: joinText(sentence, input.note),
    });
    let line = 1;
    for (const row of resolved) {
      const text = `${verb} ${formatRial(row.amount)} ریال — ${row.boxName}`;
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo: line,
          accountId: account.id,
          direction: input.direction,
          rowKind: "RIAL",
          rialDelta: row.partyRial,
          amountRial: row.amount,
          description: text,
        },
      });
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo: line + 1,
          accountId: row.boxId,
          direction: input.direction,
          rowKind: "RIAL",
          rialDelta: row.boxRial,
          amountRial: row.amount,
          description: text,
        },
      });
      line += 2;
    }
    await audit(tx, userId, "POST_DOCUMENT", "Document", doc.id, sentence);
    return { documentId: doc.id, number: doc.number, itemIds: [] };
  }, txOptions);
}

/** جابه‌جایی وجه بین صندوق و بانک‌ها. جمع موجودی وجوه عوض نمی‌شود. */
export async function postTransfer(
  userId: string,
  input: { date: string; fromAccountId: string; toAccountId: string; amount: bigint; note?: string },
): Promise<PostResult> {
  const flow = transferLegs(input.amount);
  if (input.fromAccountId === input.toAccountId) throw new Error("مبدأ و مقصد حواله یکی است");
  return prisma.$transaction(async (tx) => {
    const from = await moneyAccount(tx, input.fromAccountId);
    const to = await moneyAccount(tx, input.toAccountId);
    const date = parseJalali(input.date);
    const sentence = `حواله ${formatRial(input.amount)} ریال از ${from.name} به ${to.name}`;
    const doc = await createDoc(tx, {
      date,
      kind: "TRANSFER",
      accountId: from.id,
      userId,
      description: joinText(sentence, input.note),
    });
    await tx.documentRow.create({
      data: {
        documentId: doc.id,
        lineNo: 1,
        accountId: from.id,
        direction: "OUT",
        rowKind: "RIAL",
        rialDelta: flow.sourceRial,
        amountRial: input.amount,
        description: sentence,
      },
    });
    await tx.documentRow.create({
      data: {
        documentId: doc.id,
        lineNo: 2,
        accountId: to.id,
        direction: "IN",
        rowKind: "RIAL",
        rialDelta: flow.destRial,
        amountRial: input.amount,
        description: sentence,
      },
    });
    await audit(tx, userId, "POST_DOCUMENT", "Document", doc.id, sentence);
    return { documentId: doc.id, number: doc.number, itemIds: [] };
  }, txOptions);
}

async function assayContext(tx: Tx, itemId: string, actualAyar: number, kasr: number) {
  await lockItem(tx, itemId);
  await recomputeGoldItem(tx, itemId);
  const item = await tx.goldItem.findUnique({ where: { id: itemId }, include: { sourceAccount: true } });
  if (!item || item.hidden) throw new Error("قطعه پیدا نشد");
  if (!item.conditional) throw new Error("این قطعه شرطی نیست");
  if (item.assayState === "RESULTED") throw new Error("جواب ری این قطعه قبلاً ثبت شده است");
  if (!item.sourceAccountId || !item.sourceAccount) throw new Error("حساب مبدأ قطعه مشخص نیست");
  const outs = await tx.documentRow.findMany({
    where: { goldItemId: item.id, direction: "OUT", rowKind: "GOLD", document: { voidedAt: null } },
    include: { account: true },
  });
  const originRow = await tx.documentRow.findFirst({
    where: {
      goldItemId: item.id,
      documentId: item.originDocumentId,
      direction: "IN",
      rowKind: "GOLD",
      document: { voidedAt: null },
    },
  });
  const lines = computeAssay({
    originalScale: item.originalScale.toString(),
    original750: item.original750.toString(),
    actualAyar,
    kasrScale: kasr,
    originAffectsGram: !!originRow && !new Decimal(originRow.gramDelta.toString()).isZero(),
    originKey: item.sourceAccountId,
    outs: outs.map((row) => ({
      key: row.id,
      scale: row.scaleWeight?.toString() ?? "0",
      booked750: row.weight750?.toString() ?? "0",
    })),
  });
  return { item, outs, lines };
}

export async function previewAssay(itemId: string, actualAyar: number, kasr: number) {
  return prisma.$transaction(async (tx) => assayContext(tx, itemId, actualAyar, kasr));
}

export async function postAssay(
  userId: string,
  input: { date: string; itemId: string; ayar: number; kasr: number; labId?: string; envelopeNo?: string; note?: string },
): Promise<PostResult> {
  return prisma.$transaction(async (tx) => {
    const date = parseJalali(input.date);
    const { item, outs, lines } = await assayContext(tx, input.itemId, input.ayar, input.kasr);
    const changed = lines.some((line) => !line.partyGramDelta.isZero() || !line.stock750Delta.isZero());
    if (!changed) throw new Error("جواب با ثبت موقت یکی است و کسر ذوب ندارد");
    await ensureLab(tx, input.labId);
    const summary = `جواب ری ${pieceCode(item.code)} عیار ${formatAyar(input.ayar)} کسر ذوب ${formatWeight(input.kasr)}`;
    const doc = await createDoc(tx, {
      date,
      kind: "ASSAY",
      accountId: item.sourceAccountId!,
      userId,
      description: joinText(summary, input.note),
      meta: { goldItemId: item.id, ayar: dec2(input.ayar), kasr: dec3(input.kasr) },
    });
    const byAccount = new Map<string, Decimal>();
    for (const line of lines) {
      if (line.role === "STOCK" || line.partyGramDelta.isZero()) continue;
      const accountId = line.role === "ORIGIN" ? item.sourceAccountId! : outs.find((row) => row.id === line.key)?.accountId;
      if (!accountId) throw new Error("حساب اصلاح جواب ری پیدا نشد");
      byAccount.set(accountId, (byAccount.get(accountId) ?? new Decimal(0)).plus(line.partyGramDelta));
    }
    let lineNo = 1;
    if (!byAccount.has(item.sourceAccountId!)) {
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo,
          accountId: item.sourceAccountId!,
          direction: "IN",
          rowKind: "NOTE",
          goldItemId: item.id,
          ayar: dec2(input.ayar),
          description: summary,
        },
      });
      lineNo += 1;
    }
    for (const [accountId, delta] of byAccount) {
      if (delta.isZero()) continue;
      const abs = delta.abs();
      const side = delta.gt(0) ? "بدهکار" : "بستانکار";
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo,
          accountId,
          direction: delta.gt(0) ? "OUT" : "IN",
          rowKind: "ADJUSTMENT",
          goldItemId: item.id,
          ayar: dec2(input.ayar),
          weight750: dec3(abs),
          gramDelta: dec3(delta),
          description: `${summary} — اصلاح ${formatWeight(abs)} گرم ${side}`,
        },
      });
      lineNo += 1;
    }
    if (input.labId || input.envelopeNo) {
      await tx.goldItem.update({
        where: { id: item.id },
        data: {
          labId: input.labId || item.labId,
          envelopeNo: input.envelopeNo?.trim() ? input.envelopeNo.trim().slice(0, 40) : item.envelopeNo,
        },
      });
    }
    await recomputeGoldItem(tx, item.id);
    await audit(tx, userId, "ASSAY", "GoldItem", item.id, summary);
    return { documentId: doc.id, number: doc.number, itemIds: [item.id] };
  }, txOptions);
}

export async function postOpening(
  userId: string,
  input: {
    date: string;
    investorAccountId: string;
    cashAccountId: string;
    note?: string;
    cashRial: bigint;
    gold: { kind: GoldKind; scale: number; ayar: number; ang?: string; labId?: string; envelopeNo?: string }[];
    coins: { coinTypeId: string; count: number }[];
    rialDebits: { accountId: string; amount: bigint; note: string }[];
  },
): Promise<PostResult> {
  return prisma.$transaction(async (tx) => {
    const settings = await mustSettings(tx);
    const investor = await partyAccount(tx, input.investorAccountId);
    if (investor.group !== "INVESTOR") throw new Error("افتتاحیه روی حساب سرمایه‌گذار ثبت می‌شود");
    const cash = await tx.account.findUnique({ where: { id: input.cashAccountId } });
    if (!cash || cash.group !== "CASH") throw new Error("حساب صندوق افتتاحیه معتبر نیست");
    const date = parseJalali(input.date);
    const doc = await createDoc(tx, {
      date,
      kind: "OPENING",
      accountId: investor.id,
      userId,
      description: input.note?.trim() || "افتتاحیه",
    });
    let line = 1;
    const itemIds: string[] = [];
    for (const piece of input.gold) {
      const scale = new Decimal(piece.scale);
      assertScale(scale);
      const ayar = new Decimal(piece.ayar);
      const weight = weight750(scale, ayar, settings.standardAyar.toString());
      const item = await createPiece(tx, {
        docId: doc.id,
        kind: piece.kind,
        scale,
        ayar,
        weight,
        conditional: false,
        date,
        sourceAccountId: investor.id,
        ang: piece.ang,
        labId: piece.labId,
        envelopeNo: piece.envelopeNo,
      });
      const sentence = `${goldSentence({ verb: "مانده از قبل", kind: piece.kind, scale, ayar, weight750: weight })}`;
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo: line,
          accountId: investor.id,
          direction: "IN",
          rowKind: "GOLD",
          goldKind: piece.kind,
          goldItemId: item.id,
          scaleWeight: dec3(scale),
          ayar: dec2(ayar),
          weight750: dec3(weight),
          gramDelta: dec3(gramOnReceive(weight)),
          description: sentence,
        },
      });
      itemIds.push(item.id);
      line += 1;
    }
    if (input.cashRial > 0n) {
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo: line,
          accountId: cash.id,
          direction: "IN",
          rowKind: "RIAL",
          rialDelta: input.cashRial,
          amountRial: input.cashRial,
          description: `موجودی اول دوره صندوق ${formatRial(input.cashRial)} ریال`,
        },
      });
      line += 1;
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo: line,
          accountId: investor.id,
          direction: "OUT",
          rowKind: "RIAL",
          rialDelta: -input.cashRial,
          amountRial: input.cashRial,
          description: "سرمایه نقدی اول دوره",
        },
      });
      line += 1;
    }
    for (const debit of input.rialDebits) {
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo: line,
          accountId: debit.accountId,
          direction: "IN",
          rowKind: "RIAL",
          rialDelta: debit.amount,
          amountRial: debit.amount,
          description: debit.note,
        },
      });
      line += 1;
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo: line,
          accountId: investor.id,
          direction: "OUT",
          rowKind: "RIAL",
          rialDelta: -debit.amount,
          amountRial: debit.amount,
          description: debit.note,
        },
      });
      line += 1;
    }
    for (const coinLine of input.coins) {
      const coin = await tx.coinType.findUnique({ where: { id: coinLine.coinTypeId } });
      if (!coin) throw new Error("سکهٔ افتتاحیه پیدا نشد");
      const sentence = `مانده از قبل ${formatCount(coinLine.count)} عدد ${coin.name}`;
      await tx.documentRow.create({
        data: {
          documentId: doc.id,
          lineNo: line,
          accountId: investor.id,
          direction: "IN",
          rowKind: "COIN",
          coinTypeId: coin.id,
          count: coinLine.count,
          coinOp: "RECEIVE",
          coinDelta: -coinLine.count,
          stockCountDelta: coinLine.count,
          description: sentence,
        },
      });
      line += 1;
    }
    await audit(tx, userId, "POST_DOCUMENT", "Document", doc.id, "افتتاحیه");
    return { documentId: doc.id, number: doc.number, itemIds };
  }, txOptions);
}

export async function voidDocument(userId: string, documentId: string, reason: string): Promise<void> {
  const clean = reason.trim();
  if (clean.length < 3) throw new Error("دلیل ابطال را بنویسید");
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "ADMIN") throw new Error("فقط مدیر می‌تواند سند را ابطال کند");
    const doc = await tx.document.findUnique({ where: { id: documentId }, include: { rows: true } });
    if (!doc) throw new Error("سند پیدا نشد");
    if (doc.voidedAt) throw new Error("این سند قبلاً ابطال شده است");
    const itemIds = [...new Set(doc.rows.map((row) => row.goldItemId).filter((id): id is string => !!id))].sort();
    for (const id of itemIds) await lockItem(tx, id);
    for (const id of itemIds) {
      const later = await tx.document.findFirst({
        where: { voidedAt: null, number: { gt: doc.number }, rows: { some: { goldItemId: id } } },
      });
      if (later) throw new Error(`بعد از این سند، سند ${later.number} روی همان قطعه ثبت شده و ابطال ممکن نیست`);
    }
    await tx.document.update({
      where: { id: doc.id },
      data: { voidedAt: new Date(), voidedById: userId, voidReason: clean.slice(0, 300) },
    });
    for (const id of itemIds) await recomputeGoldItem(tx, id);
    await audit(tx, userId, "VOID_DOCUMENT", "Document", doc.id, `سند ${doc.number}: ${clean}`);
  }, txOptions);
}

export async function setMazane(
  userId: string,
  input: { date: string; mode: "mesghal" | "gram"; amount: bigint; note?: string },
) {
  if (input.amount <= 0n) throw new Error("مظنه باید بزرگ‌تر از صفر باشد");
  return prisma.$transaction(async (tx) => {
    const settings = await mustSettings(tx);
    const factor = mesghalToGramFactor(settings.mesghalGrams.toString(), settings.mesghalAyar.toString(), settings.standardAyar.toString());
    const date = parseJalali(input.date);
    const amount = new Decimal(input.amount.toString());
    const mazaneGram = input.mode === "gram" ? input.amount : rialFromGram(1, amount.div(factor));
    const mazaneMesghal = input.mode === "mesghal" ? input.amount : BigInt(mesghalPriceFromGram(amount, factor).toFixed(0));
    const row = await tx.mazane.create({
      data: {
        date,
        mazaneMesghal,
        mazaneGram,
        enteredAs: input.mode,
        note: (input.note ?? "").slice(0, 200),
        createdById: userId,
      },
    });
    await audit(tx, userId, "SET_MAZANE", "Mazane", row.id, `مثقال ${mazaneMesghal} / گرم ${mazaneGram}`);
    return row.id;
  });
}

async function ensureLab(tx: Tx, labId?: string) {
  if (!labId) return;
  const lab = await tx.assayLab.findUnique({ where: { id: labId } });
  if (!lab) throw new Error("آزمایشگاه ری‌گیری پیدا نشد");
}

function joinText(main: string, note?: string) {
  const extra = note?.trim();
  return extra ? `${main} — ${extra}` : main;
}
