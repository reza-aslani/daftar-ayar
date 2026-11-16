import { DESK_COMMANDS, canStartSanad, filterCommands, type DeskCommand, type DeskRole } from "@/lib/commands";
import { toFaDigits } from "@/lib/format";
import { filterPeople } from "@/lib/person-match";
import type { RecentPerson } from "@/lib/recent-people";
import type { SearchDocument, SearchPerson } from "@/lib/search-types";

export type PaletteRow = {
  key: string;
  href: string;
  title: string;
  hint: string;
  kbd?: string;
  sanadHref?: string;
  person?: RecentPerson;
};

export type PaletteSection = { label: string; rows: PaletteRow[] };

type PersonHit = {
  id: string;
  code: number;
  title: string;
  group: string;
  groupLabel: string;
  phone?: string;
  mobile?: string;
  active?: boolean;
};

function personRow(person: PersonHit): PaletteRow {
  const phone = person.mobile || person.phone || "";
  const hint = [person.groupLabel, phone ? toFaDigits(phone) : "", person.active === false ? "غیرفعال" : ""].filter(Boolean).join(" · ");
  return {
    key: `person-${person.id}`,
    href: `/accounts/${person.id}`,
    title: `${toFaDigits(person.code)} — ${person.title}`,
    hint,
    sanadHref: canStartSanad(person.group) ? `/sanad?account=${encodeURIComponent(person.id)}` : undefined,
    person: {
      id: person.id,
      code: person.code,
      title: person.title,
      group: person.group,
      groupLabel: person.groupLabel,
    },
  };
}

function pageRow(command: DeskCommand): PaletteRow {
  return {
    key: `page-${command.id}`,
    href: command.href,
    title: command.title,
    hint: command.hint,
    kbd: command.shortcut,
  };
}

export function buildPaletteSections(input: {
  query: string;
  people: SearchPerson[];
  ready: boolean;
  recent: RecentPerson[];
  documents: SearchDocument[];
  role: DeskRole;
}): PaletteSection[] {
  const query = input.query.trim();
  if (!query) {
    const sections: PaletteSection[] = [];
    const recentRows = input.recent.flatMap((item) => {
      if (!input.ready) return [personRow(item)];
      const live = input.people.find((person) => person.id === item.id);
      return live ? [personRow(live)] : [];
    });
    if (recentRows.length) sections.push({ label: "اخیراً باز شده", rows: recentRows.slice(0, 6) });
    const pages = filterCommands(DESK_COMMANDS, "", input.role).map(pageRow);
    if (pages.length) sections.push({ label: "صفحه‌ها", rows: pages });
    return sections;
  }

  const sections: PaletteSection[] = [];
  const people = filterPeople(input.people, query).slice(0, 12).map(personRow);
  if (people.length) sections.push({ label: "اشخاص", rows: people });
  if (input.documents.length) {
    sections.push({
      label: "سندها",
      rows: input.documents.map((doc) => ({
        key: `doc-${doc.id}`,
        href: doc.href,
        title: doc.title,
        hint: doc.hint,
      })),
    });
  }
  const pages = filterCommands(DESK_COMMANDS, query, input.role).slice(0, 8).map(pageRow);
  if (pages.length) sections.push({ label: "صفحه‌ها", rows: pages });
  return sections;
}

export function flattenSections(sections: PaletteSection[]): PaletteRow[] {
  return sections.flatMap((section) => section.rows);
}
