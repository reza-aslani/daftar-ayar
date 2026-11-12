import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

/** عیار مبنای دفتر. وزن‌ها برای ماندهٔ گرمی به این عیار تبدیل می‌شوند. */
export const STANDARD_AYAR = new Decimal(750);
/** عیار پیش‌فرض متفرقه، مطابق پیشنهاد زرین؛ از تنظیمات فروشگاه قابل تغییر است. */
export const DEFAULT_SCRAP_AYAR = new Decimal(740);
/** وزن یک مثقال به گرم. */
export const MESGHAL_GRAMS = new Decimal("4.6083");
/** عیار مظنهٔ بازار تهران. */
export const MESGHAL_AYAR = new Decimal(705);

const MILLI = 1000;

export function mScale(value: Decimal.Value): number {
  return new Decimal(value).toDecimalPlaces(3, Decimal.ROUND_HALF_UP).mul(MILLI).toNumber();
}

export function fromMilli(value: number): Decimal {
  return new Decimal(value).div(MILLI);
}

/** ضریب تبدیل مظنهٔ مثقال ۷۰۵ به قیمت یک گرم ۷۵۰: ۴٫۶۰۸۳ × ۷۰۵ / ۷۵۰ = ۴٫۳۳۱۸۰۲ */
export function mesghalToGramFactor(
  mesghalGrams: Decimal.Value = MESGHAL_GRAMS,
  mesghalAyar: Decimal.Value = MESGHAL_AYAR,
  standardAyar: Decimal.Value = STANDARD_AYAR,
): Decimal {
  return new Decimal(mesghalGrams).mul(mesghalAyar).div(standardAyar);
}

export function weight750(
  scale: Decimal.Value,
  ayar: Decimal.Value,
  standardAyar: Decimal.Value = STANDARD_AYAR,
): Decimal {
  return new Decimal(scale).mul(ayar).div(standardAyar).toDecimalPlaces(3);
}

export function gramPriceFromMesghal(mazaneMesghal: Decimal.Value, factor?: Decimal.Value): Decimal {
  const f = factor === undefined ? mesghalToGramFactor() : new Decimal(factor);
  if (f.lte(0)) throw new Error("ضریب مثقال نامعتبر است");
  return new Decimal(mazaneMesghal).div(f);
}

export function rialFromGram(weight: Decimal.Value, gramPrice: Decimal.Value): bigint {
  return BigInt(new Decimal(weight).mul(gramPrice).toDecimalPlaces(0).toFixed(0));
}

export function mesghalPriceFromGram(gramPrice: Decimal.Value, factor?: Decimal.Value): Decimal {
  const f = factor === undefined ? mesghalToGramFactor() : new Decimal(factor);
  return new Decimal(gramPrice).mul(f).toDecimalPlaces(0);
}

export type PriceMode = "mesghal" | "gram" | "total";

export function priceGold(input: {
  scale: Decimal.Value;
  ayar: Decimal.Value;
  mode: PriceMode;
  mazane?: Decimal.Value;
  totalRial?: Decimal.Value;
  mesghalGrams?: Decimal.Value;
  mesghalAyar?: Decimal.Value;
  standardAyar?: Decimal.Value;
}): {
  weight750: Decimal;
  gramPrice: Decimal;
  mesghalPrice: Decimal;
  totalRial: bigint;
} {
  const standard = input.standardAyar ?? STANDARD_AYAR;
  const w = weight750(input.scale, input.ayar, standard);
  if (w.lte(0)) throw new Error("وزن معادل ۷۵۰ صفر است");
  const factor = mesghalToGramFactor(input.mesghalGrams, input.mesghalAyar, standard);

  if (input.mode === "total") {
    if (input.totalRial === undefined) throw new Error("مبلغ کل را وارد کنید");
    const total = new Decimal(input.totalRial).toDecimalPlaces(0);
    if (total.lte(0)) throw new Error("مبلغ باید بزرگ‌تر از صفر باشد");
    const gramPrice = total.div(w);
    return {
      weight750: w,
      gramPrice,
      mesghalPrice: mesghalPriceFromGram(gramPrice, factor),
      totalRial: BigInt(total.toFixed(0)),
    };
  }

  if (input.mazane === undefined) throw new Error("مظنه را وارد کنید");
  const mazane = new Decimal(input.mazane);
  if (mazane.lte(0)) throw new Error("مظنه باید بزرگ‌تر از صفر باشد");
  const gramPrice = input.mode === "mesghal" ? gramPriceFromMesghal(mazane, factor) : mazane;
  const total = rialFromGram(w, gramPrice);
  if (total <= 0n) throw new Error("مبلغ محاسبه‌شده صفر است");
  const mesghalPrice = input.mode === "mesghal" ? mazane.toDecimalPlaces(0) : mesghalPriceFromGram(gramPrice, factor);
  return { weight750: w, gramPrice, mesghalPrice, totalRial: total };
}

