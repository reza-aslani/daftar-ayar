import { describe, expect, it } from "vitest";
import { compareVisualRtl, type Box } from "@/lib/focus-order";

function box(top: number, right: number, left = right - 40): Box {
  return { top, right, left, width: right - left, height: 40 };
}

describe("ترتیب دیداری راست‌به‌چپ", () => {
  it("اول ردیف بالا، و در هر ردیف سمت راست", () => {
    const person = box(10, 400);
    const date = box(10, 200);
    const weight = box(70, 400);
    const ayar = box(70, 200);
    const ordered = [date, ayar, weight, person].sort(compareVisualRtl);
    expect(ordered).toEqual([person, date, weight, ayar]);
  });

  it("چند پیکسل اختلاف در یک ردیف را ردیف جدا حساب نمی‌کند", () => {
    const right = box(100, 300);
    const left = box(104, 120);
    expect([left, right].sort(compareVisualRtl)).toEqual([right, left]);
  });
});
