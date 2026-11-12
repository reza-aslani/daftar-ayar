import Link from "next/link";
import { Money, RialText } from "@/components/balance";
import { formatJalaliFa, formatJalaliLong } from "@/lib/date";
import { formatWeight } from "@/lib/format";
import { DOC_LABEL, accountTitle } from "@/lib/labels";
import { getDashboard } from "@/server/queries";

const menu = [
  { n: "۲", href: "/accounts", title: "حساب اشخاص", hint: "کارت حساب و صورتحساب" },
  { n: "۳", href: "/sanad", title: "ثبت سند", hint: "آبشده، متفرقه و سکه" },
  { n: "۴", href: "/sandogh", title: "صندوق و بانک", hint: "دریافت، پرداخت، حواله" },
  { n: "۵", href: "/taraz", title: "تراز", hint: "ریال، گرم و سکه" },
  { n: "۶", href: "/inventory", title: "موجودی آبشده", hint: "قطعه و راکد" },
  { n: "۷", href: "/inventory/coins", title: "موجودی سکه", hint: "تعداد صندوق و ملکی" },
  { n: "۸", href: "/journal", title: "روزنامه", hint: "اسناد ثبت‌شده" },
  { n: "۹", href: "/mazane", title: "مظنه", hint: "مثقال ۷۰۵ و گرم ۷۵۰" },
];

export default async function HomePage() {
  const data = await getDashboard();
  return (
    <div className="space-y-4">
      <div className="z-window">
        <div className="z-cap">{data.settings.shopName}</div>
        <div className="grid gap-px bg-[#d3e2f4] sm:grid-cols-2 lg:grid-cols-4">
          <Strip title="تاریخ" body={formatJalaliLong(data.today)} />
          <Strip
            title="مظنه مثقال ۷۰۵"
            body={data.mazane ? <Money value={data.mazane.mazaneMesghal.toString()} /> : "ثبت نشده"}
            hint={data.mazane ? `گرم ۷۵۰: ` : undefined}
            extra={data.mazane ? <Money value={data.mazane.mazaneGram.toString()} /> : null}
          />
          <Strip title="طلای موجود ۷۵۰" body={<span><span className="num">{formatWeight(data.report.physical)}</span> گرم</span>} hint={`آبشده ${formatWeight(data.report.abshode)} · متفرقه ${formatWeight(data.report.motafareqe)}`} />
          <Strip title="طلای ملکی" body={<span><span className="num">{formatWeight(data.report.ownedGram)}</span> گرم</span>} hint="موجودی به‌علاوه طلب گرمی، منهای بدهی و سرمایه" />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.report.boxes.lines.map((line) => (
          <Link key={line.id} href="/sandogh" className="panel block p-3">
            <div className="text-sm text-[#4d6278]">{line.group === "CASH" ? "وجه صندوق" : line.title}</div>
            <div className="mt-1 text-lg"><RialText value={line.rial} toman asset /></div>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {menu.map((item) => (
          <Link key={item.href} href={item.href} className="z-tile">
            <span className="z-num">{item.n}</span>
            <span>
              <span className="block font-semibold">{item.title}</span>
              <span className="block text-xs text-[#4d6278]">{item.hint}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link href="/assay" className="panel block p-3">
          <div className="text-sm text-[#b45309]">شرطی در انتظار جواب</div>
          <div className="text-2xl">{data.pending.toLocaleString("fa-IR")}</div>
        </Link>
        <Link href="/inventory?filter=stale" className="panel block p-3">
          <div className="text-sm text-[#6d28d9]">آبشده راکد</div>
          <div className="text-2xl">{data.stale.toLocaleString("fa-IR")}</div>
        </Link>
      </div>
      <div className="panel overflow-x-auto">
        <div className="flex items-center justify-between px-3 pt-3">
          <h2 className="text-lg">آخرین سندها</h2>
          <Link href="/journal" className="text-sm text-[#0b4ea2]">روزنامه</Link>
        </div>
        <table className="ledger">
          <thead>
            <tr><th>شماره</th><th>تاریخ</th><th>نوع</th><th>حساب</th><th>شرح</th><th>ثبت</th></tr>
          </thead>
          <tbody>
            {data.recent.length === 0 ? (
              <tr><td colSpan={6}>هنوز سندی ثبت نشده است.</td></tr>
            ) : data.recent.map((doc) => (
              <tr key={doc.id} className={doc.voidedAt ? "opacity-50" : ""}>
                <td><Link href={`/documents/${doc.id}`}>{doc.number.toLocaleString("fa-IR")}</Link></td>
                <td>{formatJalaliFa(doc.date)}</td>
                <td>{DOC_LABEL[doc.kind]}{doc.voidedAt ? " (ابطال)" : ""}</td>
                <td>{accountTitle(doc.account.name, doc.account.family)}</td>
                <td>{doc.description}</td>
                <td>{doc.createdBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Strip({ title, body, hint, extra }: { title: string; body: React.ReactNode; hint?: string; extra?: React.ReactNode }) {
  return (
    <div className="bg-white p-3">
      <div className="text-sm text-[#4d6278]">{title}</div>
      <div className="mt-1 text-lg">{body}{extra ? <span className="mr-2 text-sm text-[#4d6278]">{extra}</span> : null}</div>
      {hint ? <div className="text-xs text-[#4d6278]">{hint}</div> : null}
    </div>
  );
}
