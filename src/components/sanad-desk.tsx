"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Decimal from "decimal.js";
import { priceGold, type PriceMode } from "@/lib/accounting";
import type { DeskData } from "@/lib/dto";
import { formatRial, formatWeight, parseAmount } from "@/lib/format";
import { KIND_LABEL } from "@/lib/labels";
import { cashAction, coinAction, goldInAction, goldOutAction, goldTradeAction, meltAction, sendPiecesAction, type ActionFail, type ActionOk } from "@/server/actions";
import { emptySettle, moneyFromSettle, SettleBox, type SettleValue } from "@/components/settle-box";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

const tabs = [
  { id: "in", label: "ورود طلا" },
  { id: "out", label: "خروج طلا" },
  { id: "buy", label: "خرید پولی" },
  { id: "sell", label: "فروش پولی" },
  { id: "melt", label: "ذوب" },
  { id: "coin", label: "سکه" },
  { id: "cash", label: "وجه" },
  { id: "send", label: "ارسال تکه" },
];

function usePost() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function run(work: () => Promise<ActionOk | ActionFail>) {
    setError(null);
    start(async () => {
      const result = await work();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("سند ثبت شد");
      router.push(`/documents/${result.id}`);
      router.refresh();
    });
  }
  return { error, pending, run };
}

function AccountSelect({
  accounts,
  value,
  onChange,
}: {
  accounts: DeskData["accounts"];
  value: string;
  onChange: (value: string) => void;
}) {
  const groups = [...new Set(accounts.map((account) => account.groupLabel))];
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">انتخاب حساب</option>
      {groups.map((group) => (
        <optgroup key={group} label={group}>
          {accounts
            .filter((account) => account.groupLabel === group)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} — {account.title}
              </option>
            ))}
        </optgroup>
      ))}
    </Select>
  );
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="rounded-xl bg-[#fff1f2] px-3 py-2 text-sm text-[#9d243c]">{error}</p>;
}

