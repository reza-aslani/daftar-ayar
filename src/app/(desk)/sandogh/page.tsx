import Link from "next/link";
import { RialText } from "@/components/balance";
import { SandoghDesk } from "@/components/sandogh-desk";
import { formatJalali, formatJalaliFa, parseJalali, tehranTodayUtc } from "@/lib/date";
import { formatWeight } from "@/lib/format";
import { DOC_LABEL } from "@/lib/labels";
import { getCashDesk, getDeskData } from "@/server/queries";

export default async function SandoghPage({ searchParams }: { searchParams: Promise<{ d?: string; account?: string }> }) {
  const params = await searchParams;
  let day = tehranTodayUtc();
  let dateError = "";
  if (params.d?.trim()) {
    try {
      day = parseJalali(params.d);
    } catch {
      dateError = "تاریخ گزارش نامعتبر است؛ امروز نشان داده شد.";
    }
  }
  const [desk, data] = await Promise.all([getCashDesk(day), getDeskData()]);
  const jalali = formatJalali(day);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">صندوق و بانک</h1>
        <p className="text-sm text-[#4d6278]">وجه نقد، حساب‌های بانکی، حواله بین آن‌ها، و گزارش ورود و خروج روز. آبی ورود است و قرمز خروج.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-3">
          <div className="text-sm text-[#4d6278]">طلای داخل صندوق (۷۵۰)</div>
          <div className="mt-1 text-xl"><span className="num">{formatWeight(desk.physical)}</span> گرم</div>
          <div className="text-xs text-[#4d6278]">آبشده {formatWeight(desk.abshode)} · متفرقه {formatWeight(desk.motafareqe)}</div>
        </div>
        {desk.books.map((book) => (
          <div key={book.id} className="panel p-3">
            <div className="text-sm text-[#4d6278]">{book.group === "CASH" ? "وجه صندوق" : book.title}</div>
            <div className="mt-1 text-xl"><RialText value={book.closing} toman asset /></div>
            {book.accountNo ? <div className="mt-1 text-xs text-[#4d6278]">حساب {book.accountNo}{book.branch ? ` · ${book.branch}` : ""}</div> : null}
          </div>
        ))}
      </div>
      <div className="panel p-3">
        <div className="mb-2 text-sm text-[#4d6278]">سکه در صندوق</div>
        <div className="flex flex-wrap gap-2">
          {desk.coins.map((coin) => (
            <span key={coin.id} className="border border-[#8eadd4] bg-[#f3f8fd] px-2 py-1 text-sm">
              {coin.name}: {coin.stock.toLocaleString("fa-IR")}
            </span>
          ))}
        </div>
      </div>
      <SandoghDesk
        today={data.today}
        people={data.accounts.map((account) => ({ id: account.id, title: account.title, code: account.code }))}
        boxes={data.moneyAccounts.map((account) => ({ id: account.id, title: account.title, group: account.group }))}
        initialAccountId={params.account}
      />
      <div className="z-window">
        <div className="z-cap">گزارش روزانهٔ وجوه — {formatJalaliFa(day)}</div>
        <form className="flex flex-wrap items-end gap-2 p-3" action="/sandogh">
          <div>
            <label className="mb-1 block text-sm text-[#4d6278]">تاریخ گزارش</label>
            <input name="d" defaultValue={jalali} className="field w-40" />
          </div>
          {params.account ? <input type="hidden" name="account" value={params.account} /> : null}
          <button className="h-[42px] bg-[#1a56a8] px-4 text-sm text-white">نمایش</button>
          <Link href="/accounts/new" className="h-[42px] border border-[#8eadd4] bg-white px-3 py-2 text-sm">حساب بانک تازه</Link>
        </form>
        {dateError ? <p className="px-3 pb-2 text-sm text-[#a32020]">{dateError}</p> : null}
        {desk.books.map((book) => (
          <div key={book.id} className="border-t border-[#d3e2f4]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <h2 className="text-lg">{book.group === "CASH" ? "صندوق" : book.title}</h2>
              <div className="text-sm">
                اول دوره <RialText value={book.opening} asset /> · دریافت <span className="credit num">{BigInt(book.incoming).toLocaleString("fa-IR")}</span> · پرداخت <span className="debit num">{BigInt(book.outgoing).toLocaleString("fa-IR")}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>سند</th><th>شرح</th><th>طرف</th><th>دریافت</th><th>پرداخت</th><th>مانده</th><th>ثبت</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5}>مانده از قبل</td>
                    <td><RialText value={book.opening} asset /></td>
                    <td></td>
                  </tr>
                  {book.lines.length === 0 ? <tr><td colSpan={7}>در این روز حرکتی نیست.</td></tr> : null}
                  {book.lines.map((line) => (
                    <tr key={line.id} className={line.direction === "IN" ? "row-in" : "row-out"}>
                      <td>
                        <Link href={`/documents/${line.documentId}`}>{line.number.toLocaleString("fa-IR")}</Link>
                        <div className="text-xs">{DOC_LABEL[line.kind]}</div>
                      </td>
                      <td>{line.description}</td>
                      <td>{line.partyId ? <Link href={`/accounts/${line.partyId}`}>{line.party}</Link> : "—"}</td>
                      <td>{line.direction === "IN" ? <span className="num">{BigInt(line.delta).toLocaleString("fa-IR")}</span> : ""}</td>
                      <td>{line.direction === "OUT" ? <span className="num">{(-BigInt(line.delta)).toLocaleString("fa-IR")}</span> : ""}</td>
                      <td><RialText value={line.run} asset /></td>
                      <td>{line.user}</td>
                    </tr>
                  ))}
                  <tr className="total">
                    <td colSpan={3}>مانده پایان روز</td>
                    <td className="num">{BigInt(book.incoming).toLocaleString("fa-IR")}</td>
                    <td className="num">{BigInt(book.outgoing).toLocaleString("fa-IR")}</td>
                    <td><RialText value={book.closing} asset /></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
