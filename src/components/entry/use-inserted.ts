"use client";

import { useEffect, useRef } from "react";
import { focusMarked } from "@/lib/focus-order";

export function useInsertedPerson(insertedId: string | null | undefined, setAccountId: (id: string) => void) {
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (!insertedId || seen.current === insertedId) return;
    seen.current = insertedId;
    setAccountId(insertedId);
    const timer = window.setTimeout(() => focusMarked(document, "[data-entry-next]"), 30);
    return () => window.clearTimeout(timer);
  }, [insertedId, setAccountId]);
}
