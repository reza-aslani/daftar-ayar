import type { AccountGroup } from "@prisma/client";
import Decimal from "decimal.js";
import { isStaleAbshode, pieceAgeDays } from "@/lib/accounting";
import { tehranTodayUtc } from "@/lib/date";
import { prisma } from "@/lib/db";
import type { AccountOption, DeskData, PendingPiece, StockPiece } from "@/lib/dto";
import { formatJalali } from "@/lib/date";
import { accountTitle, GROUP_LABEL, KIND_LABEL, pieceCode } from "@/lib/labels";

const moneyGroups: AccountGroup[] = ["CASH", "BANK"];
const personGroups: AccountGroup[] = ["CUSTOMER", "MAKER"];

function dec(value: { toString(): string } | null | undefined) {
  return new Decimal(value?.toString() ?? "0");
}

function titleOf(account: { name: string; family: string; code: number; id: string; group: AccountGroup }): AccountOption {
  return {
    id: account.id,
    code: account.code,
    title: accountTitle(account.name, account.family),
    group: account.group,
    groupLabel: GROUP_LABEL[account.group],
  };
}

export async function getSettings() {
  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  if (!settings) throw new Error("تنظیمات فروشگاه پیدا نشد");
  return settings;
}

export async function getDeskData(): Promise<DeskData> {
  const today = tehranTodayUtc();
  const [settings, mazane, accounts, items, coins, labs, stockRows] = await Promise.all([
    getSettings(),
    prisma.mazane.findFirst({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    prisma.account.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.goldItem.findMany({
      where: { hidden: false, status: "IN_STOCK" },
      orderBy: { code: "asc" },
    }),
    prisma.coinType.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.assayLab.findMany({ orderBy: { name: "asc" } }),
    prisma.documentRow.groupBy({
      by: ["coinTypeId"],
      where: { document: { voidedAt: null }, coinTypeId: { not: null } },
      _sum: { stockCountDelta: true },
    }),
  ]);
  const stock = new Map(stockRows.map((row) => [row.coinTypeId, row._sum.stockCountDelta ?? 0]));
  const options = accounts.map(titleOf);
  return {
    today: formatJalali(today),
    todayLabel: formatJalali(today),
    mazane: mazane
      ? { mesghal: mazane.mazaneMesghal.toString(), gram: mazane.mazaneGram.toString(), date: formatJalali(mazane.date) }
      : null,
    defaultAyar: settings.defaultAyar.toString(),
    standardAyar: settings.standardAyar.toString(),
    mesghalGrams: settings.mesghalGrams.toString(),
    mesghalAyar: settings.mesghalAyar.toString(),
    accounts: options.filter((account) => !moneyGroups.includes(account.group as AccountGroup)),
    pieces: items.map((item) => toPiece(item, today, settings.staleAbshodeDays)),
    coins: coins.map((coin) => ({
      id: coin.id,
      name: coin.name,
      buy: coin.buyPrice.toString(),
      sell: coin.sellPrice.toString(),
      stock: stock.get(coin.id) ?? 0,
    })),
    labs: labs.map((lab) => ({ id: lab.id, name: lab.name })),
    banks: options.filter((account) => account.group === "BANK"),
    expenseAccounts: options.filter((account) => account.group === "EXPENSE"),
    moneyAccounts: options.filter((account) => account.group === "CASH" || account.group === "BANK"),
  };
}

function toPiece(
  item: {
    id: string;
    code: number;
    kind: "MOTAFARREQE" | "ABSHODE";
    remainingScale: { toString(): string };
    remaining750: { toString(): string };
    ayar: { toString(): string };
    conditional: boolean;
    assayState: "NONE" | "PENDING" | "RESULTED";
    ang: string;
    receivedOn: Date;
    status: "IN_STOCK" | "OUT";
  },
  today: Date,
  staleDays: number,
): StockPiece {
  const inStock = item.status === "IN_STOCK";
  return {
    id: item.id,
    code: item.code,
    codeLabel: pieceCode(item.code),
    kind: item.kind,
    kindLabel: KIND_LABEL[item.kind],
    scale: item.remainingScale.toString(),
    weight750: item.remaining750.toString(),
    ayar: item.ayar.toString(),
    conditional: item.conditional,
    pending: item.assayState === "PENDING",
    stale: isStaleAbshode({ kind: item.kind, inStock, receivedOn: item.receivedOn, today, staleDays }),
    ang: item.ang,
    ageDays: pieceAgeDays(item.receivedOn, today),
  };
}

export async function accountBalances() {
  const [accounts, sums, coinSums, coinTypes] = await Promise.all([
    prisma.account.findMany({ orderBy: { code: "asc" } }),
    prisma.documentRow.groupBy({
      by: ["accountId"],
      where: { document: { voidedAt: null } },
      _sum: { gramDelta: true, rialDelta: true },
    }),
    prisma.documentRow.groupBy({
      by: ["accountId", "coinTypeId"],
      where: { document: { voidedAt: null }, NOT: { coinTypeId: null } },
      _sum: { coinDelta: true },
    }),
    prisma.coinType.findMany(),
  ]);
  const gram = new Map(sums.map((row) => [row.accountId, dec(row._sum.gramDelta)]));
  const rial = new Map(sums.map((row) => [row.accountId, row._sum.rialDelta ?? 0n]));
  const names = new Map(coinTypes.map((coin) => [coin.id, coin.name]));
  const coins = new Map<string, { coinTypeId: string; name: string; count: number }[]>();
  for (const row of coinSums) {
    if (!row.coinTypeId) continue;
    const count = row._sum.coinDelta ?? 0;
    if (count === 0) continue;
    const list = coins.get(row.accountId) ?? [];
    list.push({ coinTypeId: row.coinTypeId, name: names.get(row.coinTypeId) ?? "سکه", count });
    coins.set(row.accountId, list);
  }
  return accounts.map((account) => ({
    ...titleOf(account),
    family: account.family,
    name: account.name,
    phone: account.phone,
    mobile: account.mobile,
    address: account.address,
    nationalId: account.nationalId,
    note: account.note,
    branch: account.branch,
    accountNo: account.accountNo,
    iban: account.iban,
    active: account.active,
    system: account.system,
    group: account.group,
    gram: (gram.get(account.id) ?? new Decimal(0)).toFixed(3),
    rial: (rial.get(account.id) ?? 0n).toString(),
    coins: coins.get(account.id) ?? [],
  }));
}

export async function getAccount(id: string) {
  const rows = await accountBalances();
  return rows.find((row) => row.id === id) ?? null;
}

export async function getLedger(accountId: string) {
  const rows = await prisma.documentRow.findMany({
    where: { accountId, document: { voidedAt: null } },
    include: { document: { include: { createdBy: true } }, coinType: true },
    orderBy: [{ document: { date: "asc" } }, { document: { number: "asc" } }, { lineNo: "asc" }],
  });
  let gram = new Decimal(0);
  let rial = 0n;
  return rows.map((row) => {
    const g = dec(row.gramDelta);
    gram = gram.plus(g);
    rial += row.rialDelta;
    const coin =
      row.coinDelta && row.coinType
        ? `${row.coinType.name} ${Math.abs(row.coinDelta)} ${row.coinDelta > 0 ? "بدهکار" : "بستانکار"}`
        : "";
    return {
      id: row.id,
      documentId: row.documentId,
      number: row.document.number,
      date: row.document.date.toISOString(),
      description: row.description,
      gramDebit: g.gt(0) ? g.toFixed(3) : "",
      gramCredit: g.lt(0) ? g.neg().toFixed(3) : "",
      rialDebit: row.rialDelta > 0n ? row.rialDelta.toString() : "",
      rialCredit: row.rialDelta < 0n ? (-row.rialDelta).toString() : "",
      coin,
      runGram: gram.toFixed(3),
      runRial: rial.toString(),
      user: row.document.createdBy.name,
    };
  });
}

export async function getDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      account: true,
      createdBy: true,
      voidedBy: true,
      rows: { include: { account: true, coinType: true, goldItem: true }, orderBy: { lineNo: "asc" } },
    },
  });
}

