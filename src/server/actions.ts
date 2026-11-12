"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AccountGroup, GoldKind, Role } from "@prisma/client";
import { parseAmount, parseRial } from "@/lib/format";
import { createAccount, createUser, updateAccount, updateSettings, updateUser } from "@/server/admin";
import { login, logout, requireAdmin, requireUser } from "@/server/auth";
import {
  postAssay,
  postCash,
  postCoin,
  postFunds,
  postGoldIn,
  postGoldOut,
  postGoldTrade,
  postMelt,
  postSendPieces,
  postTransfer,
  setMazane,
  voidDocument,
  type PostResult,
} from "@/server/posting";
import type { CoinOp, MoneyLegDraft, PriceMode } from "@/lib/accounting";

export type ActionOk = { ok: true; id: string; number?: number };
export type ActionFail = { ok: false; error: string };

function readMoney(legs?: { via: "cash" | "bank"; amount: string; bankAccountId?: string }[]): MoneyLegDraft[] | undefined {
  if (!legs) return undefined;
  const parsed: MoneyLegDraft[] = [];
  for (const leg of legs) {
    if (!leg.amount.trim()) continue;
    const amount = parseRial(leg.amount);
    if (amount === 0n) continue;
    parsed.push({ via: leg.via, amount, bankAccountId: leg.bankAccountId || undefined });
  }
  return parsed;
}

function readCoinOffset(input?: { coinTypeId: string; count: string; unitPrice: string } | null) {
  if (!input || !input.count.trim() || !input.coinTypeId) return null;
  const count = Number(parseAmount(input.count).toFixed(0));
  if (count <= 0) return null;
  const unitPrice = input.unitPrice.trim() ? parseRial(input.unitPrice) : 0n;
  if (unitPrice <= 0n) throw new Error("فی سکهٔ تسویه را وارد کنید");
  return { coinTypeId: input.coinTypeId, count, unitPrice };
}

function readGoldOffset(input?: {
  scale: string;
  ayar?: string;
  kind?: GoldKind;
  itemId?: string;
  total?: string;
  ang?: string;
} | null) {
  if (!input || !input.scale.trim()) return null;
  const scale = parseAmount(input.scale);
  if (scale <= 0) return null;
  return {
    scale,
    ayar: input.ayar?.trim() ? parseAmount(input.ayar) : undefined,
    kind: input.kind,
    itemId: input.itemId || undefined,
    total: input.total?.trim() ? parseRial(input.total).toString() : undefined,
    ang: input.ang,
  };
}

function finish(result: PostResult): ActionOk {
  revalidatePath("/", "layout");
  return { ok: true, id: result.documentId, number: result.number };
}

function fail(error: unknown): ActionFail {
  if (typeof error === "object" && error && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
    throw error;
  }
  console.error(error);
  if (error instanceof Error && /[\u0600-\u06FF]/.test(error.message)) return { ok: false, error: error.message };
  return { ok: false, error: "خطا در انجام عملیات" };
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await login(username, password);
  if (!user) redirect("/login?e=1");
  redirect("/");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

export async function goldInAction(input: {
  date: string;
  accountId: string;
  kind: GoldKind;
  scale: string;
  ayar?: string;
  conditional: boolean;
  labId?: string;
  envelopeNo?: string;
  ang?: string;
  note?: string;
}): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    const result = await postGoldIn(user.id, {
      ...input,
      scale: parseAmount(input.scale),
      ayar: input.conditional || !input.ayar?.trim() ? undefined : parseAmount(input.ayar),
    });
    return finish(result);
  } catch (error) {
    return fail(error);
  }
}

export async function goldOutAction(input: {
  date: string;
  accountId: string;
  itemId: string;
  scale: string;
  note?: string;
}): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    return finish(await postGoldOut(user.id, { ...input, scale: parseAmount(input.scale) }));
  } catch (error) {
    return fail(error);
  }
}

