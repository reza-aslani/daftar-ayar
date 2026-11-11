import Link from "next/link";
import { formatJalaliFa } from "@/lib/date";
import { DOC_LABEL, accountTitle } from "@/lib/labels";
import { getJournal } from "@/server/queries";

const kinds = ["ALL", "GOLD_IN", "GOLD_OUT", "GOLD_BUY", "GOLD_SELL", "ASSAY", "MELT", "COIN", "CASH", "OPENING", "SEND_PIECES"] as const;

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const kind = (await searchParams).kind ?? "ALL";
  const docs = await getJournal(kind);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">روزنامه</h1>
      <div className="flex flex-wrap gap-2">
        {kinds.map((item) => (
          <Link key={item} href={item === "ALL" ? "/journal" : `/journal?kind=${item}`} className={`rounded-full px-3 py-1 text-sm ${kind === item ? "bg-[#16211e] text-white" : "bg-white"}`}>
            {item === "ALL" ? "همه" : DOC_LABEL[item]}
          </Link>
        ))}
      </div>
      <div className="panel overflow-x-auto">
        <table className="ledger">
          <thead><tr><th>شماره</th><th>تاریخ</th><th>نوع</th><th>حساب</th><th>شرح</th><th>ردیف</th><th>ثبت</th><th></th></tr></thead>
          <tbody>
            {docs.length === 0 ? <tr><td colSpan={8}>سندی در این دسته نیست.</td></tr> : null}
            {docs.map((doc) => (
              <tr key={doc.id} className={doc.voidedAt ? "opacity-50" : ""}>
                <td>{doc.number.toLocaleString("fa-IR")}</td>
                <td>{formatJalaliFa(doc.date)}</td>
                <td>{DOC_LABEL[doc.kind]}</td>
                <td>{accountTitle(doc.account.name, doc.account.family)}</td>
                <td>{doc.description}</td>
                <td>{doc._count.rows.toLocaleString("fa-IR")}</td>
                <td>{doc.createdBy.name}</td>
                <td><Link className="text-[#8d6a2e]" href={`/documents/${doc.id}`}>{doc.voidedAt ? "ابطال" : "باز کردن"}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
