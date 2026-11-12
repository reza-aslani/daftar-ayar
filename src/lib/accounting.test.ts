import { describe, expect, it } from "vitest";
import {
  coinEconomics,
  computeAssay,
  cutPiece,
  gramOnPay,
  gramOnReceive,
  isStaleAbshode,
  meltingLoss,
  mesghalToGramFactor,
  priceGold,
  partyRemainder,
  planMoneySettlement,
  settlementLegs,
  transferLegs,
  weight750,
} from "@/lib/accounting";
import { addDaysUtc, formatJalali, parseJalali } from "@/lib/date";
import { parseAmount, parseRial } from "@/lib/format";

describe("تبدیل عیار به ۷۵۰", () => {
  it("۱۰۰ گرم عیار ۷۴۰ را ۹۸٫۶۶۷ گرم ۷۵۰ می‌کند", () => {
    expect(weight750(100, 740).toFixed(3)).toBe("98.667");
  });

  it("۷۰٫۵۳ گرم عیار ۷۴۰ را ۶۹٫۵۹۰ گرم ۷۵۰ می‌کند", () => {
    expect(weight750("70.53", 740).toFixed(3)).toBe("69.590");
  });

  it("عیار ۷۵۰ خود وزن را برمی‌گرداند", () => {
    expect(weight750("55.000", 750).toFixed(3)).toBe("55.000");
  });
});

describe("مظنه", () => {
  it("ضریب مثقال ۷۰۵ دقیقاً ۴٫۳۳۱۸۰۲ است", () => {
    expect(mesghalToGramFactor().toFixed(6)).toBe("4.331802");
  });

  it("پنج گرم ۷۵۰ با مظنهٔ ۵۳ میلیون ریال مثقال، ۶۱۱۷۵۴۶۵ ریال است", () => {
    const priced = priceGold({ scale: 5, ayar: 750, mode: "mesghal", mazane: 53_000_000 });
    expect(priced.weight750.toFixed(3)).toBe("5.000");
    expect(priced.totalRial).toBe(61175465n);
  });

  it("مظنهٔ گرمی را مستقیم در وزن ۷۵۰ ضرب می‌کند", () => {
    const priced = priceGold({ scale: "10.5", ayar: 750, mode: "gram", mazane: 12_000_000 });
    expect(priced.totalRial).toBe(126000000n);
  });

  it("مبلغ کل دستی، مثل مثال بدهکار دفتر، عیناً حفظ می‌شود", () => {
    const priced = priceGold({
      scale: "70.53",
      ayar: 740,
      mode: "total",
      totalRial: 119_000_000,
    });
    expect(priced.weight750.toFixed(3)).toBe("69.590");
    expect(priced.totalRial).toBe(119000000n);
    const debt = 159_000_000n + settlementLegs(priced.totalRial * -1n, priced.totalRial * -1n, false).tradePartyRial;
    expect(debt).toBe(40_000_000n);
  });
});

describe("جهت حساب", () => {
  it("دریافت طلا شخص را بستانکار و پرداخت او را بدهکار می‌کند", () => {
    expect(gramOnReceive("12.5").toFixed(3)).toBe("-12.500");
    expect(gramOnPay("12.5").toFixed(3)).toBe("12.500");
  });

  it("خرید نقد سکه، حساب شخص را صفر و صندوق را بستانکار مبلغ می‌کند", () => {
    const eco = coinEconomics("BUY", 3, 15_000_000n);
    expect(eco.stockCountDelta).toBe(3);
    expect(eco.coinDelta).toBe(0);
    const legs = settlementLegs(eco.tradePartyRial, eco.boxRialIfSettled, true);
    expect(legs.tradePartyRial + legs.settlePartyRial).toBe(0n);
    expect(legs.boxRial).toBe(-45_000_000n);
  });

  it("فروش نسیه سکه موجودی را کم و شخص را بدهکار می‌کند", () => {
    const eco = coinEconomics("SELL", 1, 835_000_000n);
    const legs = settlementLegs(eco.tradePartyRial, eco.boxRialIfSettled, false);
    expect(eco.stockCountDelta).toBe(-1);
    expect(legs.tradePartyRial).toBe(835_000_000n);
    expect(legs.boxRial).toBe(0n);
  });

  it("دریافت امانی سکه، صندوق را زیاد و شخص را بستانکار تعدادی می‌کند", () => {
    const eco = coinEconomics("RECEIVE", 2, 0n);
    expect(eco.stockCountDelta).toBe(2);
    expect(eco.coinDelta).toBe(-2);
    expect(eco.tradePartyRial).toBe(0n);
  });
});

