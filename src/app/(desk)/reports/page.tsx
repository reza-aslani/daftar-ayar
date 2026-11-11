import Link from "next/link";
import { GramText, Money, RialText } from "@/components/balance";
import { formatWeight } from "@/lib/format";
import { getBalanceReport, getCoinReport } from "@/server/queries";

export default async function ReportsPage() {
  const [report, coins] = await Promise.all([getBalanceReport(), getCoinReport()]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">مانده‌ها</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#6d6458]">
          طلای ملکی = موجودی فیزیکی ۷۵۰ + طلب گرمی اشخاص − بدهی گرمی اشخاص − سرمایهٔ بستانکار.
          خرید و فروش پولی این عدد را جابه‌جا می‌کند چون گرم در حساب شخص نمی‌نشیند. زیان ذوب از خود موجودی کم شده و جدا در حساب سوخت دیده می‌شود.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Stat title="موجودی فیزیکی" body={<span className="num">{formatWeight(report.physical)} گرم</span>} hint={`آبشده ${formatWeight(report.abshode)} · متفرقه ${formatWeight(report.motafareqe)}`} />
        <Stat title="شرطیِ باز" body={<span>{report.pendingCount.toLocaleString("fa-IR")} قطعه</span>} hint={`${formatWeight(report.pending)} گرم ۷۵۰ موقت`} />
        <Stat title="طلای ملکی" body={<GramText value={report.ownedGram} />} />
        <Stat title="صندوق و بانک" body={<RialText value={(report.boxes.rialDebit - report.boxes.rialCredit).toString()} toman asset />} />
        <Stat title="خالص ریالی اشخاص و سرمایه" body={<RialText value={report.rialPosition} toman />} hint="صندوق و بانک + طلب − بدهی − سرمایه" />
        <Stat title="سوخت ریالی" body={<RialText value={report.expenses.rialDebit.toString()} />} hint="مانده بدهکار هزینه‌ها" />
      </div>
      <Section title="صندوق و بانک">
        <Lines rows={report.boxes.lines} />
      </Section>
      <Section title="اشخاص">
        <Lines rows={report.persons.lines} />
      </Section>
      <Section title="سرمایه‌گذار">
        <Lines rows={report.investors.lines} />
      </Section>
      <Section title="هزینه و ذوب">
        <Lines rows={report.expenses.lines} />
        <p className="px-4 pb-4 text-sm text-[#6d6458]">گرم بدهکار این حساب‌ها زیان مغازه است و برگشتی ندارد.</p>
      </Section>
      <Section title="سکه">
        <table className="ledger">
          <thead><tr><th>نام</th><th>صندوق</th><th>ملکی</th><th>ارزش به فی فروش</th></tr></thead>
          <tbody>
            {coins.map((coin) => (
              <tr key={coin.id}>
                <td>{coin.name}</td>
                <td>{coin.stock.toLocaleString("fa-IR")}</td>
                <td>{coin.owned.toLocaleString("fa-IR")}</td>
                <td><Money value={coin.stockValue} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Stat({ title, body, hint }: { title: string; body: React.ReactNode; hint?: string }) {
  return (
    <div className="panel p-4">
      <div className="text-sm text-[#6d6458]">{title}</div>
      <div className="mt-2 text-xl">{body}</div>
      {hint ? <div className="mt-1 text-xs text-[#6d6458]">{hint}</div> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel overflow-x-auto">
      <h2 className="px-4 pt-4 text-lg">{title}</h2>
      {children}
    </div>
  );
}

function Lines({ rows }: { rows: { id: string; code: number; title: string; groupLabel: string; gram: string; rial: string }[] }) {
  return (
    <table className="ledger">
      <thead><tr><th>کد</th><th>حساب</th><th>گروه</th><th>گرم</th><th>ریال</th></tr></thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.code.toLocaleString("fa-IR")}</td>
            <td><Link className="text-[#8d6a2e]" href={`/accounts/${row.id}`}>{row.title}</Link></td>
            <td>{row.groupLabel}</td>
            <td><GramText value={row.gram} /></td>
            <td><RialText value={row.rial} asset={row.groupLabel === "صندوق" || row.groupLabel === "بانک"} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
