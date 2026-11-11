import Link from "next/link";
import { formatJalaliFa } from "@/lib/date";
import { formatAyar, formatWeight } from "@/lib/format";
import { getInventory } from "@/server/queries";

const filters = [
  { id: "in", label: "موجود" },
  { id: "pending", label: "شرطی" },
  { id: "stale", label: "راکد" },
  { id: "out", label: "خارج‌شده" },
  { id: "all", label: "همه" },
];

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const filter = (await searchParams).filter ?? "in";
  const items = await getInventory(filter);
  const total = items.filter((item) => item.status === "IN_STOCK").reduce((sum, item) => sum + Number(item.weight750), 0);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">موجودی آبشده و متفرقه</h1>
        <p className="text-sm text-[#6d6458]">ردیف بنفش آبشده‌ای است که از حد روزهای راکد گذشته. ردیف کرم هنوز جواب ری ندارد.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Link key={item.id} href={`/inventory?filter=${item.id}`} className={`rounded-full px-3 py-1 text-sm ${filter === item.id ? "bg-[#16211e] text-white" : "bg-white"}`}>
            {item.label}
          </Link>
        ))}
      </div>
      <div className="panel overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th>قطعه</th><th>نوع</th><th>وزن</th><th>عیار</th><th>۷۵۰</th><th>وضعیت</th><th>ری‌گیری</th><th>پاکت</th><th>انگ</th><th>دریافت</th><th>سن</th><th>از</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={12}>در این نما قطعه‌ای نیست.</td></tr> : null}
            {items.map((item) => (
              <tr key={item.id} className={item.stale ? "stale" : item.pending ? "pending" : ""}>
                <td>{item.codeLabel}</td>
                <td>{item.kindLabel}</td>
                <td className="num">{formatWeight(item.scale)}</td>
                <td className="num">{formatAyar(item.ayar)}</td>
                <td className="num">{formatWeight(item.weight750)}</td>
                <td>{item.status === "OUT" ? "خارج" : item.pending ? "شرطی" : item.assayState === "RESULTED" ? "جواب‌دار" : "قطعی"}{item.stale ? " · راکد" : ""}</td>
                <td>{item.lab}</td>
                <td>{item.envelopeNo}</td>
                <td>{item.ang}</td>
                <td>{formatJalaliFa(new Date(item.received))}</td>
                <td>{item.ageDays.toLocaleString("fa-IR")} روز</td>
                <td>{item.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filter !== "out" ? <p className="text-sm">جمع ۷۵۰ همین فهرستِ موجود: {formatWeight(total)} گرم</p> : null}
    </div>
  );
}
