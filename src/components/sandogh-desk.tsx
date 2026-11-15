"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EntryForm, SaveButton, toastSaved } from "@/components/entry/form";
import { useFormMemory } from "@/components/entry/memory";
import { NewPersonDialog } from "@/components/entry/new-person";
import { NumberField } from "@/components/entry/number-field";
import { PersonPicker } from "@/components/entry/person-picker";
import { useInsertedPerson } from "@/components/entry/use-inserted";
import { Label, Select, Textarea } from "@/components/ui/input";
import type { AccountOption } from "@/lib/dto";
import { fundsAction, transferAction } from "@/server/actions";

type Person = { id: string; title: string; code: number; groupLabel?: string };
type Box = { id: string; title: string; group: string };

export function SandoghDesk({
  today,
  people,
  boxes,
  initialAccountId,
}: {
  today: string;
  people: Person[];
  boxes: Box[];
  initialAccountId?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"IN" | "OUT" | "MOVE">("IN");
  const [date, setDate] = useState(today);
  const [accountId, setAccountId] = useState(initialAccountId ?? "");
  const [cash, setCash] = useState("");
  const [bankId, setBankId] = useState(boxes.find((box) => box.group === "BANK")?.id ?? "");
  const [bankAmount, setBankAmount] = useState("");
  const [fromId, setFromId] = useState(boxes.find((box) => box.group === "CASH")?.id ?? boxes[0]?.id ?? "");
  const [toId, setToId] = useState(boxes.find((box) => box.group === "BANK")?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [pulse, setPulse] = useState(0);
  const [focusAt, setFocusAt] = useState<"start" | "next">("start");
  const [extra, setExtra] = useState<AccountOption[]>([]);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const banks = boxes.filter((box) => box.group === "BANK");
  const party = useMemo(() => {
    const map = new Map(people.map((person) => [person.id, person]));
    for (const person of extra) {
      if (!map.has(person.id)) map.set(person.id, { id: person.id, title: person.title, code: person.code, groupLabel: person.groupLabel });
    }
    return [...map.values()].sort((a, b) => a.code - b.code);
  }, [people, extra]);
  useInsertedPerson(insertedId, setAccountId);
  useFormMemory("sandogh", { mode, bankId, fromId, toId }, (saved) => {
    if (!initialAccountId && (saved.mode === "IN" || saved.mode === "OUT" || saved.mode === "MOVE")) setMode(saved.mode);
    if (saved.bankId && banks.some((bank) => bank.id === saved.bankId)) setBankId(saved.bankId);
    if (saved.fromId && boxes.some((box) => box.id === saved.fromId)) setFromId(saved.fromId);
    if (saved.toId && boxes.some((box) => box.id === saved.toId)) setToId(saved.toId);
  });

  function ready(next: "start" | "next") {
    setFocusAt(next);
    setPulse((n) => n + 1);
  }

  function submit() {
    setError(null);
    start(async () => {
      const result =
        mode === "MOVE"
          ? await transferAction({ date, fromAccountId: fromId, toAccountId: toId, amount, note })
          : await fundsAction({
              date,
              accountId,
              direction: mode,
              note,
              legs: [
                { via: "cash", amount: cash },
                { via: "bank", amount: bankAmount, bankAccountId: bankId },
              ],
            });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toastSaved(result.number, () => router.push(`/documents/${result.id}`));
      setCash("");
      setBankAmount("");
      setAmount("");
      setNote("");
      ready("next");
      router.refresh();
    });
  }

  const dirty = Boolean(accountId || cash.trim() || bankAmount.trim() || amount.trim() || note.trim() || date !== today);

  return (
    <>
      <EntryForm
        onSubmit={submit}
        pending={pending}
        dirty={dirty}
        focusNonce={pulse}
        focusTarget={focusAt}
        onNewPerson={() => setOpenNew(true)}
        onClear={() => {
          setAccountId(initialAccountId ?? "");
          setCash("");
          setBankAmount("");
          setAmount("");
          setNote("");
          setDate(today);
          ready("start");
        }}
        className="z-window"
      >
        <div className={mode === "OUT" ? "z-cap pay" : "z-cap"}>{mode === "MOVE" ? "حواله بین صندوق و بانک" : mode === "IN" ? "دریافت وجه" : "پرداخت وجه"}</div>
        <div className="grid gap-3 p-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["IN", "دریافت"],
                ["OUT", "پرداخت"],
                ["MOVE", "حواله"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`min-h-11 px-3 py-2 text-sm md:min-h-0 ${mode === id ? (id === "OUT" ? "bg-[#a32020] text-white" : "bg-[#1a56a8] text-white") : "border border-[#8eadd4] bg-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>تاریخ</Label>
              <input className="field" value={date} onChange={(event) => setDate(event.target.value)} placeholder={today} />
            </div>
            {mode === "MOVE" ? (
              <>
                <div>
                  <Label>مبلغ (ریال)</Label>
                  <NumberField data-autofocus="" data-entry-next="" kind="money" value={amount} onChange={setAmount} />
                </div>
                <div>
                  <Label>از</Label>
                  <Select value={fromId} onChange={(event) => setFromId(event.target.value)}>
                    {boxes.map((box) => (
                      <option key={box.id} value={box.id}>{box.title}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>به</Label>
                  <Select value={toId} onChange={(event) => setToId(event.target.value)}>
                    {boxes.map((box) => (
                      <option key={box.id} value={box.id}>{box.title}</option>
                    ))}
                  </Select>
                </div>
              </>
            ) : (
              <>
                <PersonPicker people={party} value={accountId} onChange={setAccountId} onNewPerson={() => setOpenNew(true)} autoFocus label="حساب شخص" />
                <div>
                  <Label>نقد صندوق (ریال)</Label>
                  <NumberField data-entry-next="" kind="money" value={cash} onChange={setCash} />
                </div>
                <div>
                  <Label>بانک</Label>
                  <Select value={bankId} onChange={(event) => setBankId(event.target.value)}>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>{bank.title}</option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>مبلغ بانک (ریال) — اگر خالی باشد فقط صندوق ثبت می‌شود</Label>
                  <NumberField kind="money" value={bankAmount} onChange={setBankAmount} />
                </div>
              </>
            )}
          </div>
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="شرح" />
          {error ? <p className="bg-[#fde8e8] px-3 py-2 text-sm text-[#a32020]">{error}</p> : null}
          <SaveButton disabled={pending} variant={mode === "OUT" ? "danger" : "default"} className="md:w-fit">
            {pending ? "در حال ثبت…" : "ثبت سند"}
          </SaveButton>
        </div>
      </EntryForm>
      <NewPersonDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onCreated={(person) => {
          setExtra((prev) => (prev.some((item) => item.id === person.id) ? prev : [...prev, person]));
          setInsertedId(person.id);
          setMode("IN");
          setOpenNew(false);
        }}
      />
    </>
  );
}
