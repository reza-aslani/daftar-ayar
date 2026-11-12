import Link from "next/link";
import { notFound } from "next/navigation";
import { GramText, Money, RialText } from "@/components/balance";
import { formatJalaliFa } from "@/lib/date";
import { formatWeight } from "@/lib/format";
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
  const asset = account.group === "CASH" || account.group === "BANK";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[#4d6278]">کارت حساب {account.code.toLocaleString("fa-IR")} · {account.groupLabel}</div>
          <h1 className="text-2xl">{account.title}</h1>
          <p className="text-sm text-[#4d6278]">{[account.mobile, account.phone, account.address].filter(Boolean).join(" · ") || "بدون شماره"}</p>
          {account.group === "BANK" && (account.accountNo || account.iban || account.branch) ? (
            <p className="text-sm text-[#4d6278]">
              {[account.branch && `شعبه ${account.branch}`, account.accountNo && `حساب ${account.accountNo}`, account.iban && `شبا ${account.iban}`].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Link href={`/sandogh?account=${account.id}`} className="border border-[#8eadd4] bg-white px-3 py-2 text-sm">دریافت و پرداخت</Link>
          <Link href="/sanad" className="border border-[#8eadd4] bg-white px-3 py-2 text-sm">معامله</Link>
          <Link href={`/accounts/${account.id}/edit`} className="border border-[#8eadd4] bg-white px-3 py-2 text-sm">اصلاح</Link>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <div className="panel p-3">
          <div className="text-sm text-[#4d6278]">{asset ? "موجودی ریال" : "مانده ریال"}</div>
          <div className="mt-1 text-xl"><RialText value={account.rial} toman asset={asset} /></div>
        </div>
        <div className="panel p-3">
          <div className="text-sm text-[#4d6278]">مانده گرم ۷۵۰</div>
          <div className="mt-1 text-xl"><GramText value={account.gram} /></div>
        </div>
        <div className="panel p-3">
          <div className="text-sm text-[#4d6278]">مانده سکه</div>
          {account.coins.length === 0 ? <div className="mt-1 text-[#4d6278]">بدون مانده تعدادی</div> : account.coins.map((coin) => (
            <div key={coin.coinTypeId} className={coin.count > 0 ? "debit" : "credit"}>
              {coin.name}: {coin.count > 0 ? "بدهکار" : "بستانکار"} {Math.abs(coin.count).toLocaleString("fa-IR")}
            </div>
          ))}
        </div>
      </div>
      {account.note ? <p className="text-sm text-[#4d6278]">یادداشت: {account.note}</p> : null}
      <div className="z-window overflow-x-auto">
        <div className="z-cap">صورتحساب</div>
        <table className="ledger">
          <thead>
            <tr>
              <th>تاریخ</th><th>سند</th><th>شرح</th><th>بدهکار ریال</th><th>بستانکار ریال</th><th>مانده ریال</th><th>بدهکار گرم</th><th>بستانکار گرم</th><th>مانده گرم</th><th>سکه</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={10}>برای این حساب هنوز ردیفی نیست.</td></tr> : null}
            {rows.map((row) => {
              const side = row.rialDebit ? "row-out" : row.rialCredit ? "row-in" : row.gramDebit ? "row-out" : row.gramCredit ? "row-in" : "";
              return (
                <tr key={row.id} className={side}>
                  <td>{formatJalaliFa(new Date(row.date))}</td>
                  <td>
                    <Link href={`/documents/${row.documentId}`}>{row.number.toLocaleString("fa-IR")}</Link>
                    <div className="text-xs">{DOC_LABEL[kinds.get(row.documentId)!]}</div>
                  </td>
                  <td>{row.description}</td>
                  <td>{row.rialDebit ? <Money value={row.rialDebit} /> : ""}</td>
                  <td>{row.rialCredit ? <Money value={row.rialCredit} /> : ""}</td>
                  <td><RialText value={row.runRial} asset={asset} /></td>
                  <td>{row.gramDebit ? <span className="num">{formatWeight(row.gramDebit)}</span> : ""}</td>
                  <td>{row.gramCredit ? <span className="num">{formatWeight(row.gramCredit)}</span> : ""}</td>
                  <td><GramText value={row.runGram} withUnit={false} /></td>
                  <td>{row.coin}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
