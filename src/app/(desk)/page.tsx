import Link from "next/link";
import { GramText, Money, RialText } from "@/components/balance";
import { formatJalaliFa, formatJalaliLong } from "@/lib/date";
import { DOC_LABEL, accountTitle } from "@/lib/labels";
import { getDashboard } from "@/server/queries";

export default async function HomePage() {
  const data = await getDashboard();
  const cash = data.report.boxes.lines.find((line) => line.group === "CASH");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">{data.settings.shopName}</h1>
          <p className="text-sm text-[#6d6458]">{formatJalaliLong(data.today)}</p>
        </div>
        <Link href="/sanad" className="rounded-xl bg-[#8d6a2e] px-4 py-2 text-sm text-white">سند تازه</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Card title="مظنه مثقال ۷۰۵" value={data.mazane ? <Money value={data.mazane.mazaneMesghal.toString()} /> : "ثبت نشده"} hint={data.mazane ? `گرم ۷۵۰: ` : "از صفحه مظنه وارد کنید"} extra={data.mazane ? <Money value={data.mazane.mazaneGram.toString()} /> : null} />
        <Card title="صندوق" value={cash ? <RialText value={cash.rial} toman asset /> : "—"} />
        <Card title="طلای موجود ۷۵۰" value={<span><span className="num">{data.report.physical}</span> گرم</span>} hint={`آبشده ${data.report.abshode} · متفرقه ${data.report.motafareqe}`} />
        <Card title="طلای ملکی" value={<GramText value={data.report.ownedGram} />} hint="موجودی منهای بدهی گرمی و سرمایه" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Link href="/assay" className="panel block p-4">
          <div className="text-sm text-[#b45309]">شرطی در انتظار جواب</div>
          <div className="mt-1 text-2xl">{data.pending.toLocaleString("fa-IR")}</div>
        </Link>
        <Link href="/inventory?filter=stale" className="panel block p-4">
          <div className="text-sm text-[#6d28d9]">آبشده راکد</div>
          <div className="mt-1 text-2xl">{data.stale.toLocaleString("fa-IR")}</div>
          <div className="text-xs text-[#6d6458]">بیش از {data.settings.staleAbshodeDays.toLocaleString("fa-IR")} روز در صندوق</div>
        </Link>
      </div>
      <div className="panel overflow-x-auto">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-lg">آخرین سندها</h2>
          <Link href="/journal" className="text-sm text-[#8d6a2e]">روزنامه</Link>
        </div>
        <table className="ledger">
          <thead>
            <tr><th>شماره</th><th>تاریخ</th><th>نوع</th><th>حساب</th><th>شرح</th><th>ثبت</th></tr>
          </thead>
          <tbody>
            {data.recent.length === 0 ? (
              <tr><td colSpan={6} className="text-[#6d6458]">هنوز سندی ثبت نشده است.</td></tr>
            ) : data.recent.map((doc) => (
              <tr key={doc.id} className={doc.voidedAt ? "opacity-50" : ""}>
                <td><Link className="text-[#8d6a2e]" href={`/documents/${doc.id}`}>{doc.number.toLocaleString("fa-IR")}</Link></td>
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
      <div className="panel overflow-x-auto p-4">
        <h2 className="mb-2 text-lg">سکه در صندوق</h2>
        <div className="flex flex-wrap gap-3">
          {data.coins.map((coin) => (
            <div key={coin.id} className="rounded-xl bg-[#faf6ee] px-3 py-2 text-sm">
              {coin.name}: {coin.stock.toLocaleString("fa-IR")}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, hint, extra }: { title: string; value: React.ReactNode; hint?: string; extra?: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <div className="text-sm text-[#6d6458]">{title}</div>
      <div className="mt-2 text-xl">{value}</div>
      {extra ? <div className="text-sm text-[#6d6458]">{extra}</div> : null}
      {hint ? <div className="mt-1 text-xs text-[#6d6458]">{hint}</div> : null}
    </div>
  );
}
