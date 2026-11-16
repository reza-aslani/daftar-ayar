import Link from "next/link";

const reports = [
  { href: "/taraz", title: "تراز", hint: "ریال، گرم و سکه", keys: "F7" },
  { href: "/journal", title: "دفتر روزنامه", hint: "اسناد به ترتیب شماره", keys: "F9" },
  { href: "/sandogh", title: "گزارش صندوق", hint: "ورود و خروج وجه در یک روز", keys: "F4" },
  { href: "/inventory", title: "موجودی آبشده", hint: "قطعه، شرطی و راکد", keys: "F8" },
  { href: "/inventory/coins", title: "موجودی سکه", hint: "تعداد صندوق و ملکی", keys: "" },
  { href: "/accounts", title: "مانده اشخاص", hint: "گرم، ریال و سکه", keys: "" },
  { href: "/assay", title: "جواب ری", hint: "شرطی‌های در انتظار", keys: "" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">گزارشات</h1>
        <p className="text-sm text-[#4d6278]">همان فهرست F11 زرین، با گزارش‌هایی که در این دفتر هست.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {reports.map((item) => (
          <Link key={item.href} href={item.href} className="z-tile">
            <span className="z-num text-[11px]">{item.keys || "›"}</span>
            <span>
              <span className="block font-semibold">{item.title}</span>
              <span className="block text-xs text-[#4d6278]">{item.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