export async function getJournal(kind?: string) {
  return prisma.document.findMany({
    where: kind && kind !== "ALL" ? { kind: kind as never } : undefined,
    include: { account: true, createdBy: true, _count: { select: { rows: true } } },
    orderBy: { number: "desc" },
    take: 200,
  });
}

export async function getInventory(filter: string) {
  const settings = await getSettings();
  const today = tehranTodayUtc();
  const items = await prisma.goldItem.findMany({
    where: { hidden: false },
    include: { sourceAccount: true, lab: true },
    orderBy: { code: "asc" },
  });
  return items
    .map((item) => {
      const piece = toPiece(item, today, settings.staleAbshodeDays);
      return {
        ...piece,
        status: item.status,
        assayState: item.assayState,
        envelopeNo: item.envelopeNo,
        lab: item.lab?.name ?? "",
        source: item.sourceAccount ? accountTitle(item.sourceAccount.name, item.sourceAccount.family) : "",
        received: item.receivedOn.toISOString(),
        originalScale: item.originalScale.toString(),
        note: item.note,
      };
    })
    .filter((item) => {
      if (filter === "pending") return item.pending;
      if (filter === "stale") return item.stale;
      if (filter === "out") return item.status === "OUT";
      if (filter === "all") return true;
      return item.status === "IN_STOCK";
    });
}