describe("تسویه چندطرفه و حواله", () => {
  it("فروش را بخشی نقد و بخشی بانک تسویه می‌کند و مانده را بدهکار نگه می‌دارد", () => {
    const trade = 100_000_000n;
    const plan = planMoneySettlement({
      incoming: true,
      room: trade,
      legs: [
        { via: "cash", amount: 40_000_000n },
        { via: "bank", amount: 35_000_000n, bankAccountId: "mellat" },
      ],
    });
    expect(plan.settled).toBe(75_000_000n);
    expect(plan.legs[0].boxRial).toBe(40_000_000n);
    expect(plan.legs[0].partyRial).toBe(-40_000_000n);
    expect(plan.legs[1].boxRial).toBe(35_000_000n);
    expect(partyRemainder(trade, plan.settled)).toBe(25_000_000n);
  });

  it("خرید را با خروج وجه تسویه می‌کند و صندوق را بستانکار می‌کند", () => {
    const trade = -80_000_000n;
    const plan = planMoneySettlement({
      incoming: false,
      room: 80_000_000n,
      legs: [{ via: "cash", amount: 80_000_000n }],
    });
    expect(plan.legs[0].boxRial).toBe(-80_000_000n);
    expect(plan.legs[0].partyRial).toBe(80_000_000n);
    expect(partyRemainder(trade, plan.settled)).toBe(0n);
  });

  it("جمع تسویهٔ بیشتر از مبلغ سند را رد می‌کند", () => {
    expect(() =>
      planMoneySettlement({
        incoming: true,
        room: 10_000_000n,
        legs: [
          { via: "cash", amount: 6_000_000n },
          { via: "bank", amount: 5_000_000n, bankAccountId: "b" },
        ],
      }),
    ).toThrow(/بیشتر/);
  });

  it("حواله از صندوق به بانک جمع وجوه را عوض نمی‌کند", () => {
    const legs = transferLegs(20_000_000n);
    expect(legs.sourceRial + legs.destRial).toBe(0n);
    expect(legs.destRial).toBe(20_000_000n);
  });
});

describe("قیچی و ذوب", () => {
  it("تکهٔ آخر، خطای گرد کردن ۷۵۰ را جذب می‌کند", () => {
    const first = cutPiece({
      remainingScale: "10.000",
      remaining750: weight750(10, 740),
      cutScale: "3.333",
      ayar: 740,
    });
    const second = cutPiece({
      remainingScale: first.leftScale,
      remaining750: first.left750,
      cutScale: "3.333",
      ayar: 740,
    });
    const third = cutPiece({
      remainingScale: second.leftScale,
      remaining750: second.left750,
      cutScale: second.leftScale,
      ayar: 740,
    });
    const sum = first.cut750.plus(second.cut750).plus(third.cut750);
    expect(sum.toFixed(3)).toBe(weight750(10, 740).toFixed(3));
    expect(third.leftScale.toFixed(3)).toBe("0.000");
  });

  it("زیان ذوب اختلاف گرم ۷۵۰ ارسالی و دریافتی است", () => {
    const sent = weight750("32.450", 735);
    expect(sent.toFixed(3)).toBe("31.801");
    expect(meltingLoss(sent, "31.200").toFixed(3)).toBe("0.601");
  });
});

