"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { InvoiceShare } from "@/components/invoice-share";
import { isTypingTarget } from "@/lib/commands";
import { PAPER_OPTIONS, type InvoicePaper, type InvoiceShare as SharePayload } from "@/lib/invoice";

export function InvoiceDesk({
  id,
  initialPaper,
  autoPrintStamp,
  share,
  children,
}: {
  id: string;
  initialPaper: InvoicePaper;
  autoPrintStamp: string | null;
  share: SharePayload;
  children: React.ReactNode;
}) {
  const [paper, setPaper] = useState<InvoicePaper>(initialPaper);
  const printed = useRef(false);

  useEffect(() => {
    document.body.dataset.paper = paper;
    return () => {
      delete document.body.dataset.paper;
    };
  }, [paper]);

  useEffect(() => {
    if (!autoPrintStamp || printed.current) return;
    const key = `invoice-print:${id}:${autoPrintStamp}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    printed.current = true;
    const run = () => window.print();
    const ready = document.fonts?.ready ?? Promise.resolve();
    void ready.then(() => {
      requestAnimationFrame(() => requestAnimationFrame(run));
    });
  }, [autoPrintStamp, id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.repeat) return;
      if (document.querySelector("[data-hotkey-layer], [role='dialog']")) return;
      if (isTypingTarget(event.target)) return;
      const ctrl = event.ctrlKey || event.metaKey;
      const printKey = event.key === "F6" || (ctrl && event.key.toLowerCase() === "p" && !event.altKey && !event.shiftKey);
      if (!printKey) return;
      event.preventDefault();
      event.stopPropagation();
      window.print();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div className="space-y-3">
      <div className="no-print space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/documents/${id}`} className="inline-flex min-h-12 items-center border border-[#8eadd4] bg-white px-4 text-sm md:min-h-10">
            بازگشت به سند
          </Link>
          <button type="button" className="inline-flex min-h-12 items-center bg-[#1a56a8] px-4 text-sm text-white md:min-h-10" onClick={() => window.print()}>
            چاپ
            <kbd className="ms-2 hidden rounded border border-white/30 px-1 text-[10px] md:inline">F6</kbd>
          </button>
          <div className="flex flex-wrap gap-1" role="group" aria-label="اندازه کاغذ">
            {PAPER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={paper === option.id}
                className={`min-h-12 px-3 text-sm md:min-h-10 ${paper === option.id ? "bg-[#0e3f86] text-white" : "border border-[#8eadd4] bg-white"}`}
                onClick={() => setPaper(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <InvoiceShare share={share} id={id} />
        <p className="hidden text-xs text-[#4d6278] md:block">F6 یا Ctrl+P همین فاکتور را چاپ می‌کند. اندازهٔ کاغذ فقط همین نمایش را عوض می‌کند.</p>
      </div>
      <div className="invoice-frame" data-paper={paper}>
        {children}
      </div>
    </div>
  );
}
