import { foldFa } from "@/lib/person-match";

export type DeskRole = "ADMIN" | "OPERATOR";

export type DeskCommand = {
  id: string;
  title: string;
  href: string;
  hint: string;
  keywords: string[];
  shortcut?: string;
  adminOnly?: boolean;
  /** در فهرست خالیِ جستجو دیده می‌شود. */
  quick?: boolean;
};

export const DESK_COMMANDS: DeskCommand[] = [
  { id: "home", title: "پیشخوان", href: "/", hint: "صفحهٔ اصلی", keywords: ["خانه", "اصلی"] },
  { id: "sanad", title: "سند جدید", href: "/sanad", hint: "ثبت سند", keywords: ["ثبت سند", "سند", "معامله"], shortcut: "F2", quick: true },
  {
    id: "new-person",
    title: "شخص جدید",
    href: "/accounts/new",
    hint: "حساب تازه",
    keywords: ["حساب تازه", "مشتری جدید", "افزودن شخص"],
    shortcut: "Ctrl+Insert",
    quick: true,
  },
  { id: "accounts", title: "حساب اشخاص", href: "/accounts", hint: "کارت حساب و صورتحساب", keywords: ["اشخاص", "مشتری", "حساب"] },
  { id: "sandogh", title: "صندوق", href: "/sandogh", hint: "صندوق و بانک", keywords: ["بانک", "وجه", "نقد"], shortcut: "F4", quick: true },
  { id: "taraz", title: "تراز", href: "/taraz", hint: "ریال، گرم و سکه", keywords: ["ترازنامه", "بیلان"], shortcut: "F7", quick: true },
  {
    id: "inventory",
    title: "موجودی",
    href: "/inventory",
    hint: "آبشده و متفرقه",
    keywords: ["موجودی آبشده", "آبشده", "متفرقه"],
    shortcut: "F8",
    quick: true,
  },
  { id: "coins", title: "موجودی سکه", href: "/inventory/coins", hint: "تعداد صندوق و ملکی", keywords: ["سکه"] },
  { id: "journal", title: "دفتر روزنامه", href: "/journal", hint: "اسناد ثبت‌شده", keywords: ["روزنامه"], shortcut: "F9", quick: true },
  { id: "reports", title: "گزارشات", href: "/reports", hint: "تراز، روزنامه و موجودی", keywords: ["گزارش"], shortcut: "F11", quick: true },
  { id: "mazane", title: "مظنه", href: "/mazane", hint: "مثقال ۷۰۵ و گرم ۷۵۰", keywords: ["قیمت", "مثقال"] },
  { id: "assay", title: "جواب ری", href: "/assay", hint: "شرطی در انتظار جواب", keywords: ["ری‌گیری", "شرطی"] },
  { id: "settings", title: "تنظیمات", href: "/settings", hint: "عیار و نام فروشگاه", keywords: ["تنظیم"], shortcut: "Alt+F12", quick: true },
  { id: "users", title: "کاربران", href: "/users", hint: "فقط مدیر", keywords: ["کاربر"], adminOnly: true },
  { id: "audit", title: "حسابرسی", href: "/audit", hint: "فقط مدیر", keywords: ["لاگ"], adminOnly: true },
];

export const WARM_HREFS = ["/sanad", "/sandogh", "/taraz", "/inventory", "/journal", "/reports", "/settings", "/accounts", "/accounts/new"];

const SANAD_GROUPS = new Set(["CUSTOMER", "MAKER", "EXPENSE", "INVESTOR"]);

export function canStartSanad(group: string) {
  return SANAD_GROUPS.has(group);
}

export function filterCommands(commands: DeskCommand[], query: string, role: DeskRole): DeskCommand[] {
  const allowed = commands.filter((command) => !command.adminOnly || role === "ADMIN");
  const q = foldFa(query.trim());
  if (!q) return allowed.filter((command) => command.quick);
  const scored: { command: DeskCommand; score: number }[] = [];
  for (const command of allowed) {
    const title = foldFa(command.title);
    const extras = command.keywords.map((word) => foldFa(word));
    if (command.shortcut) extras.push(foldFa(command.shortcut));
    let score = 0;
    if (title === q || title.startsWith(q)) score = 80;
    else if (q.startsWith(title) && title.length >= 3) score = 70;
    else if (title.includes(q)) score = 60;
    else if (extras.some((word) => word.startsWith(q) || (q.startsWith(word) && word.length >= 3))) score = 50;
    else if (extras.some((word) => word.includes(q) || (word.length >= 3 && q.includes(word)))) score = 40;
    if (!score) continue;
    scored.push({ command, score });
  }
  scored.sort((a, b) => b.score - a.score || a.command.title.localeCompare(b.command.title, "fa"));
  return scored.map((row) => row.command);
}

export type ShortcutId = "search" | "help" | "sanad" | "sandogh" | "taraz" | "inventory" | "journal" | "reports" | "settings";

export type ShortcutLayer = "palette" | "help" | null;

export type KeyLike = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
};

export type ShortcutAction =
  | { type: "shortcut"; id: ShortcutId }
  | { type: "palette"; action: "up" | "down" | "open" | "secondary" | "close" }
  | { type: "help"; action: "close" };

