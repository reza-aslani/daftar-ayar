import { describe, expect, it } from "vitest";
import { parseAmount, parseRial } from "@/lib/format";
import { caretAfterFormat, editNumber, formatNumberInput, normalizeDigits, trimDecimal } from "@/lib/number-input";

describe("نرمال‌سازی عدد هنگام تایپ", () => {
  it("ارقام فارسی و عربی را با جداکنندهٔ هزارگان نشان می‌دهد", () => {
    expect(formatNumberInput("159000000", "money")).toBe("۱۵۹٬۰۰۰٬۰۰۰");
    expect(formatNumberInput("١٥٩٠٠٠٠٠٠", "money")).toBe("۱۵۹٬۰۰۰٬۰۰۰");
    expect(formatNumberInput("۱٬۴۵۰٬۰۰۰", "money")).toBe("۱٬۴۵۰٬۰۰۰");
  });

  it("اسلش زرین را در وزن اعشار می‌گیرد و در مبلغ جداکنندهٔ هزارگان", () => {
    expect(formatNumberInput("70/53", "decimal")).toBe("۷۰٫۵۳");
    expect(formatNumberInput("۷۰/۵۳", "decimal")).toBe("۷۰٫۵۳");
    expect(formatNumberInput("70/", "decimal")).toBe("۷۰٫");
    expect(formatNumberInput("159/000/000", "money")).toBe("۱۵۹٬۰۰۰٬۰۰۰");
    expect(formatNumberInput("485000000.00", "money")).toBe("۴۸۵٬۰۰۰٬۰۰۰");
    expect(formatNumberInput("1.5", "int")).toBe("۱");
    expect(formatNumberInput("1/234/567", "decimal")).toBe("۱٬۲۳۴٬۵۶۷");
  });

  it("خروجی قالب‌بندی هنوز با همان تجزیه‌گر قبلی خوانده می‌شود", () => {
    expect(parseAmount(formatNumberInput("70/53", "decimal"))).toBe(70.53);
    expect(parseAmount(formatNumberInput("159000000", "money"))).toBe(159000000);
    expect(parseRial(formatNumberInput("119/000/000", "money"))).toBe(119000000n);
    expect(() => parseAmount(formatNumberInput("", "decimal"))).toThrow();
  });

  it("صفرهای اضافه و شمارهٔ تلفن را تمیز می‌کند", () => {
    expect(formatNumberInput("00012", "int")).toBe("۱۲");
    expect(formatNumberInput("0", "money")).toBe("۰");
    expect(trimDecimal("740.00")).toBe("740");
    expect(trimDecimal("740.50")).toBe("740.5");
    expect(normalizeDigits("۰۹۱۲۱۲۳۴۵۶۷")).toBe("09121234567");
    expect(normalizeDigits("٠٩١٢-abc")).toBe("0912");
  });

  it("مکان‌نما را بعد از جداکننده درست می‌گذارد و بک‌اسپیس گیر نمی‌کند", () => {
    const formatted = formatNumberInput("1590000", "money");
    expect(formatted).toBe("۱٬۵۹۰٬۰۰۰");
    expect(caretAfterFormat("1590000", formatted, 3)).toBe(4);
    const stuck = editNumber("۱۵۹٬۰۰۰", "۱۵۹۰۰۰", 3, "money");
    expect(stuck.text).toBe("۱۵٬۰۰۰");
  });
});
