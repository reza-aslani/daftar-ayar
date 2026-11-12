import Link from "next/link";
import { notFound } from "next/navigation";
import { Money } from "@/components/balance";
import { VoidButton } from "@/components/void-button";
import { formatJalaliFa } from "@/lib/date";
import { formatWeight } from "@/lib/format";
import { DOC_LABEL, accountTitle, pieceCode } from "@/lib/labels";
import { getSession } from "@/server/auth";
import { getDocument } from "@/server/queries";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [doc, user] = await Promise.all([getDocument(id), getSession()]);
  if (!doc) notFound();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[#8d6a2e]">{DOC_LABEL[doc.kind]} · سند {doc.number.toLocaleString("fa-IR")}</div>
          <h1 className="text-2xl">{doc.description}</h1>
          <p className="text-sm text-[#6d6458]">
            {formatJalaliFa(doc.date)} · حساب{" "}
            <Link className="text-[#8d6a2e]" href={`/accounts/${doc.accountId}`}>{accountTitle(doc.account.name, doc.account.family)}</Link>
            {" "}· ثبت {doc.createdBy.name}
          </p>
        </div>
        {user?.role === "ADMIN" && !doc.voidedAt ? <VoidButton id={doc.id} /> : null}
      </div>
      {doc.voidedAt ? (
        <div className="rounded-xl bg-[#fff1f2] px-4 py-3 text-sm text-[#9d243c]">
          ابطال شده در {formatJalaliFa(doc.voidedAt)} توسط {doc.voidedBy?.name ?? "مدیر"}. دلیل: {doc.voidReason}
        </div>
      ) : null}
      <div className="panel overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr><th>ردیف</th><th>حساب</th><th>شرح</th><th>وزن</th><th>۷۵۰</th><th>ریال</th><th>اثر گرم</th><th>اثر ریال</th></tr>
          </thead>
          <tbody>
            {doc.rows.map((row) => (
              <tr key={row.id} className={row.direction === "IN" ? "row-in" : "row-out"}>
                <td>{row.lineNo.toLocaleString("fa-IR")}</td>
                <td><Link href={`/accounts/${row.accountId}`}>{accountTitle(row.account.name, row.account.family)}</Link></td>
                <td>
                  {row.description}
                  {row.goldItem ? <div className="text-xs text-[#6d6458]">{pieceCode(row.goldItem.code)}</div> : null}
                </td>
                <td>{row.scaleWeight ? formatWeight(row.scaleWeight.toString()) : row.count ? row.count.toLocaleString("fa-IR") : ""}</td>
                <td>{row.weight750 ? formatWeight(row.weight750.toString()) : ""}</td>
                <td>{row.amountRial ? <Money value={row.amountRial.toString()} /> : ""}</td>
                <td className="num">{row.gramDelta.toString()}</td>
                <td className="num">{row.rialDelta.toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
