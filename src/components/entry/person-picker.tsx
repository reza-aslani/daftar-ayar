"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toFaDigits } from "@/lib/format";
import { focusMarked, moveFocus } from "@/lib/focus-order";
import { filterPeople } from "@/lib/person-match";

export type PickerPerson = { id: string; code: number; title: string; groupLabel?: string };

export function PersonPicker({
  people,
  value,
  onChange,
  onNewPerson,
  autoFocus = false,
  label = "حساب",
}: {
  people: PickerPerson[];
  value: string;
  onChange: (id: string) => void;
  onNewPerson?: () => void;
  autoFocus?: boolean;
  label?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const selected = people.find((person) => person.id === value) ?? null;
  const matches = useMemo(() => filterPeople(people, editing ? query : ""), [people, editing, query]);
  const shown = matches.slice(0, 80);
  const active = shown[Math.min(Math.max(hi, 0), Math.max(shown.length - 1, 0))];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (inputRef.current?.parentElement?.contains(target)) return;
      setOpen(false);
      setEditing(false);
      setBrowsing(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${active?.id ?? ""}`)?.scrollIntoView({ block: "nearest" });
  }, [active?.id, listId, open]);

  function jumpNext() {
    const form = inputRef.current?.closest("form");
    if (!form || !inputRef.current) return;
    if (!focusMarked(form, "[data-entry-next]")) moveFocus(form, inputRef.current, 1);
  }

  function choose(person: PickerPerson) {
    onChange(person.id);
    setOpen(false);
    setEditing(false);
    setBrowsing(false);
    setQuery("");
    requestAnimationFrame(jumpNext);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
      setBrowsing(true);
      const max = Math.max(shown.length - 1, 0);
      setHi((index) => {
        const start = index < 0 ? (event.key === "ArrowDown" ? -1 : 1) : index;
        if (event.key === "ArrowDown") return Math.min(max, start + 1);
        return Math.max(0, start - 1);
      });
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      if ((editing || browsing) && active) {
        choose(active);
        return;
      }
      jumpNext();
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setEditing(false);
      setBrowsing(false);
      setQuery("");
    }
  }

  const text = editing ? query : selected ? `${toFaDigits(selected.code)} — ${selected.title}` : "";

  return (
    <div className="relative" data-person-open={open ? "" : undefined}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-sm text-[#5c5346]" htmlFor={`${listId}-input`}>
          {label}
        </label>
        {onNewPerson ? (
          <button type="button" className="min-h-11 text-xs text-[#0b4ea2] md:min-h-0" onClick={onNewPerson}>
            شخص جدید
            <kbd className="ms-1 hidden rounded border border-[#8eadd4] bg-[#f3f8fd] px-1 text-[10px] md:inline">Ctrl+Insert</kbd>
          </button>
        ) : null}
      </div>
      <input
        id={`${listId}-input`}
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active ? `${listId}-${active.id}` : undefined}
        className="field"
        value={text}
        placeholder="کد یا بخشی از نام"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-autofocus={autoFocus ? "" : undefined}
        onFocus={() => {
          setOpen(true);
          setEditing(false);
          setBrowsing(false);
          const index = people.findIndex((person) => person.id === value);
          setHi(index);
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setEditing(true);
          setBrowsing(true);
          setOpen(true);
          setHi(0);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          window.setTimeout(() => {
            if (inputRef.current && document.activeElement === inputRef.current) return;
            setOpen(false);
            setEditing(false);
            setBrowsing(false);
          }, 120);
        }}
      />
      {open ? (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto border border-[#8eadd4] bg-white shadow-md">
          {shown.length === 0 ? <li className="px-3 py-3 text-sm text-[#4d6278]">حسابی پیدا نشد. با Ctrl+Insert بسازید.</li> : null}
          {shown.map((person, index) => (
            <li
              key={person.id}
              id={`${listId}-${person.id}`}
              role="option"
              aria-selected={index === hi}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 text-sm ${index === hi ? "bg-[#fff4c2]" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHi(index)}
              onClick={() => choose(person)}
            >
              <span>
                <span className="num text-[#0e3f86]">{toFaDigits(person.code)}</span>
                <span> — {person.title}</span>
              </span>
              {person.groupLabel ? <span className="text-xs text-[#4d6278]">{person.groupLabel}</span> : null}
            </li>
          ))}
          {matches.length > shown.length ? <li className="px-3 py-2 text-xs text-[#4d6278]">برای دیدن بقیه، دقیق‌تر بنویسید.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
