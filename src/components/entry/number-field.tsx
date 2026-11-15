"use client";

import { useLayoutEffect, useRef } from "react";
import { editNumber, formatNumberInput, type NumberKind } from "@/lib/number-input";
import { cn } from "@/lib/utils";

export function NumberField({
  value,
  onChange,
  kind = "decimal",
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "inputMode"> & {
  value: string;
  onChange: (value: string) => void;
  kind?: NumberKind;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const shown = formatNumberInput(value, kind);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || caret.current == null) return;
    if (document.activeElement === el) {
      const pos = Math.min(caret.current, el.value.length);
      el.setSelectionRange(pos, pos);
    }
    caret.current = null;
  }, [shown]);

  return (
    <input
      {...props}
      ref={ref}
      value={shown}
      dir="ltr"
      inputMode={kind === "decimal" ? "decimal" : "numeric"}
      enterKeyHint="next"
      autoComplete="off"
      spellCheck={false}
      data-entry-num=""
      className={cn("field text-left tabular-nums", className)}
      onChange={(event) => {
        const el = event.target;
        const edited = editNumber(shownRef.current, el.value, el.selectionStart ?? el.value.length, kind);
        caret.current = edited.caret;
        if (edited.text === shown) {
          requestAnimationFrame(() => {
            if (document.activeElement === el) el.setSelectionRange(edited.caret, edited.caret);
          });
        }
        onChange(edited.text);
      }}
    />
  );
}