/** دریافت طلا: طرف بستانکار می‌شود (ماندهٔ گرمی منفی). مثبت یعنی بدهکار. */
export function gramOnReceive(weight: Decimal.Value): Decimal {
  return new Decimal(weight).neg();
}

/** پرداخت طلا: طرف بدهکار می‌شود. */
export function gramOnPay(weight: Decimal.Value): Decimal {
  return new Decimal(weight);
}

export function cutPiece(input: {
  remainingScale: Decimal.Value;
  remaining750: Decimal.Value;
  cutScale: Decimal.Value;
  ayar: Decimal.Value;
  standardAyar?: Decimal.Value;
}): { cutScale: Decimal; cut750: Decimal; leftScale: Decimal; left750: Decimal } {
  const remS = mScale(input.remainingScale);
  const remW = mScale(input.remaining750);
  const cutS = mScale(input.cutScale);
  if (cutS <= 0) throw new Error("وزن خروجی باید بزرگ‌تر از صفر باشد");
  if (cutS > remS) throw new Error("وزن خروجی از ماندهٔ قطعه بیشتر است");
  if (cutS === remS) {
    return {
      cutScale: fromMilli(cutS),
      cut750: fromMilli(remW),
      leftScale: fromMilli(0),
      left750: fromMilli(0),
    };
  }
  const cutW = mScale(weight750(fromMilli(cutS), input.ayar, input.standardAyar ?? STANDARD_AYAR));
  const leftW = remW - cutW;
  if (leftW < 0) throw new Error("وزن ۷۵۰ مانده منفی می‌شود");
  return {
    cutScale: fromMilli(cutS),
    cut750: fromMilli(cutW),
    leftScale: fromMilli(remS - cutS),
    left750: fromMilli(leftW),
  };
}

export function meltingLoss(sent750: Decimal.Value, received750: Decimal.Value): Decimal {
  return new Decimal(sent750).minus(received750).toDecimalPlaces(3);
}

export type CoinOp = "BUY" | "SELL" | "RECEIVE" | "PAY";

export function coinEconomics(op: CoinOp, count: number, unitPriceRial: bigint): {
  stockCountDelta: number;
  coinDelta: number;
  /** اثر ریالی سند روی شخص، پیش از تسویه. خرید منفی است (بستانکار). */
  tradePartyRial: bigint;
  /** اثر ریالی روی صندوق یا بانک اگر همان لحظه تسویه شود. */
  boxRialIfSettled: bigint;
} {
  if (!Number.isInteger(count) || count <= 0) throw new Error("تعداد سکه باید عدد صحیح مثبت باشد");
  if (unitPriceRial < 0n) throw new Error("فی سکه منفی است");
  const total = BigInt(count) * unitPriceRial;
  if ((op === "BUY" || op === "SELL") && total <= 0n) {
    throw new Error("برای خرید و فروش، فی هر عدد لازم است");
  }
  switch (op) {
    case "BUY":
      return { stockCountDelta: count, coinDelta: 0, tradePartyRial: -total, boxRialIfSettled: -total };
    case "SELL":
      return { stockCountDelta: -count, coinDelta: 0, tradePartyRial: total, boxRialIfSettled: total };
    case "RECEIVE":
      return { stockCountDelta: count, coinDelta: -count, tradePartyRial: total, boxRialIfSettled: total };
    case "PAY":
      return { stockCountDelta: -count, coinDelta: count, tradePartyRial: total, boxRialIfSettled: total };
  }
}

export function settlementLegs(
  tradePartyRial: bigint,
  boxRialIfSettled: bigint,
  settled: boolean,
): { tradePartyRial: bigint; settlePartyRial: bigint; boxRial: bigint } {
  if (!settled) return { tradePartyRial, settlePartyRial: 0n, boxRial: 0n };
  return { tradePartyRial, settlePartyRial: -tradePartyRial, boxRial: boxRialIfSettled };
}

export type MoneyLegDraft = {
  via: "cash" | "bank";
  amount: bigint;
  bankAccountId?: string;
};

export type PlannedMoneyLeg = MoneyLegDraft & {
  partyRial: bigint;
  boxRial: bigint;
};

/**
 * تسویهٔ ریالی چندطرفه‌ای مثل ردیف‌های pd زرین.
 * incoming یعنی وجه وارد صندوق یا بانک می‌شود و شخص بستانکار می‌گردد (فروش، یا خریدِ پرداخت‌شده از سوی ما نیست).
 * room سقف باقی‌ماندهٔ مبلغ سند است؛ جمع وجه‌ها نباید از آن بگذرد. مانده در حساب همان room منهای جمع وجه‌هاست.
 */
