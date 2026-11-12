"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fundsAction, transferAction } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

type Person = { id: string; title: string; code: number };
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
  const banks = boxes.filter((box) => box.group === "BANK");

  function submit(event: React.FormEvent) {
    event.preventDefault();
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
      toast.success("سند ثبت شد");
      router.push(`/documents/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="z-window">
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
              className={`px-3 py-2 text-sm ${mode === id ? (id === "OUT" ? "bg-[#a32020] text-white" : "bg-[#1a56a8] text-white") : "border border-[#8eadd4] bg-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>تاریخ</Label>
            <Input value={date} onChange={(event) => setDate(event.target.value)} placeholder={today} />
          </div>
          {mode === "MOVE" ? (
            <>
              <div>
                <Label>مبلغ (ریال)</Label>
                <Input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
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
              <div>
                <Label>حساب شخص</Label>
                <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                  <option value="">انتخاب</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>{person.code} — {person.title}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>نقد صندوق (ریال)</Label>
                <Input inputMode="numeric" value={cash} onChange={(event) => setCash(event.target.value)} />
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
                <Input inputMode="numeric" value={bankAmount} onChange={(event) => setBankAmount(event.target.value)} />
              </div>
            </>
          )}
        </div>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="شرح" />
        {error ? <p className="bg-[#fde8e8] px-3 py-2 text-sm text-[#a32020]">{error}</p> : null}
        <Button disabled={pending} variant={mode === "OUT" ? "danger" : "default"} className="md:w-fit">
          {pending ? "در حال ثبت…" : "ثبت سند"}
        </Button>
      </div>
    </form>
  );
}
