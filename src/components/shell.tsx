import Link from "next/link";
import { logoutAction } from "@/server/actions";

const links = [
  { href: "/", label: "پیشخوان" },
  { href: "/accounts", label: "حساب‌ها" },
  { href: "/sanad", label: "ثبت سند" },
  { href: "/assay", label: "جواب ری" },
  { href: "/inventory", label: "موجودی طلا" },
  { href: "/inventory/coins", label: "موجودی سکه" },
  { href: "/reports", label: "مانده‌ها" },
  { href: "/journal", label: "روزنامه" },
  { href: "/mazane", label: "مظنه" },
];

export function Shell({
  shopName,
  user,
  children,
}: {
  shopName: string;
  user: { name: string; role: "ADMIN" | "OPERATOR" };
  children: React.ReactNode;
}) {
  const extra = user.role === "ADMIN" ? [{ href: "/settings", label: "تنظیمات" }, { href: "/users", label: "کاربران" }, { href: "/audit", label: "حسابرسی" }] : [{ href: "/settings", label: "تنظیمات" }];
  return (
    <div className="min-h-screen md:pr-64">
      <aside className="fixed inset-y-0 right-0 z-20 hidden w-64 flex-col border-l border-[#2b3a34] bg-[#16211e] text-[#f4ecdc] md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-xs tracking-wide text-[#e7d3a1]">دفتر عیار</div>
          <div className="mt-1 text-lg leading-6">{shopName}</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {[...links, ...extra].map((link) => (
            <Link key={link.href} href={link.href} className="rounded-xl px-3 py-2 text-sm hover:bg-white/8">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-sm">
          <div>{user.name}</div>
          <div className="text-xs text-[#e7d3a1]">{user.role === "ADMIN" ? "مدیر" : "کاربر عملیات"}</div>
          <form action={logoutAction} className="mt-3">
            <button className="text-xs text-white/70 hover:text-white">خروج</button>
          </form>
        </div>
      </aside>
      <div className="sticky top-0 z-10 border-b border-[#e4d9c6] bg-[#f7f3ea]/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs text-[#8d6a2e]">دفتر عیار</div>
            <div className="font-medium">{shopName}</div>
          </div>
          <form action={logoutAction}>
            <button className="text-sm text-[#6d6458]">خروج</button>
          </form>
        </div>
        <div className="flex gap-2 overflow-x-auto px-3 pb-3">
          {[...links, ...extra].map((link) => (
            <Link key={link.href} href={link.href} className="shrink-0 rounded-full bg-white px-3 py-1 text-sm shadow-sm">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
