import { randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/cookie";
import { prisma } from "@/lib/db";

export { SESSION_COOKIE };
const SESSION_DAYS = 14;

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
  if (!user || !user.active) return null;
  const ok = await compare(password, user.passwordHash);
  if (!ok) return null;
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.session.create({ data: { token, userId: user.id, expiresAt } });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id, detail: user.username },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.COOKIE_SECURE === "1",
    maxAge: SESSION_DAYS * 86_400,
  });
  return user;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  jar.delete(SESSION_COOKIE);
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt.getTime() < Date.now() || !session.user.active) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

export async function requireUser() {
  const user = await getSession();
  if (!user) {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("فقط مدیر به این کار دسترسی دارد");
  return user;
}
