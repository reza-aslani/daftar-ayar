import { describe, expect, it } from "vitest";
import { readLast, writeLast } from "@/lib/last-used";

function memory() {
  const bag = new Map<string, string>();
  return {
    getItem: (key: string) => bag.get(key) ?? null,
    setItem: (key: string, value: string) => {
      bag.set(key, value);
    },
  };
}

describe("آخرین مقدار هر فرم", () => {
  it("نوع معامله و بانک را جدا برای هر فرم نگه می‌دارد", () => {
    const store = memory();
    writeLast(store, "sanad-buy", { kind: "ABSHODE", ayar: "740" });
    writeLast(store, "sandogh", { bankId: "mellat", mode: "IN" });
    expect(readLast(store, "sanad-buy")).toEqual({ kind: "ABSHODE", ayar: "740" });
    expect(readLast(store, "sandogh").bankId).toBe("mellat");
    expect(readLast(store, "missing")).toEqual({});
  });

  it("دادهٔ خراب را خالی برمی‌گرداند", () => {
    const store = memory();
    store.setItem("daftar-ayar.last.v1", "{");
    expect(readLast(store, "sanad-buy")).toEqual({});
  });
});
