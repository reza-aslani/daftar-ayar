import { describe, expect, it } from "vitest";
import { buildPaletteSections } from "@/components/palette-model";
import type { SearchPerson } from "@/lib/search-types";

const hossein: SearchPerson = {
  id: "a",
  code: 104,
  title: "حسین محمدی",
  phone: "",
  mobile: "09121234567",
  group: "CUSTOMER",
  groupLabel: "مشتری",
  active: true,
};
const bank: SearchPerson = {
  id: "b",
  code: 101,
  title: "بانک ملت",
  phone: "",
  mobile: "",
  group: "BANK",
  groupLabel: "بانک",
  active: true,
};

describe("نتیجه‌های جستجو", () => {
  it("بدون عبارت، اشخاص اخیر و صفحه‌ها را نشان می‌دهد", () => {
    const sections = buildPaletteSections({
      query: "",
      people: [hossein, bank],
      ready: true,
      recent: [{ id: "a", code: 104, title: "قدیمی", group: "CUSTOMER", groupLabel: "مشتری" }],
      documents: [],
      role: "OPERATOR",
    });
    expect(sections[0]?.label).toBe("اخیراً باز شده");
    expect(sections[0]?.rows[0]?.title).toContain("حسین محمدی");
    expect(sections[0]?.rows[0]?.sanadHref).toBe("/sanad?account=a");
    expect(sections.some((section) => section.rows.some((row) => row.key === "page-users"))).toBe(false);
  });

  it("بانک سند تازه نمی‌گیرد و تلفن در توضیح می‌آید", () => {
    const sections = buildPaletteSections({
      query: "۰۹۱۲",
      people: [hossein, bank],
      ready: true,
      recent: [],
      documents: [],
      role: "ADMIN",
    });
    const people = sections.find((section) => section.label === "اشخاص");
    expect(people?.rows.map((row) => row.key)).toEqual(["person-a"]);
    expect(people?.rows[0]?.hint).toContain("۰۹۱۲۱۲۳۴۵۶۷");
    const banks = buildPaletteSections({
      query: "ملت",
      people: [hossein, bank],
      ready: true,
      recent: [],
      documents: [],
      role: "ADMIN",
    });
    expect(banks[0]?.rows[0]?.sanadHref).toBeUndefined();
  });

  it("شخص حذف‌شده را از اخیر برمی‌دارد", () => {
    const sections = buildPaletteSections({
      query: "",
      people: [hossein],
      ready: true,
      recent: [{ id: "gone", code: 9, title: "رفته", group: "CUSTOMER", groupLabel: "مشتری" }],
      documents: [],
      role: "ADMIN",
    });
    expect(sections.some((section) => section.label === "اخیراً باز شده")).toBe(false);
  });
});
