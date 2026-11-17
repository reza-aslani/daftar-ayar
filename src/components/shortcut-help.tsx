"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { shortcutHelp } from "@/lib/commands";

export function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-[#0e3f86]/45" onMouseDown={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="میانبرهای صفحه‌کلید"
        data-hotkey-layer=""
        className="flex h-full w-full flex-col bg-white outline-none md:mx-auto md:mt-[8vh] md:h-auto md:max-h-[min(40rem,84vh)] md:w-[min(34rem,calc(100%-2rem))] md:border md:border-[#8eadd4] md:shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="z-cap flex items-center justify-between gap-2">
          <span>میانبرهای صفحه‌کلید</span>
          <button type="button" className="min-h-11 px-3 text-sm" onClick={onClose}>
            بستن
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="px-3 py-3 text-sm leading-6 text-[#4d6278]">
            کلیدهای F دفتر، حتی وسط تایپ، کار می‌کنند. Ctrl+K هم همین‌طور. F6 و Ctrl+P فقط چاپ فاکتور روی صفحهٔ سند هستند و وسط فرم ثبت خاموش‌اند. بقیهٔ میانبرها، از جمله ? و Alt+U، هنگام تایپ در فیلد خاموش‌اند تا ثبت سند به‌هم نریزد.
          </p>
          {shortcutHelp.map((group) => (
            <section key={group.group}>
              <h2 className="bg-[#f3f8fd] px-3 py-1 text-sm font-semibold text-[#0e3f86]">{group.group}</h2>
              <ul>
                {group.rows.map((row) => (
                  <li key={row.keys} className="flex min-h-12 items-center justify-between gap-3 border-b border-[#d3e2f4] px-3">
                    <span className="text-sm">{row.label}</span>
                    <kbd dir="ltr" className="shrink-0 rounded border border-[#8eadd4] bg-[#f3f8fd] px-1.5 py-0.5 text-xs text-[#0e3f86]">{row.keys}</kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
