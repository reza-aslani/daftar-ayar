import { describe, expect, it } from "vitest";
import { DESK_COMMANDS, filterCommands, isTypingTarget, resolveShortcut } from "@/lib/commands";
import { digitQuery, documentNumberRanges } from "@/lib/search-query";
import { readRecent, rememberPerson } from "@/lib/recent-people";

const idle = { typing: false, layer: null } as const;

describe("میانبرهای سراسری", () => {
  it("جستجو و صفحه‌های اصلی زرین را می‌شناسد", () => {
    expect(resolveShortcut({ key: "F3" }, idle)).toEqual({ type: "shortcut", id: "search" });
    expect(resolveShortcut({ key: "k", ctrlKey: true }, idle)).toEqual({ type: "shortcut", id: "search" });
    expect(resolveShortcut({ key: "k", metaKey: true }, idle)).toEqual({ type: "shortcut", id: "search" });
    expect(resolveShortcut({ key: "F9" }, idle)).toEqual({ type: "shortcut", id: "journal" });
    expect(resolveShortcut({ key: "F11" }, idle)).toEqual({ type: "shortcut", id: "reports" });
    expect(resolveShortcut({ key: "F12", altKey: true }, idle)).toEqual({ type: "shortcut", id: "settings" });
    expect(resolveShortcut({ key: "u", altKey: true }, idle)).toEqual({ type: "shortcut", id: "inventory" });
    expect(resolveShortcut({ key: "F2" }, idle)?.type === "shortcut" && resolveShortcut({ key: "F2" }, idle)).toMatchObject({ id: "sanad" });
    expect(resolveShortcut({ key: "F4" }, idle)).toMatchObject({ id: "sandogh" });
    expect(resolveShortcut({ key: "F7" }, idle)).toMatchObject({ id: "taraz" });
    expect(resolveShortcut({ key: "F8" }, idle)).toMatchObject({ id: "inventory" });
    expect(resolveShortcut({ key: "F1" }, idle)).toMatchObject({ id: "help" });
    expect(resolveShortcut({ key: "?" }, idle)).toMatchObject({ id: "help" });
    expect(resolveShortcut({ key: "؟" }, idle)).toMatchObject({ id: "help" });
  });

  it("کلیدهای فرم ثبت را نمی‌دزدد", () => {
    expect(resolveShortcut({ key: "F5" }, idle)).toBeNull();
    expect(resolveShortcut({ key: "Enter", ctrlKey: true }, idle)).toBeNull();
    expect(resolveShortcut({ key: "Insert", ctrlKey: true }, idle)).toBeNull();
    expect(resolveShortcut({ key: "Enter" }, idle)).toBeNull();
    expect(resolveShortcut({ key: "Escape" }, idle)).toBeNull();
    expect(resolveShortcut({ key: "ArrowDown" }, idle)).toBeNull();
  });

  it("داخل فیلد فقط کلید کارکرد و Ctrl+K را می‌گیرد", () => {
    const typing = { typing: true, layer: null } as const;
    expect(resolveShortcut({ key: "F9" }, typing)).toMatchObject({ id: "journal" });
    expect(resolveShortcut({ key: "F3" }, typing)).toMatchObject({ id: "search" });
    expect(resolveShortcut({ key: "k", ctrlKey: true }, typing)).toMatchObject({ id: "search" });
    expect(resolveShortcut({ key: "F12", altKey: true }, typing)).toMatchObject({ id: "settings" });
    expect(resolveShortcut({ key: "u", altKey: true }, typing)).toBeNull();
    expect(resolveShortcut({ key: "?" }, typing)).toBeNull();
    expect(resolveShortcut({ key: "F2" }, typing)).toMatchObject({ id: "sanad" });
    expect(isTypingTarget({ tagName: "INPUT" })).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
  });

  it("پنجرهٔ جستجو فلش و اینتر را می‌گیرد و F3 را می‌بندد", () => {
    const palette = { typing: true, layer: "palette" } as const;
    expect(resolveShortcut({ key: "ArrowDown" }, palette)).toEqual({ type: "palette", action: "down" });
    expect(resolveShortcut({ key: "ArrowUp" }, palette)).toEqual({ type: "palette", action: "up" });
    expect(resolveShortcut({ key: "Enter" }, palette)).toEqual({ type: "palette", action: "open" });
    expect(resolveShortcut({ key: "Enter", ctrlKey: true }, palette)).toEqual({ type: "palette", action: "secondary" });
    expect(resolveShortcut({ key: "Escape" }, palette)).toEqual({ type: "palette", action: "close" });
    expect(resolveShortcut({ key: "F3" }, palette)).toEqual({ type: "palette", action: "close" });
    expect(resolveShortcut({ key: "a" }, palette)).toBeNull();
    expect(resolveShortcut({ key: "F9" }, palette)).toMatchObject({ id: "journal" });
  });

  it("تکرار کلید کارکرد صفحه را چند بار عوض نمی‌کند", () => {
    expect(resolveShortcut({ key: "F9", repeat: true }, idle)).toBeNull();
  });
});

