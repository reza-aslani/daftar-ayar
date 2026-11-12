"use client";

import type { DeskData } from "@/lib/dto";
import { formatRial, parseAmount, parseRial } from "@/lib/format";
import { Input, Label, Select } from "@/components/ui/input";

export type BankLine = { bankId: string; amount: string };

export type SettleValue = {
  cash: string;
  banks: BankLine[];
  coinOn: boolean;
  coinTypeId: string;
  coinCount: string;
  coinPrice: string;
  goldOn: boolean;
  goldScale: string;
  goldAyar: string;
  goldKind: "MOTAFARREQE" | "ABSHODE";
  goldItemId: string;
  goldTotal: string;
};

export function emptySettle(data: Pick<DeskData, "banks" | "coins" | "pieces" | "defaultAyar">): SettleValue {
  return {
    cash: "",
    banks: [{ bankId: data.banks[0]?.id ?? "", amount: "" }],
    coinOn: false,
    coinTypeId: data.coins[0]?.id ?? "",
    coinCount: "",
    coinPrice: data.coins[0]?.buy ?? "",
    goldOn: false,
    goldScale: "",
    goldAyar: data.defaultAyar,
    goldKind: "MOTAFARREQE",
    goldItemId: data.pieces[0]?.id ?? "",
    goldTotal: "",
  };
}

export function moneyFromSettle(value: SettleValue) {
  const legs: { via: "cash" | "bank"; amount: string; bankAccountId?: string }[] = [];
  if (value.cash.trim()) legs.push({ via: "cash", amount: value.cash });
  for (const bank of value.banks) {
    if (bank.amount.trim()) legs.push({ via: "bank", amount: bank.amount, bankAccountId: bank.bankId });
  }
  return legs;
}

function money(input: string): bigint {
  if (!input.trim()) return 0n;
  try {
    return parseRial(input);
  } catch {
    return 0n;
  }
}

