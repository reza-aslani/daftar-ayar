import { Money } from "@/components/balance";
import { getCoinReport } from "@/server/queries";

export default async function CoinInventoryPage() {
  const coins = await getCoinReport();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">موجودی سکه</h1>
        <p className="max-w-3xl text-sm text-[#6d6458]">
          بالانس تعدادی مثل زرین: موجودی صندوق به‌علاوه طلب، منهای بدهی اشخاص و سرمایه. خرید موجودی را زیاد می‌کند بدون آنکه شخص بستانکار سکه شود. دریافت امانی هر دو طرف را با هم تکان می‌دهد و سکهٔ ملکی را عوض نمی‌کند.
        </p>
      </div>
      <div className="panel overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th>سکه</th><th>صندوق</th><th>طلب</th><th>بدهی اشخاص</th><th>سرمایه</th><th>ملکی</th><th>فی فروش</th><th>ارزش صندوق</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => (
              <tr key={coin.id}>
                <td>{coin.name}</td>
                <td>{coin.stock.toLocaleString("fa-IR")}</td>
                <td>{coin.personDebit.toLocaleString("fa-IR")}</td>
                <td>{coin.personCredit.toLocaleString("fa-IR")}</td>
                <td>{coin.investorCredit.toLocaleString("fa-IR")}</td>
                <td>{coin.owned.toLocaleString("fa-IR")}</td>
                <td><Money value={coin.sell} /></td>
                <td><Money value={coin.stockValue} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#6d6458]">ارزش صندوق با فی فروش نمونه محاسبه شده و فقط برای دیدن رقم است، نه سند حسابداری.</p>
    </div>
  );
}
