"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette } from "@/components/command-palette";
import { buildPaletteSections, flattenSections, type PaletteRow } from "@/components/palette-model";
import { ShortcutHelp } from "@/components/shortcut-help";
import { DESK_COMMANDS, WARM_HREFS, hrefForShortcut, isTypingTarget, resolveShortcut, type DeskRole, type ShortcutId } from "@/lib/commands";
import { readRecent, rememberPerson, type RecentPerson } from "@/lib/recent-people";
import { digitQuery } from "@/lib/search-query";
import { clearSearchCache, loadSearchPeople, searchDocuments, subscribeSearchPeople } from "@/lib/search-cache";
import type { SearchDocument, SearchPerson } from "@/lib/search-types";

export function DeskHotkeys({ role, children }: { role: DeskRole; children: (openSearch: () => void) => React.ReactNode }) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<SearchPerson[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [docs, setDocs] = useState<SearchDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [recent, setRecent] = useState<RecentPerson[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const flatRef = useRef<PaletteRow[]>([]);
  const activeRef = useRef<string | null>(null);

  const sections = useMemo(
    () => buildPaletteSections({ query, people, ready, recent, documents: docs, role }),
    [docs, people, query, ready, recent, role],
  );
  const flat = useMemo(() => flattenSections(sections), [sections]);
  const found = activeKey ? flat.findIndex((row) => row.key === activeKey) : 0;
  const hi = found < 0 ? 0 : found;
  const currentKey = flat[hi]?.key ?? null;
  flatRef.current = flat;
  activeRef.current = currentKey;

  useEffect(() => {
    let alive = true;
    const unsubscribe = subscribeSearchPeople((list) => {
      if (!alive) return;
      setPeople(list);
      setReady(true);
      setFailed(false);
    });
    void loadSearchPeople().catch(() => {
      if (alive) setFailed(true);
    });
    for (const href of WARM_HREFS) router.prefetch(href);
    return () => {
      alive = false;
      unsubscribe();
      clearSearchCache();
    };
  }, [router]);

  useEffect(() => {
    if (!paletteOpen) return;
    const row = flat[hi];
    if (!row) return;
    router.prefetch(row.href);
    if (row.sanadHref) router.prefetch(row.sanadHref);
  }, [flat, hi, paletteOpen, router]);

  useEffect(() => {
    if (!paletteOpen) return;
    if (!digitQuery(query)) {
      setDocs([]);
      setDocsLoading(false);
      return;
    }
    const controller = new AbortController();
    setDocs([]);
    setDocsLoading(true);
    const timer = window.setTimeout(() => {
      searchDocuments(query, controller.signal)
        .then((list) => {
          setDocs(list);
          setDocsLoading(false);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setDocsLoading(false);
        });
    }, 80);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [paletteOpen, query]);

  const showSearch = useCallback(() => {
    setHelpOpen(false);
    setQuery("");
    setDocs([]);
    setDocsLoading(false);
    setActiveKey(null);
    setRecent(readRecent());
    setPaletteOpen(true);
  }, []);

  useEffect(() => {
    function go(href: string, person?: RecentPerson) {
      if (person) rememberPerson(person);
      setPaletteOpen(false);
      setHelpOpen(false);
      router.push(href);
    }

    function move(delta: number) {
      const rows = flatRef.current;
      if (rows.length === 0) return;
      const index = rows.findIndex((row) => row.key === activeRef.current);
      const start = index < 0 ? 0 : index;
      const next = Math.min(Math.max(start + delta, 0), rows.length - 1);
      setActiveKey(rows[next]?.key ?? null);
    }

    function runShortcut(id: ShortcutId) {
      if (id === "search") {
        showSearch();
        return;
      }
      if (id === "help") {
        setPaletteOpen(false);
        setHelpOpen(true);
        return;
      }
      const command = DESK_COMMANDS.find((item) => item.id === id);
      if (command?.adminOnly && role !== "ADMIN") return;
      const href = hrefForShortcut(id);
      if (!href) return;
      go(href);
    }

    function onKey(event: KeyboardEvent) {
      const layer = paletteOpen ? "palette" : helpOpen ? "help" : null;
      if (layer && event.key === "F5") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const action = resolveShortcut(event, { typing: isTypingTarget(event.target), layer });
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (action.type === "help") {
        setHelpOpen(false);
        return;
      }
      if (action.type === "palette") {
        if (action.action === "close") {
          setPaletteOpen(false);
          return;
        }
        if (action.action === "down") {
          move(1);
          return;
        }
        if (action.action === "up") {
          move(-1);
          return;
        }
        const row = flatRef.current.find((item) => item.key === activeRef.current) ?? flatRef.current[0];
        if (!row) return;
        if (action.action === "secondary" && row.sanadHref) go(row.sanadHref, row.person);
        else go(row.href, row.person);
        return;
      }
      runShortcut(action.id);
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [helpOpen, paletteOpen, role, router, showSearch]);

  function openRow(key: string, mode: "open" | "secondary") {
    const row = flat.find((item) => item.key === key);
    if (!row) return;
    if (row.person) rememberPerson(row.person);
    setPaletteOpen(false);
    router.push(mode === "secondary" && row.sanadHref ? row.sanadHref : row.href);
  }

  return (
    <>
      {children(showSearch)}
      <CommandPalette
        open={paletteOpen}
        query={query}
        onQuery={(value) => {
          setQuery(value);
          setActiveKey(null);
        }}
        sections={sections}
        activeKey={currentKey}
        onHover={setActiveKey}
        onOpen={(key) => openRow(key, "open")}
        onSecondary={(key) => openRow(key, "secondary")}
        onClose={() => setPaletteOpen(false)}
        loading={!ready && !failed}
        failed={failed && !ready}
        docsLoading={docsLoading}
      />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
