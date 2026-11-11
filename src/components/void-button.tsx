"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voidAction } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";

export function VoidButton({ id }: { id: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="danger" size="sm">ابطال سند</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>ابطال سند</DialogTitle>
        <p className="mt-2 text-sm text-[#6d6458]">سند پاک نمی‌شود. اثرش از مانده‌ها برداشته می‌شود، به شرطی که بعد از آن روی همان قطعه سندی نباشد.</p>
        <Textarea className="mt-3" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="دلیل ابطال" />
        {error ? <p className="mt-2 text-sm text-[#9d243c]">{error}</p> : null}
        <Button
          className="mt-3"
          variant="danger"
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const result = await voidAction(id, reason);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
        >
          {pending ? "در حال ابطال…" : "تأیید ابطال"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
