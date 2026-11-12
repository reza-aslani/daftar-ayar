"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/actions";

const links = [
  { href: "/", label: "پیشخوان", n: "۱" },
  { href: "/accounts", label: "حساب اشخاص", n: "۲" },
  { href: "/sanad", label: "ثبت سند", n: "۳" },
  { href: "/sandogh", label: "صندوق و بانک", n: "۴" },
  { href: "/taraz", label: "تراز", n: "۵" },
  { href: "/inventory", label: "موجودی آبشده", n: "۶" },
  { href: "/inventory/coins", label: "موجودی سکه", n: "۷" },
  { href: "/journal", label: "روزنامه", n: "۸" },
  { href: "/mazane", label: "مظنه", n: "۹" },
  { href: "/assay", label: "جواب ری", n: "۱۰" },
];

const dock = [
  { href: "/", label: "خانه" },
  { href: "/sanad", label: "سند" },
  { href: "/sandogh", label: "صندوق" },
  { href: "/taraz", label: "تراز" },
  { href: "/accounts", label: "حساب‌ها" },
];

function isOn(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/inventory") return pathname === "/inventory";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({
  shopName,
  today,
  user,
  children,
}: {
  shopName: string;
  today: string;
  user: { name: string; role: "ADMIN" | "OPERATOR" };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const extra =
    user.role === "ADMIN"
      ? [
          { href: "/settings", label: "تنظیمات", n: "۱۱" },
          { href: "/users", label: "کاربران", n: "۱۲" },
          { href: "/audit", label: "حسابرسی", n: "۱۳" },
        ]
      : [{ href: "/settings", label: "تنظیمات", n: "۱۱" }];
  const all = [...links, ...extra];
  return (
    <div className="desk min-h-screen pb-16 md:pb-0 md:pr-60">
      <aside className="fixed inset-y-0 right-0 z-20 hidden w-60 flex-col border-l border-[#0a2f66] bg-[#0e3f86] text-white md:flex">
        <div className="border-b border-white/15 px-4 py-4">
          <div className="text-xs text-[#ffe08a]">دفتر عیار</div>
          <div className="mt-1 text-lg leading-6">{shopName}</div>
          <div className="mt-1 text-xs text-[#d6e6ff]">{today}</div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {all.map((link) => {
            const on = isOn(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-2 py-2 text-sm ${on ? "bg-[#fff4c2] font-semibold text-[#0e3f86]" : "hover:bg-white/10"}`}
              >
                <span className={`grid h-6 w-6 place-items-center text-xs ${on ? "bg-[#1e5aa6] text-white" : "bg-white/15"}`}>{link.n}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/15 p-4 text-sm">
          <div>{user.name}</div>
          <div className="text-xs text-[#ffe08a]">{user.role === "ADMIN" ? "مدیر" : "کاربر عملیات"}</div>
          <form action={logoutAction} className="mt-3">
            <button className="text-xs text-white/80">خروج</button>
          </form>
        </div>
      </aside>
      <header className="sticky top-0 z-30 border-b border-[#0a2f66] bg-[#0e3f86] text-white md:hidden">
        <div className="flex items-center justify-between px-3 py-2">
          <div>
            <div className="text-[11px] text-[#ffe08a]">دفتر عیار</div>
            <div className="text-sm font-semibold leading-5">{shopName}</div>
          </div>
          <div className="text-left text-[11px] text-[#d6e6ff]">
            <div>{today}</div>
            <form action={logoutAction}>
              <button className="text-white/80">خروج</button>
            </form>
          </div>
        </div>
        <details className="border-t border-white/15">
          <summary className="cursor-pointer px-3 py-2 text-sm">منوی دفتر</summary>
          <div className="grid grid-cols-2 gap-px bg-white/15">
            {all.map((link) => (
              <Link key={link.href} href={link.href} className="bg-[#0e3f86] px-3 py-3 text-sm">
                {link.n}. {link.label}
              </Link>
            ))}
          </div>
        </details>
      </header>
      <div className="hidden h-1 bg-[#c6a15b] md:block" />
      <main className="mx-auto w-full max-w-6xl px-3 py-4 md:px-6 md:py-6">{children}</main>
      <nav className="dock no-print">
        {dock.map((link) => (
          <Link key={link.href} href={link.href} className={isOn(pathname, link.href) ? "on" : ""}>
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
