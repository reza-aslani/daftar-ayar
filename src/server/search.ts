import { formatJalaliFa } from "@/lib/date";
import { prisma } from "@/lib/db";
import { toFaDigits } from "@/lib/format";
import { DOC_LABEL, GROUP_LABEL, accountTitle } from "@/lib/labels";
import { digitQuery, documentNumberRanges } from "@/lib/search-query";
import type { SearchDocument, SearchPerson } from "@/lib/search-types";

export async function listSearchPeople(): Promise<SearchPerson[]> {
  const accounts = await prisma.account.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      family: true,
      phone: true,
      mobile: true,
      group: true,
      active: true,
    },
  });
  return accounts.map((account) => ({
    id: account.id,
    code: account.code,
    title: accountTitle(account.name, account.family),
    phone: account.phone,
    mobile: account.mobile,
    group: account.group,
    groupLabel: GROUP_LABEL[account.group],
    active: account.active,
  }));
}

export async function findDocumentsByQuery(raw: string): Promise<SearchDocument[]> {
  const digits = digitQuery(raw);
  if (!digits) return [];
  const ranges = documentNumberRanges(digits);
  if (ranges.length === 0) return [];
  const docs = await prisma.document.findMany({
    where: { OR: ranges.map((range) => ({ number: { gte: range.gte, lte: range.lte } })) },
    orderBy: { number: "asc" },
    take: 6,
    select: {
      id: true,
      number: true,
      kind: true,
      date: true,
      voidedAt: true,
      account: { select: { name: true, family: true } },
    },
  });
  return docs.map((doc) => ({
    id: doc.id,
    number: doc.number,
    href: `/documents/${doc.id}`,
    title: `سند ${toFaDigits(doc.number)}`,
    hint: [DOC_LABEL[doc.kind], accountTitle(doc.account.name, doc.account.family), formatJalaliFa(doc.date), doc.voidedAt ? "ابطال" : ""]
      .filter(Boolean)
      .join(" · "),
  }));
}