export function planMoneySettlement(input: {
  incoming: boolean;
  room: bigint;
  legs: MoneyLegDraft[];
}): { legs: PlannedMoneyLeg[]; settled: bigint } {
  if (input.room < 0n) throw new Error("سقف تسویه نامعتبر است");
  const merged = new Map<string, MoneyLegDraft>();
  for (const leg of input.legs) {
    if (leg.amount === 0n) continue;
    if (leg.amount < 0n) throw new Error("مبلغ تسویه باید بزرگ‌تر از صفر باشد");
    if (leg.via === "bank" && !leg.bankAccountId) throw new Error("بانک تسویه را انتخاب کنید");
    const key = leg.via === "cash" ? "cash" : `bank:${leg.bankAccountId}`;
    const prev = merged.get(key);
    if (prev) prev.amount += leg.amount;
    else merged.set(key, { via: leg.via, amount: leg.amount, bankAccountId: leg.bankAccountId });
  }
  let settled = 0n;
  const legs: PlannedMoneyLeg[] = [];
  for (const leg of merged.values()) {
    settled += leg.amount;
    if (settled > input.room) throw new Error("جمع تسویه از مبلغ سند بیشتر است");
    legs.push({
      ...leg,
      partyRial: input.incoming ? -leg.amount : leg.amount,
      boxRial: input.incoming ? leg.amount : -leg.amount,
    });
  }
  return { legs, settled };
}

/** ماندهٔ شخص بعد از اثر معامله و تسویه‌ها. علامت مثبت هنوز بدهکار است. */
export function partyRemainder(tradePartyRial: bigint, settledAbs: bigint): bigint {
  if (tradePartyRial >= 0n) return tradePartyRial - settledAbs;
  return tradePartyRial + settledAbs;
}

/** حواله بین صندوق و بانک: مبدأ کم می‌شود و مقصد زیاد. جمع اثر روی وجوه صفر است. */
export function transferLegs(amount: bigint): { sourceRial: bigint; destRial: bigint } {
  if (amount <= 0n) throw new Error("مبلغ حواله باید بزرگ‌تر از صفر باشد");
  return { sourceRial: -amount, destRial: amount };
}

export function cashLegs(direction: "IN" | "OUT", amount: bigint): {
  partyRialDelta: bigint;
  boxRialDelta: bigint;
} {
  if (amount <= 0n) throw new Error("مبلغ باید بزرگ‌تر از صفر باشد");
  if (direction === "IN") return { partyRialDelta: -amount, boxRialDelta: amount };
  return { partyRialDelta: amount, boxRialDelta: -amount };
}

export function pieceAgeDays(receivedOn: Date, today: Date): number {
  return Math.floor((today.getTime() - receivedOn.getTime()) / 86_400_000);
}

/** آبشدهٔ موجود که سنش به حد راکد (پیش‌فرض ۷ روز) رسیده، مثل ردیف بنفش زرین. */
export function isStaleAbshode(input: {
  kind: "ABSHODE" | "MOTAFARREQE";
  inStock: boolean;
  receivedOn: Date;
  today: Date;
  staleDays: number;
}): boolean {
  if (input.kind !== "ABSHODE" || !input.inStock) return false;
  return pieceAgeDays(input.receivedOn, input.today) >= input.staleDays;
}

export type AssayRole = "ORIGIN" | "OUT" | "STOCK";

export type AssayLine = {
  key: string;
  role: AssayRole;
  scale: Decimal;
  newScale: Decimal;
  old750: Decimal;
  new750: Decimal;
  partyGramDelta: Decimal;
  stock750Delta: Decimal;
};

/**
 * جواب ری قطعهٔ شرطی.
 * تا پیش از جواب، وزن با عیار موقت ۷۵۰ در حساب نشسته است.
 * کسر ذوب به نسبت وزن بین ماندهٔ صندوق و تکه‌های خارج‌شده سرشکن می‌شود.
 * اگر دریافت اولیه حساب گرمی را گردانده باشد، مابه‌التفاوت کل به همان حساب برمی‌گردد
 * تا جمع اصلاح اشخاص و موجودی صفر بماند. خرید پولی حساب گرمی ندارد و افت عیار فقط
 * از موجودی (و از کسی که تکه گرفته) کم می‌شود.
 */
