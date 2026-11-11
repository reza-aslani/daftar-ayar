import { MazaneForm } from "@/components/mazane-form";
import { Money } from "@/components/balance";
import { formatJalali, formatJalaliFa, tehranTodayUtc } from "@/lib/date";
import { getMazaneHistory } from "@/server/queries";

export default async function MazanePage() {
  const history = await getMazaneHistory();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">مظنه روز</h1>
        <p className="max-w-3xl text-sm text-[#6d6458]">
          مظنه مثقال، قیمت یک مثقال ۴٫۶۰۸۳ گرمی با عیار ۷۰۵ است. قیمت یک گرم ۷۵۰ از تقسیم بر ۴٫۳۳۱۸۰۲ به دست می‌آید. اگر گرم ۷۵۰ را وارد کنید، مثقال از ضرب در همان ضریب ساخته می‌شود.
        </p>
      </div>
      <MazaneForm today={formatJalali(tehranTodayUtc())} />
      <div className="panel overflow-x-auto">
        <table className="ledger">
          <thead><tr><th>تاریخ</th><th>مثقال ۷۰۵</th><th>گرم ۷۵۰</th><th>ورود</th><th>ثبت</th><th>شرح</th></tr></thead>
          <tbody>
            {history.length === 0 ? <tr><td colSpan={6}>مظنه‌ای ثبت نشده.</td></tr> : null}
            {history.map((row) => (
              <tr key={row.id}>
                <td>{formatJalaliFa(row.date)}</td>
                <td><Money value={row.mazaneMesghal.toString()} /></td>
                <td><Money value={row.mazaneGram.toString()} /></td>
                <td>{row.enteredAs === "mesghal" ? "مثقال" : "گرم"}</td>
                <td>{row.createdBy.name}</td>
                <td>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