export function SettleBox({
  total,
  data,
  direction,
  instruments,
  value,
  onChange,
}: {
  total: bigint | null;
  data: DeskData;
  /** receive: مشتری می‌دهد. pay: مغازه می‌دهد. */
  direction: "receive" | "pay";
  instruments: boolean;
  value: SettleValue;
  onChange: (value: SettleValue) => void;
}) {
  const bankSum = value.banks.reduce((sum, line) => sum + money(line.amount), 0n);
  let coinExact = 0n;
  if (value.coinOn && value.coinCount.trim() && value.coinPrice.trim()) {
    try {
      coinExact = parseRial(value.coinPrice) * BigInt(parseAmount(value.coinCount).toFixed(0));
    } catch {
      coinExact = 0n;
    }
  }
  const goldSum = value.goldOn ? money(value.goldTotal) : 0n;
  const used = money(value.cash) + bankSum + coinExact + goldSum;
  const rest = total === null ? null : total - used;
  const over = rest !== null && rest < 0n;
  const verb = direction === "receive" ? "دریافت" : "پرداخت";

  function patch(partial: Partial<SettleValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="z-window">
      <div className={direction === "receive" ? "z-cap" : "z-cap pay"}>طرف‌های تسویه — {verb}</div>
      <div className="grid gap-3 p-3">
        <p className="text-sm text-[#4d6278]">
          مثل سند زرین، وجه می‌تواند بخشی نقد صندوق و بخشی کارت یا حوالهٔ بانک باشد. آنچه ننویسید در حساب شخص می‌ماند.
          {instruments ? " طلا و سکه هم می‌توانند به‌جای پول بیایند." : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border border-[#8eadd4] bg-white px-3 py-2 text-sm"
            onClick={() => patch({ cash: "", banks: value.banks.map((line) => ({ ...line, amount: "" })) })}
          >
            نسیه
          </button>
          <button
            type="button"
            className="bg-[#1a56a8] px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={total === null}
            onClick={() => patch({ cash: total?.toString() ?? "", banks: value.banks.map((line) => ({ ...line, amount: "" })), coinOn: false, goldOn: false })}
          >
            همه نقد
          </button>
          <button
            type="button"
            className="bg-[#0e3f86] px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={total === null || !data.banks.length}
            onClick={() =>
              patch({
                cash: "",
                banks: [{ bankId: value.banks[0]?.bankId || data.banks[0]?.id || "", amount: total?.toString() ?? "" }],
                coinOn: false,
                goldOn: false,
              })
            }
          >
            همه بانک
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>نقد صندوق (ریال)</Label>
            <Input inputMode="numeric" value={value.cash} onChange={(event) => patch({ cash: event.target.value })} placeholder="مثلاً ۴۰۰۰۰۰۰۰" />
          </div>
          {value.banks.map((line, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <div>
                <Label>بانک</Label>
                <Select
                  value={line.bankId}
                  onChange={(event) => {
                    const banks = value.banks.slice();
                    banks[index] = { ...line, bankId: event.target.value };
                    patch({ banks });
                  }}
                >
                  <option value="">انتخاب</option>
                  {data.banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>{bank.title}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>مبلغ بانک</Label>
                <Input
                  inputMode="numeric"
                  value={line.amount}
                  onChange={(event) => {
                    const banks = value.banks.slice();
                    banks[index] = { ...line, amount: event.target.value };
                    patch({ banks });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        {value.banks.length < 3 ? (
          <button
            type="button"
            className="w-fit text-sm text-[#0b4ea2]"
            onClick={() => patch({ banks: [...value.banks, { bankId: data.banks[0]?.id ?? "", amount: "" }] })}
          >
            + بانک دیگر
          </button>
        ) : null}
        {instruments ? (
          <div className="grid gap-3 border-t border-[#d3e2f4] pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={value.coinOn} onChange={(event) => patch({ coinOn: event.target.checked })} />
              {verb} سکه به‌جای وجه
            </label>
            {value.coinOn ? (
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>سکه</Label>
                  <Select
                    value={value.coinTypeId}
                    onChange={(event) => {
                      const coin = data.coins.find((item) => item.id === event.target.value);
                      patch({
                        coinTypeId: event.target.value,
                        coinPrice: direction === "receive" ? coin?.buy ?? "" : coin?.sell ?? "",
                      });
                    }}
                  >
                    {data.coins.map((coin) => (
                      <option key={coin.id} value={coin.id}>{coin.name} — موجودی {coin.stock}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>تعداد</Label>
                  <Input inputMode="numeric" value={value.coinCount} onChange={(event) => patch({ coinCount: event.target.value })} />
                </div>
                <div>
                  <Label>فی (ریال)</Label>
                  <Input inputMode="numeric" value={value.coinPrice} onChange={(event) => patch({ coinPrice: event.target.value })} />
                </div>
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={value.goldOn} onChange={(event) => patch({ goldOn: event.target.checked })} />
              {verb} طلا به‌جای وجه
            </label>
            {value.goldOn && direction === "receive" ? (
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <Label>نوع</Label>
                  <Select value={value.goldKind} onChange={(event) => patch({ goldKind: event.target.value as "MOTAFARREQE" | "ABSHODE" })}>
                    <option value="MOTAFARREQE">متفرقه</option>
                    <option value="ABSHODE">آبشده</option>
                  </Select>
                </div>
                <div>
                  <Label>وزن</Label>
                  <Input inputMode="decimal" value={value.goldScale} onChange={(event) => patch({ goldScale: event.target.value })} />
                </div>
                <div>
                  <Label>عیار</Label>
                  <Input value={value.goldAyar} onChange={(event) => patch({ goldAyar: event.target.value })} />
                </div>
                <div>
                  <Label>مبلغ (خالی = مظنه)</Label>
                  <Input inputMode="numeric" value={value.goldTotal} onChange={(event) => patch({ goldTotal: event.target.value })} />
                </div>
              </div>
            ) : null}
            {value.goldOn && direction === "pay" ? (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Label>قطعه از موجودی</Label>
                  <Select value={value.goldItemId} onChange={(event) => patch({ goldItemId: event.target.value })}>
                    {data.pieces.map((piece) => (
                      <option key={piece.id} value={piece.id}>
                        {piece.codeLabel} {piece.kindLabel} {piece.scale} گرم
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>وزن خروجی</Label>
                  <Input value={value.goldScale} onChange={(event) => patch({ goldScale: event.target.value })} />
                </div>
                <div>
                  <Label>مبلغ (خالی = مظنه)</Label>
                  <Input inputMode="numeric" value={value.goldTotal} onChange={(event) => patch({ goldTotal: event.target.value })} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={`px-3 py-2 text-sm ${over ? "bg-[#fde8e8] text-[#a32020]" : "bg-[#e7f0fb]"}`}>
          {total === null ? "مبلغ سند هنوز مشخص نیست." : (
            <>
              مبلغ سند {formatRial(total)} ریال
              {" · "}
              تسویه {formatRial(used)} 
              {" · "}
              {over ? "جمع تسویه از مبلغ سند بیشتر است" : rest === 0n ? "تسویه کامل، حساب شخص صفر می‌ماند" : `مانده در حساب ${formatRial(rest ?? 0n)} ریال`}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
