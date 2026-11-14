"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Decimal from "decimal.js";
import { priceGold, type PriceMode } from "@/lib/accounting";
import { EntryForm, SaveButton, toastSaved } from "@/components/entry/form";
import { useFormMemory } from "@/components/entry/memory";
import { NewPersonDialog } from "@/components/entry/new-person";
import { NumberField } from "@/components/entry/number-field";
import { PersonPicker } from "@/components/entry/person-picker";
import { useInsertedPerson } from "@/components/entry/use-inserted";
import { clearSettleAmounts, emptySettle, moneyFromSettle, SettleBox, type SettleValue } from "@/components/settle-box";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { AccountOption, DeskData } from "@/lib/dto";
import { formatRial, formatWeight, parseAmount } from "@/lib/format";
import { KIND_LABEL } from "@/lib/labels";
import { trimDecimal } from "@/lib/number-input";
import { cashAction, coinAction, goldInAction, goldOutAction, goldTradeAction, meltAction, sendPiecesAction, type ActionFail, type ActionOk } from "@/server/actions";

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

type PartyProps = {
  people: AccountOption[];
  insertedId: string | null;
  onNewPerson: () => void;
};

function usePost(onDone?: () => void) {
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
      toastSaved(result.number, () => router.push(`/documents/${result.id}`));
      onDone?.();
      router.refresh();
    });
  }
  return { error, pending, run };
}

function usePulse() {
  const [pulse, setPulse] = useState(0);
  const [focusAt, setFocusAt] = useState<"start" | "next">("start");
  function focusNext() {
    setFocusAt("next");
    setPulse((n) => n + 1);
  }
  function focusStart() {
    setFocusAt("start");
    setPulse((n) => n + 1);
  }
  return { pulse, focusAt, focusNext, focusStart };
}

function settleDirty(value: SettleValue) {
  return Boolean(value.cash.trim() || value.banks.some((line) => line.amount.trim()) || value.coinOn || value.goldOn);
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="rounded-xl bg-[#fff1f2] px-3 py-2 text-sm text-[#9d243c]">{error}</p>;
}

