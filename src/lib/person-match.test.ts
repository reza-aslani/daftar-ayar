import { describe, expect, it } from "vitest";
import { filterPeople, foldFa } from "@/lib/person-match";

const people = [
  { id: "a", code: 104, title: "حسین محمدی" },
  { id: "b", code: 105, title: "فاطمه اکبری" },
  { id: "c", code: 106, title: "کارگاه کیان" },
  { id: "d", code: 108, title: "بانک صادرات" },
];

describe("جستجوی شخص", () => {
  it("بخشی از نام را همان لحظه پیدا می‌کند", () => {
    expect(filterPeople(people, "حس").map((p) => p.id)).toEqual(["a"]);
    expect(filterPeople(people, "محمد").map((p) => p.id)).toEqual(["a"]);
    expect(filterPeople(people, "کیان").map((p) => p.id)).toEqual(["c"]);
  });

  it("کد حساب را با رقم فارسی و پیشوند پیدا می‌کند", () => {
    expect(filterPeople(people, "۱۰۴").map((p) => p.id)).toEqual(["a"]);
    expect(filterPeople(people, "10").map((p) => p.code)).toEqual([104, 105, 106, 108]);
  });

  it("ی و ک عربی را با فارسی یکی می‌گیرد", () => {
    expect(foldFa("علي كيان")).toBe(foldFa("علی کیان"));
    expect(filterPeople([{ id: "x", code: 1, title: "علی کیانی" }], "علي").map((p) => p.id)).toEqual(["x"]);
  });

  it("عبارت خالی همه را به ترتیب کد برمی‌گرداند", () => {
    expect(filterPeople(people, "  ").map((p) => p.code)).toEqual([104, 105, 106, 108]);
  });
});