export async function getCoinReport() {
  const [types, stocks, balances] = await Promise.all([
    prisma.coinType.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.documentRow.groupBy({
      by: ["coinTypeId"],
      where: { document: { voidedAt: null }, NOT: { coinTypeId: null } },
      _sum: { stockCountDelta: true },
    }),
    prisma.documentRow.findMany({
      where: { document: { voidedAt: null }, coinDelta: { not: 0 }, coinTypeId: { not: null } },
      include: { account: true },
    }),
  ]);
  return types.map((coin) => {
    const stock = stocks.find((row) => row.coinTypeId === coin.id)?._sum.stockCountDelta ?? 0;
    const nets = new Map<string, { group: AccountGroup; count: number }>();
    for (const row of balances) {
      if (row.coinTypeId !== coin.id || !row.account) continue;
      const current = nets.get(row.accountId) ?? { group: row.account.group, count: 0 };
      current.count += row.coinDelta;
      nets.set(row.accountId, current);
    }
    let personDebit = 0;
    let personCredit = 0;
    let investorCredit = 0;
    let investorDebit = 0;
    for (const net of nets.values()) {
      if (net.count === 0) continue;
      if (net.group === "INVESTOR") {
        if (net.count > 0) investorDebit += net.count;
        else investorCredit += -net.count;
      } else if (personGroups.includes(net.group)) {
        if (net.count > 0) personDebit += net.count;
        else personCredit += -net.count;
      }
    }
    const owned = stock + personDebit + investorDebit - personCredit - investorCredit;
    return {
      id: coin.id,
      name: coin.name,
      stock,
      personDebit,
      personCredit,
      investorCredit,
      investorDebit,
      owned,
      buy: coin.buyPrice.toString(),
      sell: coin.sellPrice.toString(),
      stockValue: (BigInt(stock) * coin.sellPrice).toString(),
    };
  });
}

