"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { PaletteSection } from "@/components/palette-model";

export function CommandPalette({
  open,
  query,
  onQuery,
  sections,
  activeKey,
  onHover,
  onOpen,
  onSecondary,
  onClose,
  loading,
  failed,
  docsLoading,
}: {
  open: boolean;
  query: string;
  onQuery: (value: string) => void;
  sections: PaletteSection[];
  activeKey: string | null;
  onHover: (key: string) => void;
  onOpen: (key: string) => void;
  onSecondary: (key: string) => void;
  onClose: () => void;
  loading: boolean;
  failed: boolean;
  docsLoading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hoverArmed = useRef(false);
  const listId = "desk-search-list";

  useEffect(() => {
    if (!open) return;
    hoverArmed.current = false;
    inputRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !activeKey) return;
    document.getElementById(`hit-${activeKey}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeKey]);

  if (!open || typeof document === "undefined") return null;
  const empty = sections.every((section) => section.rows.length === 0);

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-[#0e3f86]/45" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="جستجو"
        data-hotkey-layer=""
        className="flex h-full w-full flex-col bg-white md:mx-auto md:mt-[10vh] md:h-auto md:max-h-[min(36rem,78vh)] md:w-[min(36rem,calc(100%-2rem))] md:border md:border-[#8eadd4] md:shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
        onMouseMove={() => {
          hoverArmed.current = true;
        }}
      >
        <div className="z-cap flex items-center justify-between gap-2">
          <span>جستجو</span>
          <button type="button" className="min-h-11 px-3 text-sm" onClick={onClose}>
            بستن
          </button>
        </div>
        <div className="border-b border-[#d3e2f4] p-3">
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeKey ? `hit-${activeKey}` : undefined}
            className="field text-base"
            placeholder="نام، کد، تلفن، شماره سند یا صفحه"
            value={query}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => onQuery(event.target.value)}
          />
        </div>
        <div id={listId} role="listbox" className="min-h-0 flex-1 overflow-y-auto">
          {failed ? <p className="px-3 py-3 text-sm text-[#a32020]">فهرست اشخاص الان در دسترس نیست. صفحه‌ها هنوز باز می‌شوند.</p> : null}
          {loading && empty ? <p className="px-3 py-4 text-sm text-[#4d6278]">در حال آماده‌کردن فهرست…</p> : null}
          {!loading && !failed && empty ? <p className="px-3 py-4 text-sm text-[#4d6278]">چیزی با این عبارت پیدا نشد.</p> : null}
          {sections.map((section) =>
            section.rows.length === 0 ? null : (
              <div key={section.label} role="group" aria-label={section.label}>
                <div className="bg-[#f3f8fd] px-3 py-1 text-xs text-[#4d6278]">{section.label}</div>
                {section.rows.map((row) => {
                  const on = row.key === activeKey;
                  return (
                    <div
                      key={row.key}
                      id={`hit-${row.key}`}
                      role="option"
                      aria-selected={on}
                      className={`flex min-h-12 cursor-pointer items-center gap-2 px-3 ${on ? "bg-[#fff4c2]" : ""}`}
                      onMouseEnter={() => {
                        if (hoverArmed.current) onHover(row.key);
                      }}
                      onClick={() => onOpen(row.key)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{row.title}</div>
                        {row.hint ? <div className="truncate text-xs text-[#4d6278]">{row.hint}</div> : null}
                      </div>
                      {row.kbd ? (
                        <kbd dir="ltr" className="hidden shrink-0 rounded border border-[#8eadd4] bg-[#f3f8fd] px-1.5 text-[11px] text-[#0e3f86] md:inline">
                          {row.kbd}
                        </kbd>
                      ) : null}
                      {row.sanadHref ? (
                        <button
                          type="button"
                          className="min-h-11 shrink-0 border border-[#8eadd4] bg-white px-3 text-xs text-[#0e3f86]"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSecondary(row.key);
                          }}
                        >
                          سند
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ),
          )}
          {docsLoading ? <p className="px-3 py-2 text-xs text-[#4d6278]">در حال پیدا کردن سند…</p> : null}
        </div>
        <div className="hidden border-t border-[#d3e2f4] px-3 py-2 text-xs text-[#4d6278] md:block">
          فلش بالا و پایین حرکت می‌کند. Enter باز می‌کند. Ctrl+Enter برای همین شخص سند تازه می‌سازد. Esc می‌بندد.
        </div>
      </div>
    </div>,
    document.body,
  );
}