export function computeAssay(input: {
  originalScale: Decimal.Value;
  original750: Decimal.Value;
  actualAyar: Decimal.Value;
  kasrScale: Decimal.Value;
  originAffectsGram: boolean;
  originKey?: string;
  outs: { key: string; scale: Decimal.Value; booked750: Decimal.Value }[];
  standardAyar?: Decimal.Value;
}): AssayLine[] {
  const standard = new Decimal(input.standardAyar ?? STANDARD_AYAR);
  const ayar = new Decimal(input.actualAyar);
  if (ayar.lte(0) || ayar.gt(1000)) throw new Error("عیار جواب ری باید بزرگ‌تر از صفر و حداکثر ۱۰۰۰ باشد");

  const originalScale = mScale(input.originalScale);
  const original750 = mScale(input.original750);
  const kasr = mScale(input.kasrScale);
  if (originalScale <= 0) throw new Error("وزن قطعه نامعتبر است");
  if (kasr < 0) throw new Error("کسر ذوب نمی‌تواند منفی باشد");
  if (kasr > originalScale) throw new Error("کسر ذوب از وزن قطعه بیشتر است");

  const outs = input.outs.map((out) => ({
    key: out.key,
    scale: mScale(out.scale),
    booked: mScale(out.booked750),
  }));
  const outScale = outs.reduce((sum, out) => sum + out.scale, 0);
  const outBooked = outs.reduce((sum, out) => sum + out.booked, 0);
  if (outScale > originalScale) throw new Error("جمع قطعه‌های خارج‌شده از وزن اولیه بیشتر است");
  if (outBooked > original750 + 1) throw new Error("جمع وزن ۷۵۰ خارج‌شده از وزن اولیه بیشتر است");

  const stockScale = originalScale - outScale;
  const stockBooked = original750 - outBooked;
  if (stockBooked < 0) throw new Error("وزن ۷۵۰ صندوق منفی است");

  type Holder = { key: string; role: "OUT" | "STOCK"; scale: number; booked: number };
  const holders: Holder[] = outs.map((out) => ({
    key: out.key,
    role: "OUT",
    scale: out.scale,
    booked: out.booked,
  }));
  if (stockScale > 0 || holders.length === 0) {
    holders.push({ key: "stock", role: "STOCK", scale: stockScale, booked: stockBooked });
  }

  const shares = distributeMilli(kasr, holders.map((holder) => holder.scale));
  const targetScale = originalScale - kasr;
  const target750 = milliWeight(targetScale, ayar, standard);
  const drafted = holders.map((holder, index) => {
    const newScale = holder.scale - shares[index];
    if (newScale < 0) throw new Error("کسر ذوب سهم یک تکه را منفی کرد");
    return { ...holder, newScale, new750: milliWeight(newScale, ayar, standard) };
  });

  const rawSum = drafted.reduce((sum, holder) => sum + holder.new750, 0);
  const gap = target750 - rawSum;
  if (gap !== 0 && drafted.length > 0) {
    let index = 0;
    drafted.forEach((holder, i) => {
      if (holder.scale > drafted[index].scale) index = i;
    });
    drafted[index].new750 += gap;
  }

  const lines: AssayLine[] = [];
  if (input.originAffectsGram) {
    lines.push({
      key: input.originKey ?? "origin",
      role: "ORIGIN",
      scale: fromMilli(originalScale),
      newScale: fromMilli(targetScale),
      old750: fromMilli(original750),
      new750: fromMilli(target750),
      partyGramDelta: fromMilli(original750 - target750),
      stock750Delta: fromMilli(0),
    });
  }
  for (const holder of drafted) {
    const delta = holder.new750 - holder.booked;
    lines.push({
      key: holder.key,
      role: holder.role,
      scale: fromMilli(holder.scale),
      newScale: fromMilli(holder.newScale),
      old750: fromMilli(holder.booked),
      new750: fromMilli(holder.new750),
      partyGramDelta: holder.role === "OUT" ? fromMilli(delta) : fromMilli(0),
      stock750Delta: holder.role === "STOCK" ? fromMilli(delta) : fromMilli(0),
    });
  }
  return lines;
}

function milliWeight(scaleMilli: number, ayar: Decimal, standard: Decimal): number {
  return mScale(new Decimal(scaleMilli).div(MILLI).mul(ayar).div(standard));
}

/** سرشکن بزرگ‌ترین باقی‌مانده تا جمع سهم‌ها دقیقاً برابر کل شود. */
export function distributeMilli(total: number, weights: number[]): number[] {
  if (total < 0) throw new Error("مقدار سرشکن منفی است");
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  if (total === 0 || weights.length === 0) return weights.map(() => 0);
  if (sum <= 0) throw new Error("وزنی برای سرشکن کردن نیست");
  const raw = weights.map((weight) => (total * weight) / sum);
  const floors = raw.map((value) => Math.floor(value));
  const left = total - floors.reduce((acc, value) => acc + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  for (let step = 0; step < left; step += 1) floors[order[step % order.length].index] += 1;
  return floors;
}

export function sumAssay(lines: AssayLine[], field: "partyGramDelta" | "stock750Delta" | "newScale"): Decimal {
  return lines.reduce((sum, line) => sum.plus(line[field]), new Decimal(0));
}