describe("جستجوی صفحه", () => {
  it("نام فارسی، ی عربی و عبارت بلندتر را پیدا می‌کند", () => {
    expect(filterCommands(DESK_COMMANDS, "روزنامه", "OPERATOR").map((item) => item.id)).toContain("journal");
    expect(filterCommands(DESK_COMMANDS, "تنظيمات", "OPERATOR").map((item) => item.id)).toContain("settings");
    expect(filterCommands(DESK_COMMANDS, "صندوق و بانک", "OPERATOR").map((item) => item.id)).toContain("sandogh");
    expect(filterCommands(DESK_COMMANDS, "f9", "ADMIN").map((item) => item.id)).toContain("journal");
  });

  it("کاربر عملیات کاربران و حسابرسی را نمی‌بیند", () => {
    expect(filterCommands(DESK_COMMANDS, "کاربر", "OPERATOR")).toEqual([]);
    expect(filterCommands(DESK_COMMANDS, "کاربر", "ADMIN").map((item) => item.id)).toEqual(["users"]);
    expect(filterCommands(DESK_COMMANDS, "", "OPERATOR").some((item) => item.adminOnly)).toBe(false);
  });
});

describe("شماره سند", () => {
  it("رقم فارسی را می‌پذیرد و پیشوند را باز می‌کند", () => {
    expect(digitQuery("۱۲")).toBe("12");
    expect(digitQuery("١٢")).toBe("12");
    expect(digitQuery("سند ۱۲")).toBeNull();
    expect(digitQuery("")).toBeNull();
    expect(documentNumberRanges("12")).toEqual([
      { gte: 12, lte: 12 },
      { gte: 120, lte: 129 },
      { gte: 1200, lte: 1299 },
      { gte: 12000, lte: 12999 },
      { gte: 120000, lte: 129999 },
      { gte: 1200000, lte: 1299999 },
      { gte: 12000000, lte: 12999999 },
    ]);
    expect(documentNumberRanges("0")).toEqual([{ gte: 0, lte: 0 }]);
  });
});

describe("اشخاص اخیر", () => {
  it("آخرین نفر را اول می‌گذارد و تکراری را یکی می‌کند", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    const hossein = { id: "a", code: 104, title: "حسین محمدی", group: "CUSTOMER", groupLabel: "مشتری" };
    const fatemeh = { id: "b", code: 105, title: "فاطمه اکبری", group: "CUSTOMER", groupLabel: "مشتری" };
    rememberPerson(hossein, storage);
    rememberPerson(fatemeh, storage);
    rememberPerson(hossein, storage);
    expect(readRecent(storage).map((item) => item.id)).toEqual(["a", "b"]);
  });
});
