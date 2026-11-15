"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { toFaDigits } from "@/lib/format";
import { cycleFields, focusField, moveFocus } from "@/lib/focus-order";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function toastSaved(number: number | undefined, onOpen: () => void) {
  toast.success(number ? `سند ${toFaDigits(number)} ثبت شد` : "ثبت شد", {
    action: { label: "مشاهده", onClick: onOpen },
  });
}

type EntryFormProps = {
  className?: string;
  children: React.ReactNode;
  pending?: boolean;
  dirty?: boolean;
  focusNonce?: number;
  /** Bump after a successful save so a touched form is treated as clean. */
  cleanNonce?: number;
  focusTarget?: "start" | "next";
  autoFocus?: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClear?: () => void;
  onNewPerson?: () => void;
};

function keepsArrows(el: HTMLElement) {
  if (el.tagName === "SELECT" || el.tagName === "TEXTAREA") return true;
  return el.dataset.entryNum !== undefined;
}

export const EntryForm = forwardRef<HTMLFormElement, EntryFormProps>(function EntryForm(
  { className, children, pending, dirty, focusNonce = 0, cleanNonce = 0, focusTarget = "start", autoFocus = true, onSubmit, onClear, onNewPerson },
  ref,
) {
  const local = useRef<HTMLFormElement>(null);
  const pendingRef = useRef(pending);
  const newPersonRef = useRef(onNewPerson);
  pendingRef.current = pending;
  newPersonRef.current = onNewPerson;
  const [touched, setTouched] = useState(false);
  const [askClear, setAskClear] = useState(false);
  const isDirty = dirty ?? touched;

  function setNode(node: HTMLFormElement | null) {
    local.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  useEffect(() => {
    setTouched(false);
    setAskClear(false);
  }, [cleanNonce]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (document.querySelector("[data-hotkey-layer]")) return;
      const target = event.target;
      if (target instanceof Element && target.closest("form")) return;
      if (document.querySelector("[data-entry-dialog]") && !local.current?.hasAttribute("data-entry-dialog")) return;
      const ctrl = event.ctrlKey || event.metaKey;
      if (event.key === "F5" || (ctrl && event.key === "Enter")) {
        event.preventDefault();
        if (!pendingRef.current) local.current?.requestSubmit();
        return;
      }
      if (ctrl && event.key === "Insert" && newPersonRef.current) {
        event.preventDefault();
        newPersonRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!autoFocus) return;
    const form = local.current;
    if (!form) return;
    const selector = focusTarget === "next" ? "[data-entry-next]" : "[data-autofocus]";
    focusField(form.querySelector<HTMLElement>(selector) ?? cycleFields(form)[0] ?? null);
  }, [autoFocus, focusNonce, focusTarget]);

  function save() {
    if (pending) return;
    setAskClear(false);
    local.current?.requestSubmit();
  }

  function clear() {
    setAskClear(false);
    setTouched(false);
    onClear?.();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!event.currentTarget.contains(target)) return;
    const key = event.key;
    const ctrl = event.ctrlKey || event.metaKey;

    if (key === "F5" || (ctrl && key === "Enter")) {
      event.preventDefault();
      save();
      return;
    }
    if (ctrl && key === "Insert" && onNewPerson) {
      event.preventDefault();
      onNewPerson();
      return;
    }
    if (askClear) {
      if (key === "Escape") {
        event.preventDefault();
        setAskClear(false);
      } else if (key === "Enter") {
        event.preventDefault();
        clear();
      } else if (key.length === 1) setAskClear(false);
      return;
    }
    if (key === "Escape") {
      if (target.closest("[data-person-open]")) return;
      if (!onClear || !isDirty) return;
      event.preventDefault();
      setAskClear(true);
      return;
    }
    if (key === "Enter" && !ctrl && !event.altKey) {
      if (target.closest("[data-person-open]") || target.closest("[data-entry-submit]")) return;
      if (target.tagName === "BUTTON") return;
      event.preventDefault();
      moveFocus(event.currentTarget, target, event.shiftKey ? -1 : 1);
      return;
    }
    if ((key === "ArrowDown" || key === "ArrowUp") && !ctrl && !event.altKey && !event.shiftKey) {
      if (target.closest("[data-person-open]") || keepsArrows(target)) return;
      event.preventDefault();
      moveFocus(event.currentTarget, target, key === "ArrowDown" ? 1 : -1);
    }
  }

  return (
    <form
      ref={setNode}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        onSubmit(event);
      }}
      onKeyDown={onKeyDown}
      onInput={() => setTouched(true)}
    >
      {askClear ? (
        <div className="col-span-full flex flex-wrap items-center gap-2 bg-[#fff6eb] px-3 py-2 text-sm">
          <span>اطلاعات این فرم پاک شود؟</span>
          <button type="button" className="min-h-11 bg-[#a32020] px-3 text-white md:min-h-0 md:py-1.5" onClick={clear}>
            بله، پاک شود
          </button>
          <button type="button" className="min-h-11 border border-[#8eadd4] bg-white px-3 md:min-h-0 md:py-1.5" onClick={() => setAskClear(false)}>
            انصراف
          </button>
          <span className="hidden text-xs text-[#6d6458] md:inline">Enter تأیید · Esc انصراف</span>
        </div>
      ) : null}
      {children}
      <p className="col-span-full hidden text-xs text-[#5c6b7e] md:block">
        Enter بعدی · Shift+Enter قبلی · F5 یا Ctrl+Enter ثبت · Esc پاک کردن
        {onNewPerson ? " · Ctrl+Insert شخص جدید" : ""}
      </p>
    </form>
  );
});

export function SaveButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button type="submit" data-entry-submit="" className={cn("h-12 md:h-10", className)} {...props}>
      {children}
      <span className="hidden items-center gap-1 md:inline-flex" aria-hidden>
        <kbd className="rounded border border-white/40 bg-white/15 px-1 text-[10px] font-medium leading-4">F5</kbd>
      </span>
    </Button>
  );
}