export function SanadDesk({ data, tab }: { data: DeskData; tab: string }) {
  const initial = tabs.some((item) => item.id === tab) ? tab : "in";
  const [current, setCurrent] = useState(initial);
  const [extra, setExtra] = useState<AccountOption[]>([]);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const people = useMemo(() => {
    const map = new Map(data.accounts.map((account) => [account.id, account]));
    for (const person of extra) if (!map.has(person.id)) map.set(person.id, person);
    return [...map.values()].sort((a, b) => a.code - b.code);
  }, [data.accounts, extra]);
  const party: PartyProps = { people, insertedId, onNewPerson: () => setOpenNew(true) };
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
            className={`min-h-11 rounded-full px-3 py-1.5 text-sm md:min-h-0 ${current === item.id ? "bg-[#16211e] text-[#f4ecdc]" : "bg-white text-[#3f382f]"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="panel p-4 md:p-6">
        {current === "in" ? <GoldIn data={data} {...party} /> : null}
        {current === "out" ? <GoldOut data={data} {...party} /> : null}
        {current === "buy" ? <GoldTrade data={data} side="BUY" {...party} /> : null}
        {current === "sell" ? <GoldTrade data={data} side="SELL" {...party} /> : null}
        {current === "melt" ? <Melt data={data} /> : null}
        {current === "coin" ? <CoinForm data={data} {...party} /> : null}
        {current === "cash" ? <CashForm data={data} {...party} /> : null}
        {current === "send" ? <SendForm data={data} {...party} /> : null}
      </div>
      <NewPersonDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onCreated={(person) => {
          setExtra((prev) => (prev.some((item) => item.id === person.id) ? prev : [...prev, person]));
          setInsertedId(person.id);
          setOpenNew(false);
        }}
      />
    </div>
  );
}

function GoldIn({ data, people, insertedId, onNewPerson }: { data: DeskData } & PartyProps) {
  const focus = usePulse();
  const post = usePost(() => {
    setScale("");
    setConditional(false);
    setEnvelopeNo("");
    setAng("");
    setNote("");
    focus.focusNext();
  });
  const [kind, setKind] = useState<"MOTAFARREQE" | "ABSHODE">("MOTAFARREQE");
  const [conditional, setConditional] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [scale, setScale] = useState("");
  const [ayar, setAyar] = useState(trimDecimal(data.defaultAyar));
  const [labId, setLabId] = useState("");
  const [envelopeNo, setEnvelopeNo] = useState("");
  const [ang, setAng] = useState("");
  const [note, setNote] = useState("");
  useInsertedPerson(insertedId, setAccountId);
  useFormMemory("sanad-in", { kind, ayar, labId }, (saved) => {
    if (saved.kind === "ABSHODE" || saved.kind === "MOTAFARREQE") {
      setKind(saved.kind);
      setAyar(saved.ayar || trimDecimal(saved.kind === "MOTAFARREQE" ? data.defaultAyar : data.standardAyar));
    } else if (saved.ayar) setAyar(saved.ayar);
    if (saved.labId && data.labs.some((lab) => lab.id === saved.labId)) setLabId(saved.labId);
  });
  const shownAyar = conditional ? trimDecimal(data.standardAyar) : ayar || trimDecimal(kind === "MOTAFARREQE" ? data.defaultAyar : data.standardAyar);
  const preview = useMemo(() => {
    try {
      return formatWeight(new Decimal(parseAmount(scale)).mul(shownAyar).div(data.standardAyar));
    } catch {
      return null;
    }
  }, [scale, shownAyar, data.standardAyar]);

  function wipe() {
    setAccountId("");
    setScale("");
    setConditional(false);
    setEnvelopeNo("");
    setAng("");
    setNote("");
    focus.focusStart();
  }

  return (
    <EntryForm
      className="grid gap-4"
      pending={post.pending}
      dirty={Boolean(accountId || scale.trim() || note.trim() || ang.trim() || envelopeNo.trim() || conditional)}
      focusNonce={focus.pulse}
      focusTarget={focus.focusAt}
      onNewPerson={onNewPerson}
      onClear={wipe}
      onSubmit={() => {
        post.run(() => goldInAction({ date: data.today, accountId, kind, scale, ayar: conditional ? undefined : ayar, conditional, labId, envelopeNo, ang, note }));
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <PersonPicker people={people} value={accountId} onChange={setAccountId} onNewPerson={onNewPerson} autoFocus />
        <div>
          <Label>نوع</Label>
          <Select
            value={kind}
            onChange={(event) => {
              const next = event.target.value as "MOTAFARREQE" | "ABSHODE";
              setKind(next);
              setAyar(trimDecimal(next === "MOTAFARREQE" ? data.defaultAyar : data.standardAyar));
            }}
          >
            <option value="MOTAFARREQE">متفرقه</option>
            <option value="ABSHODE">آبشده</option>
          </Select>
        </div>
        <div>
          <Label>وزن ترازو (گرم)</Label>
          <NumberField data-entry-next="" kind="decimal" value={scale} onChange={setScale} placeholder="۷۰/۵۳" />
        </div>
        <div>
          <Label>عیار</Label>
          <NumberField kind="decimal" value={shownAyar} disabled={conditional} onChange={setAyar} />
        </div>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" className="size-5" checked={conditional} onChange={(event) => setConditional(event.target.checked)} />
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
      <SaveButton disabled={post.pending} className="bg-[#1d4e89]">{post.pending ? "در حال ثبت…" : "ثبت ورود"}</SaveButton>
    </EntryForm>
  );
}

function GoldOut({ data, people, insertedId, onNewPerson }: { data: DeskData } & PartyProps) {
  const focus = usePulse();
  const [accountId, setAccountId] = useState("");
  const [itemId, setItemId] = useState(data.pieces[0]?.id ?? "");
  const piece = data.pieces.find((item) => item.id === itemId);
  const [scale, setScale] = useState(piece?.scale ?? "");
  useInsertedPerson(insertedId, setAccountId);
  const post = usePost(() => {
    setScale(data.pieces.find((item) => item.id === itemId)?.scale ?? "");
    focus.focusNext();
  });
  return (
    <EntryForm
      className="grid gap-4"
      pending={post.pending}
      dirty={Boolean(accountId)}
      focusNonce={focus.pulse}
      focusTarget={focus.focusAt}
      onNewPerson={onNewPerson}
      onClear={() => {
        setAccountId("");
        setScale(data.pieces[0]?.scale ?? "");
        setItemId(data.pieces[0]?.id ?? "");
        focus.focusStart();
      }}
      onSubmit={() => {
        post.run(() => goldOutAction({ date: data.today, accountId, itemId, scale }));
      }}
    >
      <p className="text-sm text-[#6d6458]">عیار را دوباره نمی‌پرسد؛ همان عیار ورود است. اگر وزن کمتر از مانده باشد، بقیه در صندوق می‌ماند (قیچی).</p>
      <PersonPicker label="حساب گیرنده" people={people} value={accountId} onChange={setAccountId} onNewPerson={onNewPerson} autoFocus />
      <PiecePick data={data} itemId={itemId} onChange={(id) => {
        setItemId(id);
        setScale(data.pieces.find((item) => item.id === id)?.scale ?? "");
      }} />
      <div>
        <Label>وزن خروجی</Label>
        <NumberField data-entry-next="" kind="decimal" value={scale} onChange={setScale} />
      </div>
      <ErrorText error={post.error} />
      <SaveButton disabled={post.pending} variant="danger">{post.pending ? "در حال ثبت…" : "ثبت خروج"}</SaveButton>
    </EntryForm>
  );
}

function PiecePick({ data, itemId, onChange }: { data: DeskData; itemId: string; onChange: (id: string) => void }) {
  return (
    <div className="max-h-64 space-y-2 overflow-auto rounded-xl border border-[#e4d9c6] p-2">
      {data.pieces.length === 0 ? <p className="p-3 text-sm text-[#6d6458]">قطعهٔ موجودی نیست.</p> : null}
      {data.pieces.map((piece) => (
        <label key={piece.id} className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 ${piece.stale ? "bg-[#f5edff]" : piece.pending ? "bg-[#fff6eb]" : "hover:bg-[#faf6ee]"}`}>
          <input type="radio" className="mt-1 size-5" name="piece" checked={itemId === piece.id} onChange={() => onChange(piece.id)} />
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

function GoldTrade({ data, side, people, insertedId, onNewPerson }: { data: DeskData; side: "BUY" | "SELL" } & PartyProps) {
  const focus = usePulse();
  const [accountId, setAccountId] = useState("");
  const [kind, setKind] = useState<"MOTAFARREQE" | "ABSHODE">("MOTAFARREQE");
  const [scale, setScale] = useState("");
  const [ayar, setAyar] = useState(trimDecimal(data.defaultAyar));
  const [itemId, setItemId] = useState(data.pieces[0]?.id ?? "");
  const [sellScale, setSellScale] = useState(data.pieces[0]?.scale ?? "");
  const [mode, setMode] = useState<PriceMode>("mesghal");
  const [mazane, setMazane] = useState(data.mazane?.mesghal ?? "");
  const [total, setTotal] = useState("");
  const [date, setDate] = useState(data.today);
  const [settle, setSettle] = useState<SettleValue>(() => emptySettle(data));
  const [ang, setAng] = useState("");
  const [note, setNote] = useState("");
  useInsertedPerson(insertedId, setAccountId);
  useFormMemory(side === "BUY" ? "sanad-buy" : "sanad-sell", { kind, ayar, mode }, (saved) => {
    if (side === "BUY" && (saved.kind === "ABSHODE" || saved.kind === "MOTAFARREQE")) setKind(saved.kind);
    if (side === "BUY" && saved.ayar) setAyar(saved.ayar);
    if (saved.mode === "mesghal" || saved.mode === "gram" || saved.mode === "total") {
      setMode(saved.mode);
      if (saved.mode === "gram") setMazane(data.mazane?.gram ?? "");
      if (saved.mode === "mesghal") setMazane(data.mazane?.mesghal ?? "");
    }
  });
  const post = usePost(() => {
    setScale("");
    setTotal("");
    setAng("");
    setNote("");
    setSellScale(data.pieces.find((item) => item.id === itemId)?.scale ?? "");
    setSettle((value) => clearSettleAmounts(value));
    focus.focusNext();
  });
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

  function wipe() {
    setAccountId("");
    setScale("");
    setTotal("");
    setAng("");
    setNote("");
    setDate(data.today);
    setSettle(emptySettle(data));
    setSellScale(data.pieces[0]?.scale ?? "");
    setItemId(data.pieces[0]?.id ?? "");
    focus.focusStart();
  }

  return (
    <EntryForm
      className="grid gap-4"
      pending={post.pending}
      dirty={Boolean(accountId || scale.trim() || total.trim() || note.trim() || ang.trim() || date !== data.today || settleDirty(settle))}
      focusNonce={focus.pulse}
      focusTarget={focus.focusAt}
      onNewPerson={onNewPerson}
      onClear={wipe}
      onSubmit={() => {
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
        <PersonPicker people={people} value={accountId} onChange={setAccountId} onNewPerson={onNewPerson} autoFocus />
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
            <NumberField data-entry-next="" kind="decimal" value={scale} onChange={setScale} placeholder="۷۰/۵۳" />
          </div>
          <div>
            <Label>عیار</Label>
            <NumberField kind="decimal" value={ayar} onChange={setAyar} />
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
            <NumberField data-entry-next="" kind="decimal" value={sellScale} onChange={setSellScale} />
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
            <NumberField kind="money" value={total} onChange={setTotal} />
          </div>
        ) : (
          <div>
            <Label>مظنه (ریال)</Label>
            <NumberField kind="money" value={mazane} onChange={setMazane} />
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
      <SaveButton disabled={post.pending} variant={side === "SELL" ? "danger" : "default"}>{post.pending ? "در حال ثبت…" : side === "BUY" ? "ثبت خرید" : "ثبت فروش"}</SaveButton>
    </EntryForm>
  );
}

function Melt({ data }: { data: DeskData }) {
  const focus = usePulse();
  const [meltAccountId, setMeltAccountId] = useState(data.expenseAccounts[0]?.id ?? "");
  const [picked, setPicked] = useState<Record<string, { on: boolean; scale: string }>>(() =>
    Object.fromEntries(data.pieces.map((piece) => [piece.id, { on: false, scale: piece.scale }])),
  );
  const [backScale, setBackScale] = useState("");
  const [backAyar, setBackAyar] = useState(trimDecimal(data.standardAyar));
  const [conditional, setConditional] = useState(false);
  const [ang, setAng] = useState("");
  const [note, setNote] = useState("");
  useFormMemory("sanad-melt", { meltAccountId }, (saved) => {
    if (saved.meltAccountId && data.expenseAccounts.some((account) => account.id === saved.meltAccountId)) setMeltAccountId(saved.meltAccountId);
  });
  const post = usePost(() => {
    setPicked((prev) => Object.fromEntries(data.pieces.map((piece) => [piece.id, { on: false, scale: prev[piece.id]?.scale ?? piece.scale }])));
    setBackScale("");
    setConditional(false);
    setAng("");
    setNote("");
    focus.focusNext();
  });
  return (
    <EntryForm
      className="grid gap-4"
      pending={post.pending}
      dirty={Boolean(backScale.trim() || ang.trim() || note.trim() || data.pieces.some((piece) => picked[piece.id]?.on))}
      focusNonce={focus.pulse}
      focusTarget={focus.focusAt}
      onClear={() => {
        setPicked(Object.fromEntries(data.pieces.map((piece) => [piece.id, { on: false, scale: piece.scale }])));
        setBackScale("");
        setConditional(false);
        setAng("");
        setNote("");
        focus.focusStart();
      }}
      onSubmit={() => {
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
        <Select data-autofocus="" value={meltAccountId} onChange={(event) => setMeltAccountId(event.target.value)}>
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
              className="size-5"
              checked={picked[piece.id]?.on ?? false}
              onChange={(event) => setPicked((prev) => ({ ...prev, [piece.id]: { ...prev[piece.id], on: event.target.checked } }))}
            />
            <span className="flex-1">{piece.codeLabel} {piece.kindLabel} {formatWeight(piece.scale)}</span>
            <NumberField
              className="w-28"
              kind="decimal"
              value={picked[piece.id]?.scale ?? ""}
              onChange={(scale) => setPicked((prev) => ({ ...prev, [piece.id]: { ...prev[piece.id], scale } }))}
            />
          </label>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>وزن آبشدهٔ برگشتی</Label>
          <NumberField data-entry-next="" kind="decimal" value={backScale} onChange={setBackScale} />
        </div>
        <div>
          <Label>عیار برگشتی</Label>
          <NumberField kind="decimal" disabled={conditional} value={conditional ? trimDecimal(data.standardAyar) : backAyar} onChange={setBackAyar} />
        </div>
        <label className="mt-7 flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-5" checked={conditional} onChange={(event) => setConditional(event.target.checked)} />
          برگشتی شرطی است
        </label>
      </div>
      <div>
        <Label>انگ شمش</Label>
        <Input value={ang} onChange={(event) => setAng(event.target.value)} />
      </div>
      <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="شرح ذوب" />
      <ErrorText error={post.error} />
      <SaveButton disabled={post.pending}>{post.pending ? "در حال ثبت…" : "ثبت ذوب"}</SaveButton>
    </EntryForm>
  );
}

function CoinForm({ data, people, insertedId, onNewPerson }: { data: DeskData } & PartyProps) {
  const focus = usePulse();
  const [op, setOp] = useState<"BUY" | "SELL" | "RECEIVE" | "PAY">("BUY");
  const [accountId, setAccountId] = useState("");
  const [coinTypeId, setCoinTypeId] = useState(data.coins[0]?.id ?? "");
  const coin = data.coins.find((item) => item.id === coinTypeId);
  const [count, setCount] = useState("1");
  const [unitPrice, setUnitPrice] = useState(data.coins[0]?.buy ?? "");
  const [date, setDate] = useState(data.today);
  const [settle, setSettle] = useState<SettleValue>(() => emptySettle(data));
  const [note, setNote] = useState("");
  useInsertedPerson(insertedId, setAccountId);
  useFormMemory("sanad-coin", { op, coinTypeId }, (saved) => {
    const nextOp = saved.op === "BUY" || saved.op === "SELL" || saved.op === "RECEIVE" || saved.op === "PAY" ? saved.op : "BUY";
    if (saved.op) setOp(nextOp);
    const id = saved.coinTypeId && data.coins.some((item) => item.id === saved.coinTypeId) ? saved.coinTypeId : data.coins[0]?.id;
    if (!id) return;
    setCoinTypeId(id);
    const next = data.coins.find((item) => item.id === id);
    if (!next) return;
    setUnitPrice(nextOp === "SELL" ? next.sell : nextOp === "BUY" ? next.buy : "");
  });
  const post = usePost(() => {
    setCount("1");
    setNote("");
    setSettle((value) => clearSettleAmounts(value));
    focus.focusNext();
  });
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
    <EntryForm
      className="grid gap-4"
      pending={post.pending}
      dirty={Boolean(accountId || note.trim() || count.trim() !== "1" || date !== data.today || settleDirty(settle))}
      focusNonce={focus.pulse}
      focusTarget={focus.focusAt}
      onNewPerson={onNewPerson}
      onClear={() => {
        setAccountId("");
        setCount("1");
        setNote("");
        setDate(data.today);
        setSettle(emptySettle(data));
        focus.focusStart();
      }}
      onSubmit={() => {
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
            className={`min-h-11 rounded-full px-3 py-1 text-sm md:min-h-0 ${op === item ? "bg-[#16211e] text-white" : "bg-[#faf6ee]"}`}
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
        <PersonPicker people={people} value={accountId} onChange={setAccountId} onNewPerson={onNewPerson} autoFocus />
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
          <NumberField data-entry-next="" kind="int" value={count} onChange={setCount} />
        </div>
        <div>
          <Label>{op === "RECEIVE" || op === "PAY" ? "اجرت هر عدد (ریال)" : "فی هر عدد (ریال)"}</Label>
          <NumberField kind="money" value={unitPrice} onChange={setUnitPrice} />
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
      <SaveButton disabled={post.pending}>{post.pending ? "در حال ثبت…" : "ثبت سند سکه"}</SaveButton>
    </EntryForm>
  );
}

function CashForm({ data, people, insertedId, onNewPerson }: { data: DeskData } & PartyProps) {
  const focus = usePulse();
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [via, setVia] = useState<"cash" | "bank">("cash");
  const [bankId, setBankId] = useState(data.banks[0]?.id ?? "");
  const [note, setNote] = useState("");
  useInsertedPerson(insertedId, setAccountId);
  useFormMemory("sanad-cash", { direction, via, bankId }, (saved) => {
    if (saved.direction === "IN" || saved.direction === "OUT") setDirection(saved.direction);
    if (saved.via === "cash" || saved.via === "bank") setVia(saved.via);
    if (saved.bankId && data.banks.some((bank) => bank.id === saved.bankId)) setBankId(saved.bankId);
  });
  const post = usePost(() => {
    setAmount("");
    setNote("");
    focus.focusNext();
  });
  return (
    <EntryForm
      className="grid gap-4"
      pending={post.pending}
      dirty={Boolean(accountId || amount.trim() || note.trim())}
      focusNonce={focus.pulse}
      focusTarget={focus.focusAt}
      onNewPerson={onNewPerson}
      onClear={() => {
        setAccountId("");
        setAmount("");
        setNote("");
        focus.focusStart();
      }}
      onSubmit={() => {
        post.run(() => cashAction({ date: data.today, accountId, direction, amount, via, bankAccountId: bankId, note }));
      }}
    >
      <p className="text-sm text-[#4d6278]">برای وجهِ چندبخشی و حوالهٔ صندوق به بانک، صفحهٔ صندوق را باز کنید.</p>
      <div className="flex gap-2">
        <button type="button" className={`min-h-11 px-3 py-2 text-sm md:min-h-0 ${direction === "IN" ? "bg-[#1a56a8] text-white" : "border border-[#8eadd4] bg-white"}`} onClick={() => setDirection("IN")}>دریافت</button>
        <button type="button" className={`min-h-11 px-3 py-2 text-sm md:min-h-0 ${direction === "OUT" ? "bg-[#a32020] text-white" : "border border-[#8eadd4] bg-white"}`} onClick={() => setDirection("OUT")}>پرداخت</button>
      </div>
      <PersonPicker label="حساب شخص" people={people} value={accountId} onChange={setAccountId} onNewPerson={onNewPerson} autoFocus />
      <div>
        <Label>مبلغ (ریال)</Label>
        <NumberField data-entry-next="" kind="money" value={amount} onChange={setAmount} placeholder="۲۰٬۰۰۰٬۰۰۰" />
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
      <SaveButton disabled={post.pending}>{post.pending ? "در حال ثبت…" : "ثبت وجه"}</SaveButton>
    </EntryForm>
  );
}

function SendForm({ data, people, insertedId, onNewPerson }: { data: DeskData } & PartyProps) {
  const focus = usePulse();
  const [accountId, setAccountId] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("30");
  const [picked, setPicked] = useState<string[]>([]);
  useInsertedPerson(insertedId, setAccountId);
  useFormMemory("sanad-send", { max }, (saved) => {
    if (saved.max) setMax(saved.max);
  });
  const post = usePost(() => {
    setPicked([]);
    focus.focusNext();
  });
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
    <EntryForm
      className="grid gap-4"
      pending={post.pending}
      dirty={Boolean(accountId || picked.length || min.trim())}
      focusNonce={focus.pulse}
      focusTarget={focus.focusAt}
      onNewPerson={onNewPerson}
      onClear={() => {
        setAccountId("");
        setPicked([]);
        setMin("");
        focus.focusStart();
      }}
      onSubmit={() => {
        post.run(() => sendPiecesAction({ date: data.today, accountId, itemIds: picked }));
      }}
    >
      <p className="text-sm text-[#6d6458]">تکه‌های ریز موجود را یکجا به حسابی مثل ذوب می‌فرستد. وزن کامل مانده خارج می‌شود.</p>
      <PersonPicker label="حساب مقصد" people={people} value={accountId} onChange={setAccountId} onNewPerson={onNewPerson} autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>از وزن</Label>
          <NumberField data-entry-next="" kind="decimal" value={min} onChange={setMin} />
        </div>
        <div>
          <Label>تا وزن</Label>
          <NumberField kind="decimal" value={max} onChange={setMax} />
        </div>
      </div>
      <div className="max-h-56 space-y-2 overflow-auto">
        {filtered.length === 0 ? <p className="text-sm text-[#6d6458]">در این بازه تکه‌ای نیست.</p> : null}
        {filtered.map((piece) => (
          <label key={piece.id} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={picked.includes(piece.id)}
              onChange={(event) => setPicked((prev) => event.target.checked ? [...prev, piece.id] : prev.filter((id) => id !== piece.id))}
            />
            {piece.codeLabel} {piece.kindLabel} {formatWeight(piece.scale)} گرم
          </label>
        ))}
      </div>
      <ErrorText error={post.error} />
      <SaveButton disabled={post.pending}>{post.pending ? "در حال ثبت…" : "ارسال انتخاب‌شده‌ها"}</SaveButton>
    </EntryForm>
  );
}