export function SanadDesk({ data, tab }: { data: DeskData; tab: string }) {
  const initial = tabs.some((item) => item.id === tab) ? tab : "in";
  const [current, setCurrent] = useState(initial);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">ثبت سند</h1>
        <p className="mt-1 text-sm text-[#6d6458]">تاریخ پیش‌فرض امروز است: {data.todayLabel}. آبیِ زرین اینجا ورود است و قرمز خروج.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCurrent(item.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${current === item.id ? "bg-[#16211e] text-[#f4ecdc]" : "bg-white text-[#3f382f]"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="panel p-4 md:p-6">
        {current === "in" ? <GoldIn data={data} /> : null}
        {current === "out" ? <GoldOut data={data} /> : null}
        {current === "buy" ? <GoldTrade data={data} side="BUY" /> : null}
        {current === "sell" ? <GoldTrade data={data} side="SELL" /> : null}
        {current === "melt" ? <Melt data={data} /> : null}
        {current === "coin" ? <CoinForm data={data} /> : null}
        {current === "cash" ? <CashForm data={data} /> : null}
        {current === "send" ? <SendForm data={data} /> : null}
      </div>
    </div>
  );
}

function GoldIn({ data }: { data: DeskData }) {
  const post = usePost();
  const [kind, setKind] = useState<"MOTAFARREQE" | "ABSHODE">("MOTAFARREQE");
  const [conditional, setConditional] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [scale, setScale] = useState("");
  const [ayar, setAyar] = useState(data.defaultAyar);
  const [labId, setLabId] = useState("");
  const [envelopeNo, setEnvelopeNo] = useState("");
  const [ang, setAng] = useState("");
  const [note, setNote] = useState("");
  const shownAyar = conditional ? data.standardAyar : ayar || (kind === "MOTAFARREQE" ? data.defaultAyar : data.standardAyar);
  const preview = useMemo(() => {
    try {
      return formatWeight(new Decimal(parseAmount(scale)).mul(shownAyar).div(data.standardAyar));
    } catch {
      return null;
    }
  }, [scale, shownAyar, data.standardAyar]);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        post.run(() => goldInAction({ date: data.today, accountId, kind, scale, ayar: conditional ? undefined : ayar, conditional, labId, envelopeNo, ang, note }));
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>حساب</Label>
          <AccountSelect accounts={data.accounts} value={accountId} onChange={setAccountId} />
        </div>
        <div>
          <Label>نوع</Label>
          <Select
            value={kind}
            onChange={(event) => {
              const next = event.target.value as "MOTAFARREQE" | "ABSHODE";
              setKind(next);
              setAyar(next === "MOTAFARREQE" ? data.defaultAyar : data.standardAyar);
            }}
          >
            <option value="MOTAFARREQE">متفرقه</option>
            <option value="ABSHODE">آبشده</option>
          </Select>
        </div>
        <div>
          <Label>وزن ترازو (گرم)</Label>
          <Input value={scale} onChange={(event) => setScale(event.target.value)} placeholder="70/53" />
        </div>
        <div>
          <Label>عیار</Label>
          <Input value={shownAyar} disabled={conditional} onChange={(event) => setAyar(event.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={conditional} onChange={(event) => setConditional(event.target.checked)} />
        شرطی است؛ تا جواب ری عیار {data.standardAyar} حساب می‌شود
      </label>
      {preview ? <p className="text-sm">معادل ۷۵۰: {preview} گرم</p> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>ری‌گیری</Label>
          <Select value={labId} onChange={(event) => setLabId(event.target.value)}>
            <option value="">—</option>
            {data.labs.map((lab) => (
              <option key={lab.id} value={lab.id}>{lab.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>شماره پاکت</Label>
          <Input value={envelopeNo} onChange={(event) => setEnvelopeNo(event.target.value)} />
        </div>
        <div>
          <Label>انگ</Label>
          <Input value={ang} onChange={(event) => setAng(event.target.value)} />
        </div>
      </div>
      <div>
        <Label>شرح</Label>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
      <ErrorText error={post.error} />
      <Button disabled={post.pending} className="bg-[#1d4e89]">{post.pending ? "در حال ثبت…" : "ثبت ورود"}</Button>
    </form>
  );
}

function GoldOut({ data }: { data: DeskData }) {
  const post = usePost();
  const [accountId, setAccountId] = useState("");
  const [itemId, setItemId] = useState(data.pieces[0]?.id ?? "");
  const piece = data.pieces.find((item) => item.id === itemId);
  const [scale, setScale] = useState(piece?.scale ?? "");
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        post.run(() => goldOutAction({ date: data.today, accountId, itemId, scale }));
      }}
    >
      <p className="text-sm text-[#6d6458]">عیار را دوباره نمی‌پرسد؛ همان عیار ورود است. اگر وزن کمتر از مانده باشد، بقیه در صندوق می‌ماند (قیچی).</p>
      <div>
        <Label>حساب گیرنده</Label>
        <AccountSelect accounts={data.accounts} value={accountId} onChange={setAccountId} />
      </div>
      <PiecePick data={data} itemId={itemId} onChange={(id) => {
        setItemId(id);
        setScale(data.pieces.find((item) => item.id === id)?.scale ?? "");
      }} />
      <div>
        <Label>وزن خروجی</Label>
        <Input value={scale} onChange={(event) => setScale(event.target.value)} />
      </div>
      <ErrorText error={post.error} />
      <Button disabled={post.pending} variant="danger">{post.pending ? "در حال ثبت…" : "ثبت خروج"}</Button>
    </form>
  );
}

function PiecePick({ data, itemId, onChange }: { data: DeskData; itemId: string; onChange: (id: string) => void }) {
  return (
    <div className="max-h-64 space-y-2 overflow-auto rounded-xl border border-[#e4d9c6] p-2">
      {data.pieces.length === 0 ? <p className="p-3 text-sm text-[#6d6458]">قطعهٔ موجودی نیست.</p> : null}
      {data.pieces.map((piece) => (
        <label key={piece.id} className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 ${piece.stale ? "bg-[#f5edff]" : piece.pending ? "bg-[#fff6eb]" : "hover:bg-[#faf6ee]"}`}>
          <input type="radio" name="piece" checked={itemId === piece.id} onChange={() => onChange(piece.id)} />
          <span className="text-sm">
            <b>{piece.codeLabel}</b> {piece.kindLabel} — {formatWeight(piece.scale)} گرم، عیار {piece.ayar}، معادل {formatWeight(piece.weight750)}
            {piece.pending ? " · شرطی" : ""}
            {piece.stale ? " · راکد" : ""}
            {piece.ang ? ` · انگ ${piece.ang}` : ""}
          </span>
        </label>
      ))}
    </div>
  );
}

function GoldTrade({ data, side }: { data: DeskData; side: "BUY" | "SELL" }) {
  const post = usePost();
  const [accountId, setAccountId] = useState("");
  const [kind, setKind] = useState<"MOTAFARREQE" | "ABSHODE">("MOTAFARREQE");
  const [scale, setScale] = useState("");
  const [ayar, setAyar] = useState(data.defaultAyar);
  const [itemId, setItemId] = useState(data.pieces[0]?.id ?? "");
  const [sellScale, setSellScale] = useState(data.pieces[0]?.scale ?? "");
  const [mode, setMode] = useState<PriceMode>("mesghal");
  const [mazane, setMazane] = useState(data.mazane?.mesghal ?? "");
  const [total, setTotal] = useState("");
  const [date, setDate] = useState(data.today);
  const [settle, setSettle] = useState<SettleValue>(() => emptySettle(data));
  const [ang, setAng] = useState("");
  const [note, setNote] = useState("");
  const piece = data.pieces.find((item) => item.id === itemId);

  const preview = useMemo(() => {
    try {
      const weightScale = side === "BUY" ? parseAmount(scale) : parseAmount(sellScale || "0");
      const usedAyar = side === "BUY" ? parseAmount(ayar || data.defaultAyar) : Number(piece?.ayar || data.standardAyar);
      const mazaneValue = mode === "total" ? undefined : parseAmount(mazane || (mode === "mesghal" ? data.mazane?.mesghal ?? "" : data.mazane?.gram ?? ""));
      return priceGold({
        scale: weightScale,
        ayar: usedAyar,
        mode,
        mazane: mazaneValue,
        totalRial: mode === "total" ? parseAmount(total) : undefined,
        mesghalGrams: data.mesghalGrams,
        mesghalAyar: data.mesghalAyar,
        standardAyar: data.standardAyar,
      });
    } catch {
      return null;
    }
  }, [side, scale, ayar, piece, sellScale, mode, mazane, total, data]);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        post.run(() =>
          goldTradeAction({
            side,
            date,
            accountId,
            settle: "account",
            money: moneyFromSettle(settle),
            coinOffset: settle.coinOn ? { coinTypeId: settle.coinTypeId, count: settle.coinCount, unitPrice: settle.coinPrice } : null,
            goldOffset: settle.goldOn
              ? {
                  scale: settle.goldScale,
                  ayar: side === "SELL" ? settle.goldAyar : undefined,
                  kind: side === "SELL" ? settle.goldKind : undefined,
                  itemId: side === "BUY" ? settle.goldItemId : undefined,
                  total: settle.goldTotal,
                }
              : null,
            mode,
            mazane: mode === "total" ? undefined : mazane,
            total: mode === "total" ? total : undefined,
            kind: side === "BUY" ? kind : undefined,
            scale: side === "BUY" ? scale : sellScale,
            ayar: side === "BUY" ? ayar : undefined,
            itemId: side === "SELL" ? itemId : undefined,
            ang,
            note,
          }),
        );
      }}
    >
      <p className="text-sm text-[#6d6458]">
        {side === "BUY"
          ? "خرید پولی گرم را به حساب شخص نمی‌برد؛ یا به او بدهکار ریالی می‌شوید یا همان لحظه نقد می‌دهید. وزن ۷۵۰ = وزن × عیار / ۷۵۰."
          : "فروش از موجودی کم می‌کند و مبلغ را بدهکار شخص یا وصول نقد می‌کند. قیمت روی وزن ۷۵۰ همان قطعه است."}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>حساب</Label>
          <AccountSelect accounts={data.accounts} value={accountId} onChange={setAccountId} />
        </div>
        <div>
          <Label>تاریخ</Label>
          <Input value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </div>
      {side === "BUY" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>نوع</Label>
            <Select value={kind} onChange={(event) => setKind(event.target.value as "MOTAFARREQE" | "ABSHODE")}>
              <option value="MOTAFARREQE">{KIND_LABEL.MOTAFARREQE}</option>
              <option value="ABSHODE">{KIND_LABEL.ABSHODE}</option>
            </Select>
          </div>
          <div>
            <Label>وزن ترازو</Label>
            <Input value={scale} onChange={(event) => setScale(event.target.value)} />
          </div>
          <div>
            <Label>عیار</Label>
            <Input value={ayar} onChange={(event) => setAyar(event.target.value)} />
          </div>
        </div>
      ) : (
        <>
          <PiecePick
            data={data}
            itemId={itemId}
            onChange={(id) => {
              setItemId(id);
              setSellScale(data.pieces.find((item) => item.id === id)?.scale ?? "");
            }}
          />
          <div>
            <Label>وزن فروشی از همین قطعه</Label>
            <Input value={sellScale} onChange={(event) => setSellScale(event.target.value)} />
          </div>
        </>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>نحوهٔ قیمت</Label>
          <Select
            value={mode}
            onChange={(event) => {
              const next = event.target.value as PriceMode;
              setMode(next);
              if (next === "mesghal") setMazane(data.mazane?.mesghal ?? "");
              if (next === "gram") setMazane(data.mazane?.gram ?? "");
            }}
          >
            <option value="mesghal">مظنه مثقال ۷۰۵</option>
            <option value="gram">مظنه گرم ۷۵۰</option>
            <option value="total">مبلغ کل دستی</option>
          </Select>
        </div>
        {mode === "total" ? (
          <div>
            <Label>مبلغ کل (ریال)</Label>
            <Input value={total} onChange={(event) => setTotal(event.target.value)} />
          </div>
        ) : (
          <div>
            <Label>مظنه (ریال)</Label>
            <Input value={mazane} onChange={(event) => setMazane(event.target.value)} />
          </div>
        )}
      </div>
      {preview ? (
        <div className="rounded-xl bg-[#faf6ee] px-3 py-2 text-sm">
          وزن ۷۵۰: {formatWeight(preview.weight750)} — مبلغ: {formatRial(preview.totalRial)} ریال ({formatRial(preview.totalRial / 10n)} تومان)
        </div>
      ) : null}
      <SettleBox
        total={preview?.totalRial ?? null}
        data={data}
        direction={side === "SELL" ? "receive" : "pay"}
        instruments
        value={settle}
        onChange={setSettle}
      />
      {side === "BUY" ? (
        <div>
          <Label>انگ</Label>
          <Input value={ang} onChange={(event) => setAng(event.target.value)} />
        </div>
      ) : null}
      <div>
        <Label>شرح</Label>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
      <ErrorText error={post.error} />
      <Button disabled={post.pending} variant={side === "SELL" ? "danger" : "default"}>{post.pending ? "در حال ثبت…" : side === "BUY" ? "ثبت خرید" : "ثبت فروش"}</Button>
    </form>
  );
}

function Melt({ data }: { data: DeskData }) {
  const post = usePost();
  const [meltAccountId, setMeltAccountId] = useState(data.expenseAccounts[0]?.id ?? "");
  const [picked, setPicked] = useState<Record<string, { on: boolean; scale: string }>>(() =>
    Object.fromEntries(data.pieces.map((piece) => [piece.id, { on: false, scale: piece.scale }])),
  );
  const [backScale, setBackScale] = useState("");
  const [backAyar, setBackAyar] = useState(data.standardAyar);
  const [conditional, setConditional] = useState(false);
  const [ang, setAng] = useState("");
  const [note, setNote] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const sends = data.pieces.filter((piece) => picked[piece.id]?.on).map((piece) => ({ itemId: piece.id, scale: picked[piece.id].scale }));
        post.run(() =>
          meltAction({
            date: data.today,
            meltAccountId,
            note,
            sends,
            returns: [{ scale: backScale, ayar: conditional ? undefined : backAyar, conditional, ang }],
          }),
        );
      }}
    >
      <p className="text-sm text-[#6d6458]">طلا به حساب سوخت (ذوب) خارج می‌شود و آبشدهٔ برگشتی از همان حساب وارد می‌شود. اختلاف گرم، زیان ذوب و بدهکار همان حساب است.</p>
      <div>
        <Label>حساب ذوب</Label>
        <Select value={meltAccountId} onChange={(event) => setMeltAccountId(event.target.value)}>
          {data.expenseAccounts.map((account) => (
            <option key={account.id} value={account.id}>{account.title}</option>
          ))}
        </Select>
      </div>
      <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-[#e4d9c6] p-2">
        {data.pieces.map((piece) => (
          <label key={piece.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={picked[piece.id]?.on ?? false}
              onChange={(event) => setPicked((prev) => ({ ...prev, [piece.id]: { ...prev[piece.id], on: event.target.checked } }))}
            />
            <span className="flex-1">{piece.codeLabel} {piece.kindLabel} {formatWeight(piece.scale)}</span>
            <Input
              className="w-28"
              value={picked[piece.id]?.scale ?? ""}
              onChange={(event) => setPicked((prev) => ({ ...prev, [piece.id]: { ...prev[piece.id], scale: event.target.value } }))}
            />
          </label>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>وزن آبشدهٔ برگشتی</Label>
          <Input value={backScale} onChange={(event) => setBackScale(event.target.value)} />
        </div>
        <div>
          <Label>عیار برگشتی</Label>
          <Input disabled={conditional} value={conditional ? data.standardAyar : backAyar} onChange={(event) => setBackAyar(event.target.value)} />
        </div>
        <label className="mt-7 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={conditional} onChange={(event) => setConditional(event.target.checked)} />
          برگشتی شرطی است
        </label>
      </div>
      <div>
        <Label>انگ شمش</Label>
        <Input value={ang} onChange={(event) => setAng(event.target.value)} />
      </div>
      <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="شرح ذوب" />
      <ErrorText error={post.error} />
      <Button disabled={post.pending}>{post.pending ? "در حال ثبت…" : "ثبت ذوب"}</Button>
    </form>
  );
}

function CoinForm({ data }: { data: DeskData }) {
  const post = usePost();
  const [op, setOp] = useState<"BUY" | "SELL" | "RECEIVE" | "PAY">("BUY");
  const [accountId, setAccountId] = useState("");
  const [coinTypeId, setCoinTypeId] = useState(data.coins[0]?.id ?? "");
  const coin = data.coins.find((item) => item.id === coinTypeId);
  const [count, setCount] = useState("1");
  const [unitPrice, setUnitPrice] = useState(data.coins[0]?.buy ?? "");
  const [date, setDate] = useState(data.today);
  const [settle, setSettle] = useState<SettleValue>(() => emptySettle(data));
  const [note, setNote] = useState("");
  const total = useMemo(() => {
    try {
      const n = Number(parseAmount(count).toFixed(0));
      const fee = unitPrice.trim() ? parseAmount(unitPrice) : 0;
      return BigInt(n) * BigInt(Math.round(fee));
    } catch {
      return null;
    }
  }, [count, unitPrice]);
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        post.run(() =>
          coinAction({
            date,
            accountId,
            coinTypeId,
            op,
            count,
            unitPrice,
            settle: "account",
            money: moneyFromSettle(settle),
            coinOffset:
              (op === "BUY" || op === "SELL") && settle.coinOn
                ? { coinTypeId: settle.coinTypeId, count: settle.coinCount, unitPrice: settle.coinPrice }
                : null,
            goldOffset:
              (op === "BUY" || op === "SELL") && settle.goldOn
                ? {
                    scale: settle.goldScale,
                    ayar: op === "SELL" ? settle.goldAyar : undefined,
                    kind: op === "SELL" ? settle.goldKind : undefined,
                    itemId: op === "BUY" ? settle.goldItemId : undefined,
                    total: settle.goldTotal,
                  }
                : null,
            note,
          }),
        );
      }}
    >
      <p className="text-sm text-[#6d6458]">خرید و فروش حساب تعدادی شخص را عوض نمی‌کند. دریافت و پرداخت، سکه را امانی در حساب تعدادی می‌نشاند. فی در دریافت و پرداخت اجرت است و می‌تواند صفر باشد.</p>
      <div className="flex flex-wrap gap-2">
        {(["BUY", "SELL", "RECEIVE", "PAY"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${op === item ? "bg-[#16211e] text-white" : "bg-[#faf6ee]"}`}
            onClick={() => {
              setOp(item);
              if (!coin) return;
              if (item === "SELL") setUnitPrice(coin.sell);
              else if (item === "BUY") setUnitPrice(coin.buy);
              else setUnitPrice("");
            }}
          >
            {item === "BUY" ? "خرید" : item === "SELL" ? "فروش" : item === "RECEIVE" ? "دریافت" : "پرداخت"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>حساب</Label>
          <AccountSelect accounts={data.accounts} value={accountId} onChange={setAccountId} />
        </div>
        <div>
          <Label>سکه</Label>
          <Select
            value={coinTypeId}
            onChange={(event) => {
              const id = event.target.value;
              setCoinTypeId(id);
              const next = data.coins.find((item) => item.id === id);
              if (!next) return;
              setUnitPrice(op === "SELL" ? next.sell : op === "BUY" ? next.buy : "");
            }}
          >
            {data.coins.map((item) => (
              <option key={item.id} value={item.id}>{item.name} — موجودی {item.stock}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>تعداد</Label>
          <Input value={count} onChange={(event) => setCount(event.target.value)} />
        </div>
        <div>
          <Label>{op === "RECEIVE" || op === "PAY" ? "اجرت هر عدد (ریال)" : "فی هر عدد (ریال)"}</Label>
          <Input value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} />
        </div>
      </div>
      {total !== null ? <p className="text-sm">جمع: {formatRial(total)} ریال</p> : null}
      <div>
        <Label>تاریخ</Label>
        <Input value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      <SettleBox
        total={total}
        data={data}
        direction={op === "BUY" ? "pay" : "receive"}
        instruments={op === "BUY" || op === "SELL"}
        value={settle}
        onChange={setSettle}
      />
      <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="شرح" />
      <ErrorText error={post.error} />
      <Button disabled={post.pending}>{post.pending ? "در حال ثبت…" : "ثبت سند سکه"}</Button>
    </form>
  );
}

function CashForm({ data }: { data: DeskData }) {
  const post = usePost();
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [via, setVia] = useState<"cash" | "bank">("cash");
  const [bankId, setBankId] = useState(data.banks[0]?.id ?? "");
  const [note, setNote] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        post.run(() => cashAction({ date: data.today, accountId, direction, amount, via, bankAccountId: bankId, note }));
      }}
    >
      <p className="text-sm text-[#4d6278]">برای وجهِ چندبخشی و حوالهٔ صندوق به بانک، صفحهٔ صندوق را باز کنید.</p>
      <div className="flex gap-2">
        <button type="button" className={`px-3 py-2 text-sm ${direction === "IN" ? "bg-[#1a56a8] text-white" : "border border-[#8eadd4] bg-white"}`} onClick={() => setDirection("IN")}>دریافت</button>
        <button type="button" className={`px-3 py-2 text-sm ${direction === "OUT" ? "bg-[#a32020] text-white" : "border border-[#8eadd4] bg-white"}`} onClick={() => setDirection("OUT")}>پرداخت</button>
      </div>
      <div>
        <Label>حساب شخص</Label>
        <AccountSelect accounts={data.accounts} value={accountId} onChange={setAccountId} />
      </div>
      <div>
        <Label>مبلغ (ریال)</Label>
        <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="20000000" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>محل</Label>
          <Select value={via} onChange={(event) => setVia(event.target.value as "cash" | "bank")}>
            <option value="cash">صندوق</option>
            <option value="bank">بانک</option>
          </Select>
        </div>
        {via === "bank" ? (
          <div>
            <Label>بانک</Label>
            <Select value={bankId} onChange={(event) => setBankId(event.target.value)}>
              {data.banks.map((bank) => (
                <option key={bank.id} value={bank.id}>{bank.title}</option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
      <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثلاً بابت تسویه مانده" />
      <ErrorText error={post.error} />
      <Button disabled={post.pending}>{post.pending ? "در حال ثبت…" : "ثبت وجه"}</Button>
    </form>
  );
}

function SendForm({ data }: { data: DeskData }) {
  const post = usePost();
  const [accountId, setAccountId] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("30");
  const [picked, setPicked] = useState<string[]>([]);
  const filtered = data.pieces.filter((piece) => {
    const weight = Number(piece.scale);
    try {
      const lo = min.trim() ? parseAmount(min) : 0;
      const hi = max.trim() ? parseAmount(max) : Number.POSITIVE_INFINITY;
      return weight >= lo && weight <= hi;
    } catch {
      return true;
    }
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        post.run(() => sendPiecesAction({ date: data.today, accountId, itemIds: picked }));
      }}
    >
      <p className="text-sm text-[#6d6458]">تکه‌های ریز موجود را یکجا به حسابی مثل ذوب می‌فرستد. وزن کامل مانده خارج می‌شود.</p>
      <div>
        <Label>حساب مقصد</Label>
        <AccountSelect accounts={data.accounts} value={accountId} onChange={setAccountId} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>از وزن</Label>
          <Input value={min} onChange={(event) => setMin(event.target.value)} />
        </div>
        <div>
          <Label>تا وزن</Label>
          <Input value={max} onChange={(event) => setMax(event.target.value)} />
        </div>
      </div>
      <div className="max-h-56 space-y-2 overflow-auto">
        {filtered.length === 0 ? <p className="text-sm text-[#6d6458]">در این بازه تکه‌ای نیست.</p> : null}
        {filtered.map((piece) => (
          <label key={piece.id} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={picked.includes(piece.id)}
              onChange={(event) => setPicked((prev) => event.target.checked ? [...prev, piece.id] : prev.filter((id) => id !== piece.id))}
            />
            {piece.codeLabel} {piece.kindLabel} {formatWeight(piece.scale)} گرم
          </label>
        ))}
      </div>
      <ErrorText error={post.error} />
      <Button disabled={post.pending}>{post.pending ? "در حال ثبت…" : "ارسال انتخاب‌شده‌ها"}</Button>
    </form>
  );
}
