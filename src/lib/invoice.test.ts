import { describe, expect, it } from "vitest";
import { CODE128, code128PatternSum, code128Values, code128Widths } from "@/lib/barcode";
import { mesghalToGramFactor } from "@/lib/accounting";
import { formatRial, formatWeight } from "@/lib/format";
import { buildInvoice, gramPhrase, normalizeIranMobile, rialPhrase, telegramHref, whatsAppHref, type InvoiceSourceRow } from "@/lib/invoice";
import { qrMatrix } from "@/lib/qr";

const factorOpts = { mesghalGrams: "4.6083", mesghalAyar: "705", standardAyar: "750" };

function row(partial: Partial<InvoiceSourceRow> & Pick<InvoiceSourceRow, "id" | "rowKind" | "description">): InvoiceSourceRow {
  return {
    lineNo: 1,
    accountId: "party",
    accountTitle: "حسین محمدی",
    direction: "IN",
    goldKind: null,
    pieceLabel: null,
    ang: "",
    scaleWeight: null,
    ayar: null,
    weight750: null,
    amountRial: null,
    count: null,
    unitPrice: null,
    coinName: null,
    coinOp: null,
    gramDelta: "0",
    rialDelta: "0",
    ...partial,
  };
}

function invoice(rows: InvoiceSourceRow[], extra?: { voided?: boolean; beforeRial?: string; beforeGram?: string; asset?: boolean; kind?: "GOLD_SELL" | "GOLD_BUY" | "CASH" | "COIN" }) {
  return buildInvoice({
    id: "doc",
    number: 1024,
    kind: extra?.kind ?? "GOLD_SELL",
    description: "فروش",
    dateLabel: "۱۴۰۴/۰۸/۲۵",
    timeLabel: "۱۴:۳۰",
    voided: extra?.voided ?? false,
    voidLabel: null,
    createdByName: "رضا",
    shopName: "طلافروشی رضایی",
    footer: "سپاس از اعتماد شما",
    paper: "a5",
    accountId: "party",
    accountTitle: "حسین محمدی",
    accountCode: 104,
    groupLabel: "مشتری",
    phone: "09121234567",
    asset: extra?.asset ?? false,
    rows,
    beforeRial: extra?.beforeRial ?? "20000000",
    beforeGram: extra?.beforeGram ?? "-10.000",
    ...factorOpts,
    url: "http://localhost:43123/documents/doc",
  });
}

