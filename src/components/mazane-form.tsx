"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mazaneAction } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export function MazaneForm({ today }: { today: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"mesghal" | "gram">("mesghal");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="panel grid gap-3 p-4 md:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        start(async () => {
          const result = await mazaneAction({
            date: String(form.get("date") ?? today),
            mode,
            amount: String(form.get("amount") ?? ""),
            note: String(form.get("note") ?? ""),
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <div>
        <Label>تاریخ</Label>
        <Input name="date" defaultValue={today} />
      </div>
      <div>
        <Label>نوع</Label>
        <Select value={mode} onChange={(event) => setMode(event.target.value as "mesghal" | "gram")}>
          <option value="mesghal">مثقال ۷۰۵</option>
          <option value="gram">گرم ۷۵۰</option>
        </Select>
      </div>
      <div>
        <Label>مبلغ ریال</Label>
        <Input name="amount" required placeholder="485000000" />
      </div>
      <div>
        <Label>شرح</Label>
        <Input name="note" placeholder="مظنه صبح" />
      </div>
      {error ? <p className="text-sm text-[#9d243c] md:col-span-4">{error}</p> : null}
      <Button disabled={pending} className="md:col-span-4 md:w-fit">{pending ? "در حال ثبت…" : "ثبت مظنه"}</Button>
    </form>
  );
}
