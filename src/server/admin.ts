import type { AccountGroup, Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/server/auth";

async function nextAccountCode() {
  const rows = await prisma.$queryRaw<Array<{ value: number }>>`
    UPDATE "Counter" SET value = value + 1 WHERE id = 'account' RETURNING value
  `;
  if (!rows[0]) throw new Error("شماره‌گذار حساب آماده نیست");
  return Number(rows[0].value);
}

const creatable: AccountGroup[] = ["CUSTOMER", "MAKER", "BANK", "EXPENSE", "INVESTOR"];

export async function createAccount(
  userId: string,
  input: {
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
  },
) {
  const name = input.name.trim();
  if (!name) throw new Error("نام حساب را وارد کنید");
  if (!creatable.includes(input.group)) throw new Error("این گروه را نمی‌توان از اینجا ساخت");
  const code = await nextAccountCode();
  const account = await prisma.account.create({
    data: {
      code,
      name,
      family: input.family?.trim() ?? "",
      group: input.group,
      phone: input.phone?.trim() ?? "",
      mobile: input.mobile?.trim() ?? "",
      address: input.address?.trim() ?? "",
      nationalId: input.nationalId?.trim() ?? "",
      note: input.note?.trim() ?? "",
      branch: input.branch?.trim() ?? "",
      accountNo: input.accountNo?.trim() ?? "",
      iban: input.iban?.trim().toUpperCase() ?? "",
    },
  });
  await prisma.auditLog.create({
    data: { userId, action: "CREATE_ACCOUNT", entity: "Account", entityId: account.id, detail: `${code} ${name}` },
  });
  return account;
}

export async function updateAccount(
  userId: string,
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
) {
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) throw new Error("حساب پیدا نشد");
  if (account.system && !input.active) throw new Error("حساب سیستمی را نمی‌توان غیرفعال کرد");
  const name = input.name.trim();
  if (!name) throw new Error("نام حساب را وارد کنید");
  await prisma.account.update({
    where: { id },
    data: {
      name,
      family: input.family?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
      mobile: input.mobile?.trim() ?? "",
      address: input.address?.trim() ?? "",
      nationalId: input.nationalId?.trim() ?? "",
      note: input.note?.trim() ?? "",
      branch: input.branch?.trim() ?? "",
      accountNo: input.accountNo?.trim() ?? "",
      iban: input.iban?.trim().toUpperCase() ?? "",
      active: input.active,
    },
  });
  await prisma.auditLog.create({
    data: { userId, action: "UPDATE_ACCOUNT", entity: "Account", entityId: id, detail: name },
  });
}

export async function updateSettings(
  userId: string,
  input: { shopName: string; defaultAyar: number; staleAbshodeDays: number },
) {
  const shopName = input.shopName.trim();
  if (!shopName) throw new Error("نام فروشگاه را وارد کنید");
  if (input.defaultAyar <= 0 || input.defaultAyar > 1000) throw new Error("عیار پیش‌فرض نامعتبر است");
  if (!Number.isInteger(input.staleAbshodeDays) || input.staleAbshodeDays < 1 || input.staleAbshodeDays > 365) {
    throw new Error("مهلت راکد بودن آبشده باید بین ۱ تا ۳۶۵ روز باشد");
  }
  await prisma.shopSettings.update({
    where: { id: 1 },
    data: {
      shopName,
      defaultAyar: new Prisma.Decimal(new Decimal(input.defaultAyar).toFixed(2)),
      staleAbshodeDays: input.staleAbshodeDays,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      action: "UPDATE_SETTINGS",
      entity: "ShopSettings",
      entityId: "1",
      detail: `${shopName} / عیار ${input.defaultAyar} / راکد ${input.staleAbshodeDays}`,
    },
  });
}

export async function createUser(actorId: string, input: { username: string; name: string; password: string; role: Role }) {
  const username = input.username.trim().toLowerCase();
  const name = input.name.trim();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("نام کاربری فقط حروف انگلیسی، عدد و خط تیره، حداقل ۳ حرف");
  if (!name) throw new Error("نام نمایشی را وارد کنید");
  if (input.password.length < 6) throw new Error("رمز حداقل ۶ حرف باشد");
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("این نام کاربری وجود دارد");
  const user = await prisma.user.create({
    data: { username, name, role: input.role, passwordHash: await hashPassword(input.password) },
  });
  await prisma.auditLog.create({
    data: { userId: actorId, action: "CREATE_USER", entity: "User", entityId: user.id, detail: `${username} ${input.role}` },
  });
  return user;
}

export async function updateUser(
  actorId: string,
  id: string,
  input: { name: string; role: Role; active: boolean; password?: string },
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("کاربر پیدا نشد");
  if (user.role === "ADMIN" && (input.role !== "ADMIN" || !input.active)) {
    const admins = await prisma.user.count({ where: { role: "ADMIN", active: true, NOT: { id } } });
    if (admins === 0) throw new Error("آخرین مدیر را نمی‌توان برداشت");
  }
  const name = input.name.trim();
  if (!name) throw new Error("نام نمایشی را وارد کنید");
  if (input.password && input.password.length > 0 && input.password.length < 6) throw new Error("رمز حداقل ۶ حرف باشد");
  await prisma.user.update({
    where: { id },
    data: {
      name,
      role: input.role,
      active: input.active,
      passwordHash: input.password && input.password.length > 0 ? await hashPassword(input.password) : undefined,
    },
  });
  await prisma.auditLog.create({
    data: { userId: actorId, action: "UPDATE_USER", entity: "User", entityId: id, detail: name },
  });
}
