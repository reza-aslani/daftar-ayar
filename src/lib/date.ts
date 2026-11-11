import { isValidJalaaliDate, toGregorian, toJalaali } from "jalaali-js";
import { toEnDigits, toFaDigits } from "@/lib/format";

const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

export function tehranTodayUtc(): Date {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function formatJalali(date: Date): string {
  const j = toJalaali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
}

export function formatJalaliFa(date: Date): string {
  return toFaDigits(formatJalali(date));
}

export function formatJalaliLong(date: Date): string {
  const j = toJalaali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  const weekday = WEEKDAYS[date.getUTCDay()];
  return `${weekday} ${toFaDigits(j.jd)} ${MONTHS[j.jm - 1]} ${toFaDigits(j.jy)}`;
}

export function parseJalali(input: string): Date {
  const latin = toEnDigits(input).trim().replaceAll("-", "/");
  const match = latin.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) throw new Error("تاریخ شمسی را به صورت ۱۴۰۴/۰۸/۲۰ وارد کنید");
  const jy = Number(match[1]);
  const jm = Number(match[2]);
  const jd = Number(match[3]);
  if (!isValidJalaaliDate(jy, jm, jd)) throw new Error("تاریخ شمسی معتبر نیست");
  const g = toGregorian(jy, jm, jd);
  return new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
}

export function sameUtcDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}