export async function getBalanceReport() {
  const [accounts, items] = await Promise.all([accountBalances(), prisma.goldItem.findMany({ where: { hidden: false, status: "IN_STOCK" } })]);
  let physical = new Decimal(0);
  let abshode = new Decimal(0);
  let motafareqe = new Decimal(0);
  let pending = new Decimal(0);
  let pendingCount = 0;
  for (const item of items) {
    const weight = dec(item.remaining750);
    physical = physical.plus(weight);
    if (item.kind === "ABSHODE") abshode = abshode.plus(weight);
    else motafareqe = motafareqe.plus(weight);
    if (item.assayState === "PENDING") {
      pending = pending.plus(weight);
      pendingCount += 1;
    }
  }
  const fold = (groups: AccountGroup[]) => {
    let gramDebit = new Decimal(0);
    let gramCredit = new Decimal(0);
    let rialDebit = 0n;
    let rialCredit = 0n;
    const lines = accounts.filter((account) => groups.includes(account.group));
    for (const account of lines) {
      const gram = new Decimal(account.gram);
      const rial = BigInt(account.rial);
      if (gram.gt(0)) gramDebit = gramDebit.plus(gram);
      if (gram.lt(0)) gramCredit = gramCredit.plus(gram.neg());
      if (rial > 0n) rialDebit += rial;
      if (rial < 0n) rialCredit += -rial;
    }
    return { lines, gramDebit, gramCredit, rialDebit, rialCredit };
  };
  const persons = fold(personGroups);
  const investors = fold(["INVESTOR"]);
  const expenses = fold(["EXPENSE"]);
  const boxes = fold(moneyGroups);
  const ownedGram = physical
    .plus(persons.gramDebit)
    .plus(investors.gramDebit)
    .minus(persons.gramCredit)
    .minus(investors.gramCredit);
  const rialPosition = boxes.rialDebit - boxes.rialCredit + persons.rialDebit + investors.rialDebit - persons.rialCredit - investors.rialCredit;
  return {
    physical: physical.toFixed(3),
    abshode: abshode.toFixed(3),
    motafareqe: motafareqe.toFixed(3),
    pending: pending.toFixed(3),
    pendingCount,
    persons,
    investors,
    expenses,
    boxes,
    ownedGram: ownedGram.toFixed(3),
    rialPosition: rialPosition.toString(),
    accounts,
  };
}

export async function getPendingPieces(): Promise<PendingPiece[]> {
  const items = await prisma.goldItem.findMany({
    where: { hidden: false, conditional: true, assayState: "PENDING" },
    include: { sourceAccount: true },
    orderBy: { code: "asc" },
  });
  const result: PendingPiece[] = [];
  for (const item of items) {
    const outs = await prisma.documentRow.findMany({
      where: { goldItemId: item.id, direction: "OUT", rowKind: "GOLD", document: { voidedAt: null } },
      include: { account: true },
    });
    const origin = await prisma.documentRow.findFirst({
      where: { goldItemId: item.id, documentId: item.originDocumentId, direction: "IN", rowKind: "GOLD", document: { voidedAt: null } },
    });
    result.push({
      id: item.id,
      code: item.code,
      codeLabel: pieceCode(item.code),
      kindLabel: KIND_LABEL[item.kind],
      scale: item.originalScale.toString(),
      original750: item.original750.toString(),
      received: item.receivedOn.toISOString(),
      sourceName: item.sourceAccount ? accountTitle(item.sourceAccount.name, item.sourceAccount.family) : "—",
      originAffectsGram: !!origin && !dec(origin.gramDelta).isZero(),
      originKey: item.sourceAccountId ?? "origin",
      ang: item.ang,
      envelopeNo: item.envelopeNo,
      labId: item.labId ?? "",
      outs: outs.map((row) => ({
        key: row.id,
        scale: row.scaleWeight?.toString() ?? "0",
        booked750: row.weight750?.toString() ?? "0",
        accountName: accountTitle(row.account.name, row.account.family),
      })),
    });
  }
  return result;
}