export async function goldTradeAction(input: {
  side: "BUY" | "SELL";
  date: string;
  accountId: string;
  note?: string;
  settle: "account" | "cash" | "bank";
  bankAccountId?: string;
  money?: { via: "cash" | "bank"; amount: string; bankAccountId?: string }[];
  coinOffset?: { coinTypeId: string; count: string; unitPrice: string } | null;
  goldOffset?: { scale: string; ayar?: string; kind?: GoldKind; itemId?: string; total?: string; ang?: string } | null;
  mode: PriceMode;
  mazane?: string;
  total?: string;
  kind?: GoldKind;
  scale?: string;
  ayar?: string;
  itemId?: string;
  labId?: string;
  envelopeNo?: string;
  ang?: string;
}): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    return finish(
      await postGoldTrade(user.id, {
        ...input,
        mazane: input.mazane?.trim() ? parseAmount(input.mazane) : undefined,
        total: input.mode === "total" ? parseAmount(input.total || "") : undefined,
        scale: input.scale?.trim() ? parseAmount(input.scale) : undefined,
        ayar: input.ayar?.trim() ? parseAmount(input.ayar) : undefined,
        money: readMoney(input.money),
        coinOffset: readCoinOffset(input.coinOffset),
        goldOffset: readGoldOffset(input.goldOffset),
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

export async function meltAction(input: {
  date: string;
  meltAccountId: string;
  note?: string;
  sends: { itemId: string; scale: string }[];
  returns: { scale: string; ayar?: string; conditional: boolean; labId?: string; envelopeNo?: string; ang?: string }[];
}): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    return finish(
      await postMelt(user.id, {
        date: input.date,
        meltAccountId: input.meltAccountId,
        note: input.note,
        sends: input.sends.map((send) => ({ itemId: send.itemId, scale: parseAmount(send.scale) })),
        returns: input.returns.map((row) => ({
          scale: parseAmount(row.scale),
          ayar: row.ayar?.trim() ? parseAmount(row.ayar) : undefined,
          conditional: row.conditional,
          labId: row.labId,
          envelopeNo: row.envelopeNo,
          ang: row.ang,
        })),
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

export async function sendPiecesAction(input: {
  date: string;
  accountId: string;
  itemIds: string[];
  note?: string;
}): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    return finish(await postSendPieces(user.id, input));
  } catch (error) {
    return fail(error);
  }
}

export async function coinAction(input: {
  date: string;
  accountId: string;
  coinTypeId: string;
  op: CoinOp;
  count: string;
  unitPrice: string;
  settle: "account" | "cash" | "bank";
  bankAccountId?: string;
  money?: { via: "cash" | "bank"; amount: string; bankAccountId?: string }[];
  coinOffset?: { coinTypeId: string; count: string; unitPrice: string } | null;
  goldOffset?: { scale: string; ayar?: string; kind?: GoldKind; itemId?: string; total?: string } | null;
  note?: string;
}): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    return finish(
      await postCoin(user.id, {
        ...input,
        count: Number(parseAmount(input.count).toFixed(0)),
        unitPrice: input.unitPrice.trim() ? parseRial(input.unitPrice) : 0n,
        money: readMoney(input.money),
        coinOffset: readCoinOffset(input.coinOffset),
        goldOffset: readGoldOffset(input.goldOffset),
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

export async function cashAction(input: {
  date: string;
  accountId: string;
  direction: "IN" | "OUT";
  amount: string;
  via: "cash" | "bank";
  bankAccountId?: string;
  note?: string;
}): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    return finish(await postCash(user.id, { ...input, amount: parseRial(input.amount) }));
  } catch (error) {
    return fail(error);
  }
}

export async function fundsAction(input: {
  date: string;
  accountId: string;
  direction: "IN" | "OUT";
  note?: string;
  legs: { via: "cash" | "bank"; amount: string; bankAccountId?: string }[];
}): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    const legs = readMoney(input.legs) ?? [];
    return finish(await postFunds(user.id, { ...input, legs }));
  } catch (error) {
    return fail(error);
  }
}

export async function transferAction(input: {
  date: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  note?: string;
}): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    return finish(await postTransfer(user.id, { ...input, amount: parseRial(input.amount) }));
  } catch (error) {
    return fail(error);
  }
}

export async function assayAction(input: {
  date: string;
  itemId: string;
  ayar: string;
  kasr: string;
  labId?: string;
  envelopeNo?: string;
  note?: string;
}): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    return finish(
      await postAssay(user.id, {
        ...input,
        ayar: parseAmount(input.ayar),
        kasr: input.kasr.trim() ? parseAmount(input.kasr) : 0,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

export async function voidAction(id: string, reason: string): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireAdmin();
    await voidDocument(user.id, id, reason);
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function mazaneAction(input: { date: string; mode: "mesghal" | "gram"; amount: string; note?: string }): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    const id = await setMazane(user.id, { ...input, amount: parseRial(input.amount) });
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function createAccountAction(input: {
  name: string;
  family?: string;
  group: AccountGroup;
  phone?: string;
  mobile?: string;
  address?: string;
  nationalId?: string;
  note?: string;
  branch?: string;
  accountNo?: string;
  iban?: string;
}): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    const account = await createAccount(user.id, input);
    revalidatePath("/", "layout");
    return { ok: true, id: account.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updateAccountAction(
  id: string,
  input: {
    name: string;
    family?: string;
    phone?: string;
    mobile?: string;
    address?: string;
    nationalId?: string;
    note?: string;
    branch?: string;
    accountNo?: string;
    iban?: string;
    active: boolean;
  },
): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireUser();
    await updateAccount(user.id, id, input);
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function settingsAction(input: { shopName: string; defaultAyar: string; staleAbshodeDays: string }): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireAdmin();
    await updateSettings(user.id, {
      shopName: input.shopName,
      defaultAyar: parseAmount(input.defaultAyar),
      staleAbshodeDays: Number(parseAmount(input.staleAbshodeDays).toFixed(0)),
    });
    revalidatePath("/", "layout");
    return { ok: true, id: "1" };
  } catch (error) {
    return fail(error);
  }
}

export async function createUserAction(input: { username: string; name: string; password: string; role: Role }): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireAdmin();
    const created = await createUser(user.id, input);
    revalidatePath("/", "layout");
    return { ok: true, id: created.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updateUserAction(
  id: string,
  input: { name: string; role: Role; active: boolean; password?: string },
): Promise<ActionOk | ActionFail> {
  try {
    const user = await requireAdmin();
    await updateUser(user.id, id, input);
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}
