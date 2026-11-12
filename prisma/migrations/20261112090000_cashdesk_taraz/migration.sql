-- صندوق، بانک و تراز. مقدار جدید نوع سند فقط اضافه می‌شود؛ دادهٔ موجود دست نمی‌خورد.
ALTER TYPE "DocumentKind" ADD VALUE 'TRANSFER';

ALTER TABLE "Account" ADD COLUMN "branch" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Account" ADD COLUMN "accountNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Account" ADD COLUMN "iban" TEXT NOT NULL DEFAULT '';
