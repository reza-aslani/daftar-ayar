import Link from "next/link";
import { GramText, RialText } from "@/components/balance";
import { accountBalances } from "@/server/queries";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const accounts = (await accountBalances()).filter((account) => {
    if (!query) return true;
    return `${account.code} ${account.title} ${account.mobile}`.includes(query);
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">حساب‌ها</h1>
          <p className="text-sm text-[#6d6458]">مثبت بدهکار است؛ یعنی شخص به مغازه بدهکار است. منفی بستانکار است.</p>
        </div>
        <Link href="/accounts/new" className="rounded-xl bg-[#8d6a2e] px-4 py-2 text-sm text-white">حساب تازه</Link>
      </div>
      <form>
        <input name="q" defaultValue={query} placeholder="نام، کد یا موبایل" className="field max-w-sm" />
      </form>
      <div className="panel overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr><th>کد</th><th>نام</th><th>گروه</th><th>گرم</th><th>ریال</th><th>سکه</th></tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? <tr><td colSpan={6}>حسابی با این عبارت نیست.</td></tr> : null}
            {accounts.map((account) => (
              <tr key={account.id} className={account.active ? "" : "opacity-50"}>
                <td className="num">{account.code.toLocaleString("fa-IR")}</td>
                <td><Link className="text-[#8d6a2e]" href={`/accounts/${account.id}`}>{account.title}</Link></td>
                <td>{account.groupLabel}</td>
                <td><GramText value={account.gram} /></td>
                <td><RialText value={account.rial} asset={account.group === "CASH" || account.group === "BANK"} /></td>
                <td className="text-sm">
                  {account.coins.length === 0 ? "—" : account.coins.map((coin) => (
                    <div key={coin.coinTypeId}>{coin.name} {coin.count > 0 ? "بدهکار" : "بستانکار"} {Math.abs(coin.count).toLocaleString("fa-IR")}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