export async function getDashboard() {
  const [settings, mazane, recent, report, coins, pending] = await Promise.all([
    getSettings(),
    prisma.mazane.findFirst({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    prisma.document.findMany({
      include: { account: true, createdBy: true },
      orderBy: { number: "desc" },
      take: 8,
    }),
    getBalanceReport(),
    getCoinReport(),
    prisma.goldItem.count({ where: { hidden: false, assayState: "PENDING", conditional: true } }),
  ]);
  const today = tehranTodayUtc();
  const stale = (
    await prisma.goldItem.findMany({
      where: { hidden: false, status: "IN_STOCK", kind: "ABSHODE" },
    })
  ).filter((item) => isStaleAbshode({ kind: "ABSHODE", inStock: true, receivedOn: item.receivedOn, today, staleDays: settings.staleAbshodeDays })).length;
  return { settings, mazane, recent, report, coins, pending, stale, today };
}

export async function getMazaneHistory() {
  return prisma.mazane.findMany({ include: { createdBy: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 30 });
}

export async function getUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getAudit() {
  return prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 200 });
}

export async function getCashDesk(day: Date) {
  const [balances, coins, items] = await Promise.all([
    accountBalances(),
    getCoinReport(),
    prisma.goldItem.findMany({
      where: { hidden: false, status: "IN_STOCK" },
      select: { kind: true, remaining750: true },
    }),
  ]);
  let abshode = new Decimal(0);
  let motafareqe = new Decimal(0);
  for (const item of items) {
    const weight = dec(item.remaining750);
    if (item.kind === "ABSHODE") abshode = abshode.plus(weight);
    else motafareqe = motafareqe.plus(weight);
  }
  const boxes = balances.filter((account) => account.group === "CASH" || account.group === "BANK");
  const ids = boxes.map((box) => box.id);
  const [before, dayRows] = await Promise.all([
    ids.length
      ? prisma.documentRow.groupBy({
          by: ["accountId"],
          where: { accountId: { in: ids }, document: { voidedAt: null, date: { lt: day } } },
          _sum: { rialDelta: true },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.documentRow.findMany({
          where: {
            accountId: { in: ids },
            rialDelta: { not: 0 },
            document: { voidedAt: null, date: day },
          },
          include: { document: { include: { account: true, createdBy: true } } },
          orderBy: [{ document: { number: "asc" } }, { lineNo: "asc" }],
        })
      : Promise.resolve([]),
  ]);
  const opening = new Map(before.map((row) => [row.accountId, row._sum.rialDelta ?? 0n]));
  const books = boxes.map((box) => {
    let run = opening.get(box.id) ?? 0n;
    const open = run;
    let inn = 0n;
    let out = 0n;
    const lines = dayRows
      .filter((row) => row.accountId === box.id)
      .map((row) => {
        const delta = row.rialDelta;
        if (delta > 0n) inn += delta;
        if (delta < 0n) out += -delta;
        run += delta;
        return {
          id: row.id,
          documentId: row.documentId,
          number: row.document.number,
          kind: row.document.kind,
          description: row.description,
          party: row.document.accountId === box.id ? "" : accountTitle(row.document.account.name, row.document.account.family),
          partyId: row.document.accountId === box.id ? "" : row.document.accountId,
          delta: delta.toString(),
          run: run.toString(),
          direction: delta > 0n ? ("IN" as const) : ("OUT" as const),
          user: row.document.createdBy.name,
        };
      });
    return {
      id: box.id,
      code: box.code,
      title: box.title,
      group: box.group,
      branch: box.branch,
      accountNo: box.accountNo,
      iban: box.iban,
      opening: open.toString(),
      incoming: inn.toString(),
      outgoing: out.toString(),
      closing: run.toString(),
      lines,
    };
  });
  return {
    books,
    coins,
    abshode: abshode.toFixed(3),
    motafareqe: motafareqe.toFixed(3),
    physical: abshode.plus(motafareqe).toFixed(3),
    persons: balances.filter((account) => personGroups.includes(account.group)),
  };
}
