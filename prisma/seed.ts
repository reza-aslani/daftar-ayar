import { Prisma, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { addDaysUtc, formatJalali, tehranTodayUtc } from "../src/lib/date";
import {
  postAssay,
  postCash,
  postCoin,
  postGoldIn,
  postGoldOut,
  postGoldTrade,
  postMelt,
  postOpening,
  setMazane,
} from "../src/server/posting";

const prisma = new PrismaClient();

async function main() {
  if (await prisma.user.count()) {
    console.log("seed already applied");
    return;
  }

  const today = tehranTodayUtc();
  const day = (ago: number) => formatJalali(addDaysUtc(today, -ago));
  const reza = await prisma.user.create({
    data: { username: "reza", name: "رضا اصلانی", role: "ADMIN", passwordHash: await hash("ayar750", 10) },
  });
  const sara = await prisma.user.create({
    data: { username: "sara", name: "سارا محمدی", role: "OPERATOR", passwordHash: await hash("ayar740", 10) },
  });

  await prisma.shopSettings.create({
    data: {
      id: 1,
      shopName: "طلافروشی رضایی",
      defaultAyar: new Prisma.Decimal("740.00"),
      standardAyar: new Prisma.Decimal("750.00"),
      mesghalGrams: new Prisma.Decimal("4.6083"),
      mesghalAyar: new Prisma.Decimal("705.00"),
      staleAbshodeDays: 7,
    },
  });
  await prisma.counter.createMany({
    data: [
      { id: "account", value: 108 },
      { id: "document", value: 999 },
      { id: "gold", value: 1000 },
    ],
  });

  const kimia = await prisma.assayLab.create({ data: { name: "آزمایشگاه کیمیا" } });
  await prisma.assayLab.create({ data: { name: "ری‌گیری مرکزی" } });

  const emami = await prisma.coinType.create({ data: { code: "emami", name: "سکه تمام امامی", buyPrice: 820_000_000n, sellPrice: 835_000_000n, sort: 1 } });
  const bahar = await prisma.coinType.create({ data: { code: "bahar", name: "سکه تمام بهار آزادی", buyPrice: 800_000_000n, sellPrice: 815_000_000n, sort: 2 } });
  await prisma.coinType.create({ data: { code: "old", name: "سکه تمام قدیم", buyPrice: 790_000_000n, sellPrice: 805_000_000n, sort: 3 } });
  const nim = await prisma.coinType.create({ data: { code: "nim", name: "سکه نیم", buyPrice: 430_000_000n, sellPrice: 440_000_000n, sort: 4 } });
  const rob = await prisma.coinType.create({ data: { code: "rob", name: "سکه ربع", buyPrice: 240_000_000n, sellPrice: 248_000_000n, sort: 5 } });
  const gerami = await prisma.coinType.create({ data: { code: "gerami", name: "سکه گرمی", buyPrice: 95_000_000n, sellPrice: 99_000_000n, sort: 6 } });

  const cash = await prisma.account.create({ data: { code: 100, name: "صندوق", group: "CASH", system: true } });
  const bank = await prisma.account.create({ data: { code: 101, name: "بانک ملت", group: "BANK", system: true, note: "حساب جاری مغازه" } });
  const investor = await prisma.account.create({ data: { code: 102, name: "سرمایه‌گذار", family: "مغازه", group: "INVESTOR", system: true } });
  const melt = await prisma.account.create({ data: { code: 103, name: "ذوب", group: "EXPENSE", system: true, note: "سوخت گرم و ریال ذوب" } });
  const hossein = await prisma.account.create({ data: { code: 104, name: "حسین", family: "محمدی", group: "CUSTOMER", mobile: "09121234567", address: "بازار زرگرها" } });
  const fatemeh = await prisma.account.create({ data: { code: 105, name: "فاطمه", family: "اکبری", group: "CUSTOMER", mobile: "09129876543" } });
  const kian = await prisma.account.create({ data: { code: 106, name: "کارگاه کیان", group: "MAKER", phone: "02155667788" } });
  await prisma.account.create({ data: { code: 107, name: "مشتری نقدی", group: "CUSTOMER", note: "معامله‌های بدون پرونده جدا" } });
  await prisma.account.create({ data: { code: 108, name: "بانک صادرات", group: "BANK" } });

  await setMazane(reza.id, { date: day(20), mode: "mesghal", amount: 470_000_000n, note: "مظنه شروع دوره نمونه" });
  await setMazane(reza.id, { date: day(0), mode: "mesghal", amount: 485_000_000n, note: "مظنه امروز نمونه" });

  await postOpening(reza.id, {
    date: day(20),
    investorAccountId: investor.id,
    cashAccountId: cash.id,
    note: "افتتاحیه و مانده از قبل",
    cashRial: 15_000_000_000n,
    gold: [{ kind: "ABSHODE", scale: 200, ayar: 750, ang: "کارگشایی" }],
    coins: [
      { coinTypeId: emami.id, count: 8 },
      { coinTypeId: bahar.id, count: 4 },
      { coinTypeId: nim.id, count: 10 },
      { coinTypeId: rob.id, count: 20 },
      { coinTypeId: gerami.id, count: 15 },
    ],
    rialDebits: [{ accountId: hossein.id, amount: 159_000_000n, note: "مانده از قبل" }],
  });

  const deposit = await postGoldIn(reza.id, {
    date: day(12),
    accountId: hossein.id,
    kind: "ABSHODE",
    scale: 45.32,
    ayar: 748,
    conditional: false,
    labId: kimia.id,
    envelopeNo: "4412",
    ang: "کیمیا",
    note: "آبشده دریافتی",
  });

  const bought = await postGoldTrade(reza.id, {
    side: "BUY",
    date: day(8),
    accountId: fatemeh.id,
    settle: "cash",
    mode: "mesghal",
    mazane: 470_000_000,
    kind: "MOTAFARREQE",
    scale: 32.45,
    ayar: 735,
    note: "خرید متفرقه با مظنه و تسویه نقد",
  });

  await postGoldTrade(reza.id, {
    side: "BUY",
    date: day(6),
    accountId: hossein.id,
    settle: "account",
    mode: "total",
    total: 119_000_000,
    kind: "MOTAFARREQE",
    scale: 70.53,
    ayar: 740,
    note: "خرید برای کم کردن بدهی قبلی؛ مانده باید ۴۰ میلیون باشد",
  });

  const conditional = await postGoldIn(reza.id, {
    date: day(5),
    accountId: fatemeh.id,
    kind: "MOTAFARREQE",
    scale: 18.75,
    conditional: true,
    note: "متفرقه شرطی",
  });

  await postGoldIn(reza.id, {
    date: day(4),
    accountId: kian.id,
    kind: "ABSHODE",
    scale: 55,
    conditional: true,
    note: "آبشده شرطی، منتظر جواب",
  });

  await postAssay(reza.id, {
    date: day(3),
    itemId: conditional.itemIds[0],
    ayar: 728,
    kasr: 0.35,
    labId: kimia.id,
    envelopeNo: "7781",
    note: "جواب ری و کسر ذوب",
  });

  await postMelt(reza.id, {
    date: day(2),
    meltAccountId: melt.id,
    note: "ذوب متفرقه خریداری‌شده",
    sends: [{ itemId: bought.itemIds[0], scale: 32.45 }],
    returns: [{ scale: 31.2, ayar: 750, conditional: false, ang: "ذوب رضایی" }],
  });

  await postGoldOut(reza.id, {
    date: day(1),
    accountId: kian.id,
    itemId: deposit.itemIds[0],
    scale: 10,
    note: "قیچی بخشی از آبشده",
  });

  await postCoin(sara.id, {
    date: day(1),
    accountId: fatemeh.id,
    coinTypeId: emami.id,
    op: "BUY",
    count: 3,
    unitPrice: 820_000_000n,
    settle: "cash",
    note: "خرید سه تمام امامی",
  });
  await postCoin(reza.id, {
    date: day(1),
    accountId: hossein.id,
    coinTypeId: emami.id,
    op: "SELL",
    count: 1,
    unitPrice: 835_000_000n,
    settle: "cash",
    note: "فروش یک امامی",
  });
  await postCoin(reza.id, {
    date: day(1),
    accountId: fatemeh.id,
    coinTypeId: nim.id,
    op: "RECEIVE",
    count: 2,
    unitPrice: 0n,
    settle: "account",
    note: "امانت دو نیم‌سکه",
  });

  await postCash(sara.id, {
    date: day(0),
    accountId: hossein.id,
    direction: "IN",
    amount: 20_000_000n,
    via: "bank",
    bankAccountId: bank.id,
    note: "علی‌الحساب روی بدهی",
  });

  console.log("seeded طلافروشی رضایی");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
