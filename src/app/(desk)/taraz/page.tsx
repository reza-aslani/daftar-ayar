import Link from "next/link";
import { formatRial, formatWeight, gramBalance, rialBalance } from "@/lib/format";
import { getBalanceReport, getCoinReport } from "@/server/queries";

export default async function TarazPage() {
  const [report, coins] = await Promise.all([getBalanceReport(), getCoinReport()]);
  const cashAndBanks = report.boxes.lines;
  const people = report.persons.lines;
  const investors = report.investors.lines;
  const rialAssets: { label: string; href?: string; amount: bigint }[] = [];
  const rialDebts: { label: string; href?: string; amount: bigint }[] = [];
  for (const box of cashAndBanks) {
    const value = BigInt(box.rial);
    const name = box.group === "CASH" ? "وجه صندوق" : box.title;
    if (value > 0n) rialAssets.push({ label: name, href: `/accounts/${box.id}`, amount: value });
    if (value < 0n) rialDebts.push({ label: `کسری ${name}`, href: `/accounts/${box.id}`, amount: -value });
  }
  if (report.persons.rialDebit > 0n) rialAssets.push({ label: "طلب ریالی اشخاص", href: "/accounts", amount: report.persons.rialDebit });
  if (report.investors.rialDebit > 0n) rialAssets.push({ label: "طلب از سرمایه‌گذار", amount: report.investors.rialDebit });
  if (report.persons.rialCredit > 0n) rialDebts.push({ label: "بدهی ریالی به اشخاص", href: "/accounts", amount: report.persons.rialCredit });
  if (report.investors.rialCredit > 0n) rialDebts.push({ label: "سرمایهٔ ریالی", amount: report.investors.rialCredit });

  const gramAssets: { label: string; amount: string }[] = [
    { label: "آبشدهٔ موجود (۷۵۰)", amount: report.abshode },
    { label: "متفرقهٔ موجود (۷۵۰)", amount: report.motafareqe },
  ];
  if (report.persons.gramDebit.gt(0)) gramAssets.push({ label: "طلب گرمی اشخاص", amount: report.persons.gramDebit.toFixed(3) });
  if (report.investors.gramDebit.gt(0)) gramAssets.push({ label: "طلب گرمی سرمایه‌گذار", amount: report.investors.gramDebit.toFixed(3) });
  const gramDebts: { label: string; amount: string }[] = [];
  if (report.persons.gramCredit.gt(0)) gramDebts.push({ label: "بدهی گرمی به اشخاص", amount: report.persons.gramCredit.toFixed(3) });
  if (report.investors.gramCredit.gt(0)) gramDebts.push({ label: "سرمایهٔ گرمی", amount: report.investors.gramCredit.toFixed(3) });

  const assetSum = rialAssets.reduce((sum, row) => sum + row.amount, 0n);
  const debtSum = rialDebts.reduce((sum, row) => sum + row.amount, 0n);
  const coinValue = coins.reduce((sum, coin) => sum + BigInt(coin.stockValue), 0n);
  const rows = Math.max(rialAssets.length, rialDebts.length, 1);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">تراز</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#4d6278]">
          مثل تراز زرین: ستون دارایی در برابر بدهی. عدد مثبتِ شخص بدهکار است و عدد منفی بستانکار.
          بالانس ریالی، خالص صندوق و بانک و طلب منهای بدهی و سرمایه است. وزن طلا جدا، به معادل عیار ۷۵۰، در تراز گرمی می‌نشیند.
        </p>
      </div>
      <section className="z-window">
        <div className="z-cap">تراز ریالی</div>
        <div className="overflow-x-auto">
          <table className="ledger">
            <thead>
              <tr>
                <th>دارایی</th><th>مبلغ</th><th>بدهی</th><th>مبلغ</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, index) => {
                const asset = rialAssets[index];
                const debt = rialDebts[index];
                return (
                  <tr key={index}>
                    <td>{asset ? asset.href ? <Link href={asset.href}>{asset.label}</Link> : asset.label : ""}</td>
                    <td>{asset ? <span className="num">{formatRial(asset.amount)}</span> : ""}</td>
                    <td>{debt ? debt.href ? <Link href={debt.href}>{debt.label}</Link> : debt.label : ""}</td>
                    <td>{debt ? <span className="num">{formatRial(debt.amount)}</span> : ""}</td>
                  </tr>
                );
              })}
              <tr className="total">
                <td>جمع دارایی</td>
                <td className="num">{formatRial(assetSum)}</td>
                <td>جمع بدهی</td>
                <td className="num">{formatRial(debtSum)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="px-3 py-2 text-sm">
          بالانس ریالی: <b className="num">{formatRial(assetSum - debtSum)}</b> ریال
          <span className="text-[#4d6278]"> ({formatRial((assetSum - debtSum) / 10n)} تومان)</span>
        </p>
      </section>
      <section className="z-window">
        <div className="z-cap gold">تراز گرمی — معادل ۷۵۰</div>
        <div className="overflow-x-auto">
          <table className="ledger">
            <thead>
              <tr><th>دارایی گرم</th><th>وزن</th><th>بدهی گرم</th><th>وزن</th></tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(gramAssets.length, gramDebts.length, 1) }, (_, index) => (
                <tr key={index}>
                  <td>{gramAssets[index]?.label ?? ""}</td>
                  <td>{gramAssets[index] ? <span className="num">{formatWeight(gramAssets[index].amount)}</span> : ""}</td>
                  <td>{gramDebts[index]?.label ?? ""}</td>
                  <td>{gramDebts[index] ? <span className="num">{formatWeight(gramDebts[index].amount)}</span> : ""}</td>
                </tr>
              ))}
              <tr className="total">
                <td colSpan={3}>بالانس گرمی (طلای ملکی)</td>
                <td className="num">{formatWeight(report.ownedGram)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="px-3 py-2 text-sm text-[#4d6278]">
          شرطیِ باز: {report.pendingCount.toLocaleString("fa-IR")} قطعه، {formatWeight(report.pending)} گرم با عیار موقت ۷۵۰.
          {report.expenses.rialDebit > 0n || report.expenses.gramDebit.gt(0) ? ` سوخت: ${formatWeight(report.expenses.gramDebit)} گرم و ${formatRial(report.expenses.rialDebit)} ریال بدهکار.` : ""}
        </p>
      </section>
      <section className="z-window">
        <div className="z-cap">تراز تعدادی سکه</div>
        <div className="overflow-x-auto">
          <table className="ledger">
            <thead>
              <tr>
                <th>سکه</th><th>صندوق</th><th>بدهکار اشخاص</th><th>بستانکار اشخاص</th><th>سرمایه</th><th>ملکی</th>
              </tr>
            </thead>
            <tbody>
              {coins.map((coin) => (
                <tr key={coin.id}>
                  <td>{coin.name}</td>
                  <td className="num">{coin.stock.toLocaleString("fa-IR")}</td>
                  <td className="num debit">{coin.personDebit ? coin.personDebit.toLocaleString("fa-IR") : ""}</td>
                  <td className="num credit">{coin.personCredit ? coin.personCredit.toLocaleString("fa-IR") : ""}</td>
                  <td className="num">{coin.investorCredit ? `${coin.investorCredit.toLocaleString("fa-IR")} بس` : coin.investorDebit ? `${coin.investorDebit.toLocaleString("fa-IR")} بد` : ""}</td>
                  <td className="num">{coin.owned.toLocaleString("fa-IR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-3 py-2 text-sm text-[#4d6278]">
          ارزش روز سکه‌های داخل صندوق با فی فروش {formatRial(coinValue)} ریال است. این رقم در سند ننشسته و داخل بالانس ریالی جمع نشده است.
        </p>
      </section>
      <section className="z-window">
        <div className="z-cap">تراز اشخاص</div>
        <div className="overflow-x-auto">
          <table className="ledger">
            <thead>
              <tr>
                <th>کد</th><th>حساب</th><th>ریال بدهکار</th><th>ریال بستانکار</th><th>گرم بدهکار</th><th>گرم بستانکار</th><th>سکه</th>
              </tr>
            </thead>
            <tbody>
              {[...people, ...investors].map((row) => {
                const rial = rialBalance(row.rial);
                const gram = gramBalance(row.gram);
                const account = report.accounts.find((item) => item.id === row.id);
                return (
                  <tr key={row.id}>
                    <td className="num">{row.code.toLocaleString("fa-IR")}</td>
                    <td><Link href={`/accounts/${row.id}`}>{row.title}</Link><div className="text-xs text-[#4d6278]">{row.groupLabel}</div></td>
                    <td className="debit">{rial.side === "debit" ? <span className="num">{rial.abs}</span> : ""}</td>
                    <td className="credit">{rial.side === "credit" ? <span className="num">{rial.abs}</span> : ""}</td>
                    <td className="debit">{gram.side === "debit" ? <span className="num">{gram.abs}</span> : ""}</td>
                    <td className="credit">{gram.side === "credit" ? <span className="num">{gram.abs}</span> : ""}</td>
                    <td className="text-sm">
                      {account?.coins.length
                        ? account.coins.map((coin) => (
                            <div key={coin.coinTypeId}>{coin.name} {coin.count > 0 ? "بدهکار" : "بستانکار"} {Math.abs(coin.count).toLocaleString("fa-IR")}</div>
                          ))
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              <tr className="total">
                <td colSpan={2}>جمع اشخاص</td>
                <td className="num">{formatRial(report.persons.rialDebit + report.investors.rialDebit)}</td>
                <td className="num">{formatRial(report.persons.rialCredit + report.investors.rialCredit)}</td>
                <td className="num">{formatWeight(report.persons.gramDebit.plus(report.investors.gramDebit))}</td>
                <td className="num">{formatWeight(report.persons.gramCredit.plus(report.investors.gramCredit))}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