describe("جواب ری", () => {
  it("دریافت ۱۰۰ گرم شرطی با جواب ۷۳۵، دو گرم از بستانکاری و از صندوق کم می‌کند", () => {
    const lines = computeAssay({
      originalScale: 100,
      original750: 100,
      actualAyar: 735,
      kasrScale: 0,
      originAffectsGram: true,
      originKey: "A",
      outs: [],
    });
    const origin = lines.find((line) => line.role === "ORIGIN");
    const stock = lines.find((line) => line.role === "STOCK");
    expect(origin?.partyGramDelta.toFixed(3)).toBe("2.000");
    expect(stock?.new750.toFixed(3)).toBe("98.000");
    expect(stock?.stock750Delta.toFixed(3)).toBe("-2.000");
    const net = lines.reduce((sum, line) => sum.plus(line.partyGramDelta).plus(line.stock750Delta), origin!.partyGramDelta.minus(origin!.partyGramDelta));
    expect(net.toFixed(3)).toBe("0.000");
  });

  it("قیچی ۴۰ از ۱۰۰ و جواب ۷۳۵ بین تحویل‌دهنده، گیرنده و صندوق حفظ می‌شود", () => {
    const lines = computeAssay({
      originalScale: 100,
      original750: 100,
      actualAyar: 735,
      kasrScale: 0,
      originAffectsGram: true,
      originKey: "A",
      outs: [{ key: "B", scale: 40, booked750: 40 }],
    });
    const origin = lines.find((line) => line.key === "A")!;
    const out = lines.find((line) => line.key === "B")!;
    const stock = lines.find((line) => line.role === "STOCK")!;
    expect(origin.partyGramDelta.toFixed(3)).toBe("2.000");
    expect(out.partyGramDelta.toFixed(3)).toBe("-0.800");
    expect(stock.stock750Delta.toFixed(3)).toBe("-1.200");
    expect(stock.new750.toFixed(3)).toBe("58.800");
    const net = origin.partyGramDelta.plus(out.partyGramDelta).plus(stock.stock750Delta);
    expect(net.toFixed(3)).toBe("0.000");
  });

  it("کسر ذوب یک گرم با عیار ۷۵۰ فقط همان یک گرم را از سپرده کم می‌کند", () => {
    const lines = computeAssay({
      originalScale: "100.000",
      original750: "100.000",
      actualAyar: 750,
      kasrScale: "1.000",
      originAffectsGram: true,
      outs: [],
    });
    expect(lines.find((line) => line.role === "ORIGIN")?.partyGramDelta.toFixed(3)).toBe("1.000");
    expect(lines.find((line) => line.role === "STOCK")?.newScale.toFixed(3)).toBe("99.000");
  });

  it("خرید پولی شرطی به فروشنده گرم برنمی‌گرداند و فقط موجودی اصلاح می‌شود", () => {
    const lines = computeAssay({
      originalScale: 100,
      original750: 100,
      actualAyar: 735,
      kasrScale: 0,
      originAffectsGram: false,
      outs: [],
    });
    expect(lines.some((line) => line.role === "ORIGIN")).toBe(false);
    expect(lines.find((line) => line.role === "STOCK")?.stock750Delta.toFixed(3)).toBe("-2.000");
  });

  it("کسر خیلی کوچک بین سه تکه بدون گم شدن میلی‌گرم سرشکن می‌شود", () => {
    const lines = computeAssay({
      originalScale: "3.000",
      original750: "3.000",
      actualAyar: 750,
      kasrScale: "0.001",
      originAffectsGram: false,
      outs: [
        { key: "a", scale: "1.000", booked750: "1.000" },
        { key: "b", scale: "1.000", booked750: "1.000" },
        { key: "c", scale: "1.000", booked750: "1.000" },
      ],
    });
    const scales = lines.filter((line) => line.role === "OUT").reduce((sum, line) => sum.plus(line.newScale), lines[0].newScale.minus(lines[0].newScale));
    expect(scales.toFixed(3)).toBe("2.999");
  });
});

describe("راکد بودن آبشده و اعداد و تاریخ", () => {
  it("آبشدهٔ موجود از روز هفتم راکد است و متفرقه نه", () => {
    const today = new Date(Date.UTC(2026, 10, 11));
    const received = addDaysUtc(today, -7);
    expect(isStaleAbshode({ kind: "ABSHODE", inStock: true, receivedOn: received, today, staleDays: 7 })).toBe(true);
    expect(isStaleAbshode({ kind: "ABSHODE", inStock: true, receivedOn: addDaysUtc(today, -6), today, staleDays: 7 })).toBe(false);
    expect(isStaleAbshode({ kind: "MOTAFARREQE", inStock: true, receivedOn: received, today, staleDays: 7 })).toBe(false);
    expect(isStaleAbshode({ kind: "ABSHODE", inStock: false, receivedOn: received, today, staleDays: 7 })).toBe(false);
  });

  it("مبلغ با جداکنندهٔ زرین و اعشار اسلش خوانده می‌شود", () => {
    expect(parseAmount("159/000/000")).toBe(159000000);
    expect(parseAmount("۷۰/۵۳")).toBe(70.53);
    expect(parseAmount("۱٬۴۵۰٬۰۰۰")).toBe(1450000);
    expect(parseRial("119/000/000")).toBe(119000000n);
  });

  it("رفت و برگشت تاریخ شمسی", () => {
    const date = parseJalali("1405/01/01");
    expect(date.toISOString().slice(0, 10)).toBe("2026-03-21");
    expect(formatJalali(date)).toBe("1405/01/01");
  });
});
