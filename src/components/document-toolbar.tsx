"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InvoiceShare } from "@/components/invoice-share";
import { isTypingTarget } from "@/lib/commands";
import type { InvoiceShare as SharePayload } from "@/lib/invoice";

export function DocumentToolbar({ id, share, children }: { id: string; share: SharePayload; children?: React.ReactNode }) {
  const router = useRouter();

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
      router.push(`/documents/${id}/print?print=${Date.now()}`);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [id, router]);

  return (
    <div className="no-print space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/documents/${id}/print`}
          onClick={(event) => {
            event.preventDefault();
            router.push(`/documents/${id}/print?print=${Date.now()}`);
          }}
          className="inline-flex min-h-12 items-center gap-2 bg-[#1a56a8] px-4 text-sm text-white md:min-h-10"
        >
          چاپ فاکتور
          <kbd className="hidden rounded border border-white/30 px-1 text-[10px] md:inline">F6</kbd>
        </Link>
        {children}
      </div>
      <InvoiceShare share={share} id={id} />
    </div>
  );
}
