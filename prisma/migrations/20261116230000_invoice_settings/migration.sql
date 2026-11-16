-- اندازهٔ کاغذ و متن پایین فاکتور. ستون‌ها با مقدار پیش‌فرض اضافه می‌شوند و دادهٔ موجود دست نمی‌خورد.
ALTER TABLE "ShopSettings" ADD COLUMN "invoicePaper" TEXT NOT NULL DEFAULT 'a5';
ALTER TABLE "ShopSettings" ADD COLUMN "invoiceFooter" TEXT NOT NULL DEFAULT '';