describe("فاکتور", () => {
  it("اجرت را در مبلغ طلا یکی می‌کند و مظنه را از وزن می‌سازد", () => {
    const factor = mesghalToGramFactor();
    const amount = 10_000_000n;
    const built = invoice([
      row({
        id: "g",
        rowKind: "GOLD",
        description: "خروج آبشده — تسویه کامل",
        goldKind: "ABSHODE",
        pieceLabel: "ط-۱۰۰۱",
        scaleWeight: "12.500",
        ayar: "750",
        weight750: "10.000",
        amountRial: amount.toString(),
        rialDelta: amount.toString(),
        direction: "OUT",
      }),
      row({
        id: "box",
        accountId: "cash",
        rowKind: "RIAL",
        description: "تسویه نقد صندوق",
        amountRial: amount.toString(),
        rialDelta: amount.toString(),
      }),
    ]);
    expect(built.lines).toHaveLength(1);
    expect(built.lines[0]?.title).toBe("فروش آبشده ط-۱۰۰۱");
    expect(built.lines[0]?.wage).toBe("در مبلغ");
    expect(built.lines[0]?.price).toBe(formatRial(4_331_802n));
    expect(built.wageMerged).toBe(true);
    expect(built.tradeAmount).toBe(formatRial(10_000_000n));
    expect(factor.toFixed(6)).toBe("4.331802");
  });

  it("سکه و دریافت نقد را جدا نشان می‌دهد و صندوق طرف را تکرار نمی‌کند", () => {
    const built = invoice(
      [
        row({
          id: "c",
          rowKind: "COIN",
          description: "خرید ۳ عدد سکه تمام امامی — تسویه کامل",
          coinName: "سکه تمام امامی",
          coinOp: "BUY",
          count: 3,
          unitPrice: "820000000",
          amountRial: "2460000000",
          rialDelta: "-2460000000",
        }),
        row({
          id: "pay",
          lineNo: 2,
          rowKind: "RIAL",
          description: "تسویه نقد صندوق ۲۴۶٬۰۰۰٬۰۰۰ ریال",
          amountRial: "2460000000",
          rialDelta: "2460000000",
          direction: "OUT",
        }),
        row({
          id: "mirror",
          accountId: "cash",
          lineNo: 3,
          rowKind: "RIAL",
          description: "تسویه نقد صندوق",
          amountRial: "2460000000",
          rialDelta: "-2460000000",
        }),
      ],
      { kind: "COIN", beforeRial: "0", beforeGram: "0" },
    );
    expect(built.lines.map((line) => line.title)).toEqual(["خرید ۳ عدد سکه تمام امامی", "پرداخت نقد"]);
    expect(built.lines[0]?.priceLabel).toBe("فی عدد");
    expect(built.tradeAmount).toBe(formatRial(2_460_000_000n));
    expect(built.paidAmount).toBe(formatRial(2_460_000_000n));
    expect(built.after.rial).toBe("0");
  });

  it("مانده قبل و بعد سند را با همان علامت دفتر حساب می‌کند", () => {
    const open = invoice(
      [
        row({
          id: "in",
          rowKind: "GOLD",
          description: "ورود آبشده",
          goldKind: "ABSHODE",
          scaleWeight: "10",
          ayar: "750",
          weight750: "10",
          gramDelta: "-10",
        }),
      ],
      { kind: "CASH", beforeRial: "0", beforeGram: "0" },
    );
    expect(open.after.gram).toBe("-10.000");
    expect(gramPhrase(open.after.gram)).toBe(`بستانکار ${formatWeight(10)} گرم`);
    expect(rialPhrase("20000000", false)).toBe(`بدهکار ${formatRial(20_000_000n)} ریال`);
    expect(rialPhrase("-1500", true)).toBe(`کسری ${formatRial(1500n)} ریال`);
    const voided = invoice(
      [row({ id: "g", rowKind: "GOLD", description: "ورود", gramDelta: "-1", weight750: "1", scaleWeight: "1", ayar: "750" })],
      { voided: true, beforeGram: "5.000", beforeRial: "10" },
    );
    expect(voided.after).toEqual(voided.before);
    expect(voided.share.text).toContain("ابطال");
    expect(voided.share.brief).toContain("مانده حساب");
    expect(voided.share.text).toContain("سپاس از اعتماد شما");
  });

  it("لینک واتساپ و تلگرام متن کوتاه و شماره را می‌سازد", () => {
    expect(normalizeIranMobile("۰۹۱۲۱۲۳۴۵۶۷")).toBe("989121234567");
    expect(normalizeIranMobile("989121234567")).toBe("989121234567");
    expect(normalizeIranMobile("")).toBeNull();
    const built = invoice([row({ id: "n", rowKind: "NOTE", description: "یادداشت" })]);
    const wa = whatsAppHref(built.share.brief, built.share.url, built.share.phone);
    expect(wa.startsWith("https://wa.me/989121234567?text=")).toBe(true);
    expect(decodeURIComponent(wa)).toContain("مانده حساب");
    expect(telegramHref(built.share.brief, built.share.url)).toContain("t.me/share/url");
    expect(built.share.brief.length).toBeLessThan(built.share.text.length);
  });
});

describe("بارکد و کیوآر سند", () => {
  it("شماره را با کد ۱۲۸ مجموعهٔ ب کد می‌کند", () => {
    expect(CODE128).toHaveLength(106);
    expect(CODE128.every((pattern) => code128PatternSum(pattern) === 11)).toBe(true);
    expect(code128PatternSum("2331112")).toBe(13);
    const values = code128Values("1001");
    expect(values[0]).toBe(104);
    expect(values.at(-1)).toBe(63);
    const widths = code128Widths("1001");
    expect(widths.reduce((sum, width) => sum + width, 0)).toBe(11 * values.length + 13);
    expect(widths.length % 2).toBe(1);
  });

  it("کیوآر گوشهٔ تیره دارد و سند را جا می‌دهد", () => {
    const matrix = qrMatrix("http://localhost:43123/documents/doc");
    expect(matrix.length).toBeGreaterThan(20);
    expect(matrix[0]?.[0]).toBe(true);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
  });
});