export function hrefForShortcut(id: ShortcutId): string | null {
  if (id === "search" || id === "help") return null;
  return DESK_COMMANDS.find((command) => command.id === id)?.href ?? null;
}

export function isTypingTarget(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as { isContentEditable?: boolean; tagName?: string };
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function isSearchChord(key: string, ctrl: boolean, alt: boolean, shift: boolean) {
  return key === "F3" || (ctrl && !alt && !shift && key.toLowerCase() === "k");
}

/**
 * میانبر سراسری.
 * کلیدهای F حتی داخل فیلد کار می‌کنند. Ctrl+K هم همین‌طور.
 * بقیه هنگام تایپ خاموش‌اند تا با ثبت سند تداخل نکنند.
 */
export function resolveShortcut(event: KeyLike, ctx: { typing: boolean; layer: ShortcutLayer }): ShortcutAction | null {
  const key = event.key;
  const ctrl = Boolean(event.ctrlKey || event.metaKey);
  const alt = Boolean(event.altKey);
  const shift = Boolean(event.shiftKey);
  const fn = /^F\d{1,2}$/.test(key);
  const searchChord = isSearchChord(key, ctrl, alt, shift);

  if (ctx.layer === "palette") {
    if (key === "Escape") return { type: "palette", action: "close" };
    if (key === "ArrowDown") return { type: "palette", action: "down" };
    if (key === "ArrowUp") return { type: "palette", action: "up" };
    if (key === "Enter" && ctrl && !alt) return { type: "palette", action: "secondary" };
    if (key === "Enter" && !ctrl && !alt && !shift) return { type: "palette", action: "open" };
    if (searchChord) return { type: "palette", action: "close" };
    if (key === "F1" && !ctrl && !alt && !shift) return { type: "shortcut", id: "help" };
    if (!(fn || (alt && key === "F12"))) return null;
  }

  if (ctx.layer === "help") {
    if (key === "Escape" || (key === "F1" && !ctrl && !alt) || key === "?" || key === "؟") {
      return { type: "help", action: "close" };
    }
  }

  if (event.repeat) return null;
  if (searchChord) return { type: "shortcut", id: "search" };
  if (key === "F1" && !ctrl && !alt && !shift) return { type: "shortcut", id: "help" };

  const typing = ctx.typing && ctx.layer !== "palette";
  if (!fn && !(alt && key === "F12") && typing) return null;
  if ((key === "?" || key === "؟") && !ctrl && !alt && !typing) return { type: "shortcut", id: "help" };
  if (ctrl) return null;
  if (alt && key === "F12" && !shift) return { type: "shortcut", id: "settings" };
  if (alt && key.toLowerCase() === "u" && !shift && !typing) return { type: "shortcut", id: "inventory" };
  if (alt || shift) return null;

  switch (key) {
    case "F2":
      return { type: "shortcut", id: "sanad" };
    case "F4":
      return { type: "shortcut", id: "sandogh" };
    case "F7":
      return { type: "shortcut", id: "taraz" };
    case "F8":
      return { type: "shortcut", id: "inventory" };
    case "F9":
      return { type: "shortcut", id: "journal" };
    case "F11":
      return { type: "shortcut", id: "reports" };
    default:
      return null;
  }
}

export const shortcutHelp: { group: string; rows: { keys: string; label: string }[] }[] = [
  {
    group: "جابه‌جایی در دفتر",
    rows: [
      { keys: "Ctrl+K  ·  F3", label: "جستجو از هر صفحه، حتی داخل فیلد" },
      { keys: "F1  ·  ?", label: "همین راهنما. ? فقط بیرون از فیلد" },
      { keys: "F2", label: "سند جدید" },
      { keys: "F4", label: "صندوق و بانک" },
      { keys: "F7", label: "تراز" },
      { keys: "F8  ·  Alt+U", label: "موجودی آبشده و متفرقه. Alt+U بیرون از فیلد" },
      { keys: "F9", label: "دفتر روزنامه" },
      { keys: "F11", label: "گزارشات" },
      { keys: "Alt+F12", label: "تنظیمات" },
    ],
  },
  {
    group: "داخل فرم ثبت",
    rows: [
      { keys: "Enter", label: "فیلد بعدی" },
      { keys: "Shift+Enter", label: "فیلد قبلی" },
      { keys: "↑  ↓", label: "فیلد قبلی و بعدی" },
      { keys: "F5  ·  Ctrl+Enter", label: "ثبت" },
      { keys: "Esc", label: "پاک کردن فرم، اگر چیزی نوشته شده باشد" },
      { keys: "Ctrl+Insert", label: "شخص جدید" },
      { keys: "بعد از ثبت", label: "دکمهٔ «چاپ فاکتور» روی پیام ثبت. فوکوس فرم جابه‌جا نمی‌شود." },
    ],
  },
  {
    group: "فاکتور",
    rows: [
      { keys: "F6  ·  Ctrl+P", label: "چاپ فاکتور سند باز. وسط فرم ثبت کار نمی‌کند." },
    ],
  },
  {
    group: "پنجرهٔ جستجو",
    rows: [
      { keys: "↑  ↓", label: "حرکت بین نتیجه‌ها" },
      { keys: "Enter", label: "باز کردن" },
      { keys: "Ctrl+Enter", label: "سند جدید با همین شخص" },
      { keys: "Esc", label: "بستن" },
    ],
  },
];
