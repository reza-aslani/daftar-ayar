import Link from "next/link";
import { notFound } from "next/navigation";
import { GramText, Money, RialText } from "@/components/balance";
import { formatJalaliFa } from "@/lib/date";
import { DOC_LABEL } from "@/lib/labels";
import { getAccount, getLedger } from "@/server/queries";
import { prisma } from "@/lib/db";

export default async function LedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccount(id);
  if (!account) notFound();
  const rows = await getLedger(id);
  const docs = await prisma.document.findMany({
    where: { id: { in: rows.map((row) => row.documentId) } },
    select: { id: true, kind: true },
  });
  const kinds = new Map(docs.map((doc) => [doc.id, doc.kind]));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[#6d6458]">پرونده {account.code.toLocaleString("fa-IR")} · {account.groupLabel}</div>
          <h1 className="text-2xl">{account.title}</h1>
          <p className="text-sm text-[#6d6458]">{[account.mobile, account.phone, account.address].filter(Boolean).join(" · ") || "بدون شماره"}</p>
        </div>
        <Link href={`/accounts/${account.id}/edit`} className="rounded-xl border border-[#e4d9c6] bg-white px-3 py-2 text-sm">اصلاح مشخصات</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="panel p-4"><div className="text-sm text-[#6d6458]">مانده گرم</div><div className="mt-1 text-xl"><GramText value={account.gram} /></div></div>
        <div className="panel p-4"><div className="text-sm text-[#6d6458]">{account.group === "CASH" || account.group === "BANK" ? "موجودی ریال" : "مانده ریال"}</div><div className="mt-1 text-xl"><RialText value={account.rial} toman asset={account.group === "CASH" || account.group === "BANK"} /></div></div>
        <div className="panel p-4">
          <div className="text-sm text-[#6d6458]">سکه</div>
          {account.coins.length === 0 ? <div className="mt-1 text-[#6d6458]">بدون مانده تعدادی</div> : account.coins.map((coin) => (
            <div key={coin.coinTypeId} className="mt-1">{coin.name}: {coin.count > 0 ? "بدهکار" : "بستانکار"} {Math.abs(coin.count).toLocaleString("fa-IR")}</div>
          ))}
        </div>
      </div>
      {account.note ? <p className="text-sm text-[#6d6458]">یادداشت: {account.note}</p> : null}
      <div className="panel overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th>تاریخ</th><th>سند</th><th>شرح</th><th>بدهکار گرم</th><th>بستانکار گرم</th><th>بدهکار ریال</th><th>بستانکار ریال</th><th>سکه</th><th>مانده گرم</th><th>مانده ریال</th><th>ثبت</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={11}>برای این حساب هنوز ردیفی نیست.</td></tr> : null}
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatJalaliFa(new Date(row.date))}</td>
                <td><Link className="text-[#8d6a2e]" href={`/documents/${row.documentId}`}>{row.number.toLocaleString("fa-IR")}</Link><div className="text-xs text-[#6d6458]">{DOC_LABEL[kinds.get(row.documentId)!]}</div></td>
                <td>{row.description}</td>
                <td>{row.gramDebit ? <Moneyish gram={row.gramDebit} /> : ""}</td>
                <td>{row.gramCredit ? <Moneyish gram={row.gramCredit} /> : ""}</td>
                <td>{row.rialDebit ? <Money value={row.rialDebit} /> : ""}</td>
                <td>{row.rialCredit ? <Money value={row.rialCredit} /> : ""}</td>
                <td>{row.coin}</td>
                <td><GramText value={row.runGram} withUnit={false} /></td>
                <td><RialText value={row.runRial} asset={account.group === "CASH" || account.group === "BANK"} /></td>
                <td>{row.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Moneyish({ gram }: { gram: string }) {
  return <span className="num">{Number(gram).toLocaleString("fa-IR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>;
}
