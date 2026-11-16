import Link from "next/link";
import { notFound } from "next/navigation";
import { Money } from "@/components/balance";
import { DocumentToolbar } from "@/components/document-toolbar";
import { VoidButton } from "@/components/void-button";
import { formatWeight } from "@/lib/format";
import { getSession } from "@/server/auth";
import { getInvoice } from "@/server/queries";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [doc, user] = await Promise.all([getInvoice(id), getSession()]);
  if (!doc) notFound();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[#8d6a2e]">{doc.kindLabel} · سند {doc.numberLabel}</div>
          <h1 className="text-2xl">{doc.description}</h1>
          <p className="text-sm text-[#6d6458]">
            {doc.dateLabel} · ساعت {doc.timeLabel} · حساب{" "}
            <Link className="text-[#8d6a2e]" href={`/accounts/${doc.accountId}`}>{doc.accountTitle}</Link>
            {" "}· ثبت {doc.createdByName}
          </p>
        </div>
        <DocumentToolbar id={doc.id} share={doc.share}>
          {user?.role === "ADMIN" && !doc.voided ? <VoidButton id={doc.id} /> : null}
        </DocumentToolbar>
      </div>
      {doc.voidLabel ? <div className="rounded-xl bg-[#fff1f2] px-4 py-3 text-sm text-[#9d243c]">{doc.voidLabel}</div> : null}
      <div className="panel overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr><th>ردیف</th><th>حساب</th><th>شرح</th><th>وزن</th><th>۷۵۰</th><th>ریال</th><th>اثر گرم</th><th>اثر ریال</th></tr>
          </thead>
          <tbody>
            {doc.ledger.map((row) => (
              <tr key={row.id} className={row.direction === "IN" ? "row-in" : "row-out"}>
                <td>{row.lineNo.toLocaleString("fa-IR")}</td>
                <td><Link href={`/accounts/${row.accountId}`}>{row.accountTitle}</Link></td>
                <td>
                  {row.description}
                  {row.pieceLabel ? <div className="text-xs text-[#6d6458]">{row.pieceLabel}</div> : null}
                </td>
                <td>{row.scaleWeight ? formatWeight(row.scaleWeight) : row.count ? row.count.toLocaleString("fa-IR") : ""}</td>
                <td>{row.weight750 ? formatWeight(row.weight750) : ""}</td>
                <td>{row.amountRial ? <Money value={row.amountRial} /> : ""}</td>
                <td className="num">{row.gramDelta}</td>
                <td className="num">{row.rialDelta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
