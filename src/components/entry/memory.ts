"use client";

import { useEffect, useRef, useState } from "react";
import { loadLast, saveLast } from "@/lib/last-used";

/** Restore a form's last choices after mount, then keep them in localStorage. */
export function useFormMemory(form: string, snapshot: Record<string, string>, apply: (saved: Record<string, string>) => void) {
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    applyRef.current(loadLast(form));
    setReady(true);
  }, [form]);
  const encoded = JSON.stringify(snapshot);
  useEffect(() => {
    if (!ready) return;
    saveLast(form, JSON.parse(encoded) as Record<string, string>);
  }, [encoded, form, ready]);
  return ready;
}
