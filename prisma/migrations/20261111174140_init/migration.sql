-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "public"."AccountGroup" AS ENUM ('CUSTOMER', 'MAKER', 'BANK', 'CASH', 'EXPENSE', 'INVESTOR');

-- CreateEnum
CREATE TYPE "public"."GoldKind" AS ENUM ('MOTAFARREQE', 'ABSHODE');

-- CreateEnum
CREATE TYPE "public"."GoldStatus" AS ENUM ('IN_STOCK', 'OUT');

-- CreateEnum
CREATE TYPE "public"."AssayState" AS ENUM ('NONE', 'PENDING', 'RESULTED');

-- CreateEnum
CREATE TYPE "public"."DocumentKind" AS ENUM ('GOLD_IN', 'GOLD_OUT', 'GOLD_BUY', 'GOLD_SELL', 'ASSAY', 'MELT', 'COIN', 'CASH', 'OPENING', 'SEND_PIECES');

-- CreateEnum
CREATE TYPE "public"."Direction" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "public"."RowKind" AS ENUM ('GOLD', 'RIAL', 'COIN', 'ADJUSTMENT', 'NOTE');

-- CreateEnum
CREATE TYPE "public"."CoinOp" AS ENUM ('BUY', 'SELL', 'RECEIVE', 'PAY');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "family" TEXT NOT NULL DEFAULT '',
    "group" "public"."AccountGroup" NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "nationalId" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "shopName" TEXT NOT NULL DEFAULT 'طلافروشی',
    "defaultAyar" DECIMAL(7,2) NOT NULL DEFAULT 740,
    "standardAyar" DECIMAL(7,2) NOT NULL DEFAULT 750,
    "mesghalGrams" DECIMAL(8,4) NOT NULL DEFAULT 4.6083,
    "mesghalAyar" DECIMAL(7,2) NOT NULL DEFAULT 705,
    "staleAbshodeDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mazane" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mazaneMesghal" BIGINT NOT NULL,
    "mazaneGram" BIGINT NOT NULL,
    "enteredAs" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mazane_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssayLab" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AssayLab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoinType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buyPrice" BIGINT NOT NULL DEFAULT 0,
    "sellPrice" BIGINT NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CoinType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GoldItem" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "kind" "public"."GoldKind" NOT NULL,
    "conditional" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."GoldStatus" NOT NULL DEFAULT 'IN_STOCK',
    "assayState" "public"."AssayState" NOT NULL DEFAULT 'NONE',
    "originalScale" DECIMAL(14,3) NOT NULL,
    "original750" DECIMAL(14,3) NOT NULL,
    "remainingScale" DECIMAL(14,3) NOT NULL,
    "remaining750" DECIMAL(14,3) NOT NULL,
    "receiptAyar" DECIMAL(7,2) NOT NULL,
    "ayar" DECIMAL(7,2) NOT NULL,
    "assayAyar" DECIMAL(7,2),
    "assayKasr" DECIMAL(14,3),
    "ang" TEXT NOT NULL DEFAULT '',
    "envelopeNo" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "labId" TEXT,
    "sourceAccountId" TEXT,
    "originDocumentId" TEXT NOT NULL,
    "receivedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoldItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Counter" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "kind" "public"."DocumentKind" NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "meta" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentRow" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "direction" "public"."Direction" NOT NULL,
    "rowKind" "public"."RowKind" NOT NULL,
    "goldKind" "public"."GoldKind",
    "goldItemId" TEXT,
    "scaleWeight" DECIMAL(14,3),
    "ayar" DECIMAL(7,2),
    "weight750" DECIMAL(14,3),
    "amountRial" BIGINT,
    "coinTypeId" TEXT,
    "count" INTEGER,
    "unitPrice" BIGINT,
    "coinOp" "public"."CoinOp",
    "gramDelta" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "rialDelta" BIGINT NOT NULL DEFAULT 0,
    "coinDelta" INTEGER NOT NULL DEFAULT 0,
    "stockCountDelta" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DocumentRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_code_key" ON "public"."Account"("code");

-- CreateIndex
CREATE INDEX "Mazane_date_idx" ON "public"."Mazane"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AssayLab_name_key" ON "public"."AssayLab"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CoinType_code_key" ON "public"."CoinType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CoinType_name_key" ON "public"."CoinType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GoldItem_code_key" ON "public"."GoldItem"("code");

-- CreateIndex
CREATE INDEX "GoldItem_status_hidden_idx" ON "public"."GoldItem"("status", "hidden");

-- CreateIndex
CREATE INDEX "GoldItem_assayState_idx" ON "public"."GoldItem"("assayState");

-- CreateIndex
CREATE UNIQUE INDEX "Document_number_key" ON "public"."Document"("number");

-- CreateIndex
CREATE INDEX "Document_date_idx" ON "public"."Document"("date");

-- CreateIndex
CREATE INDEX "Document_accountId_idx" ON "public"."Document"("accountId");

-- CreateIndex
CREATE INDEX "Document_kind_idx" ON "public"."Document"("kind");

-- CreateIndex
CREATE INDEX "DocumentRow_accountId_idx" ON "public"."DocumentRow"("accountId");

-- CreateIndex
CREATE INDEX "DocumentRow_documentId_idx" ON "public"."DocumentRow"("documentId");

-- CreateIndex
CREATE INDEX "DocumentRow_goldItemId_idx" ON "public"."DocumentRow"("goldItemId");

-- CreateIndex
CREATE INDEX "DocumentRow_coinTypeId_idx" ON "public"."DocumentRow"("coinTypeId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mazane" ADD CONSTRAINT "Mazane_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoldItem" ADD CONSTRAINT "GoldItem_labId_fkey" FOREIGN KEY ("labId") REFERENCES "public"."AssayLab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoldItem" ADD CONSTRAINT "GoldItem_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoldItem" ADD CONSTRAINT "GoldItem_originDocumentId_fkey" FOREIGN KEY ("originDocumentId") REFERENCES "public"."Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentRow" ADD CONSTRAINT "DocumentRow_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentRow" ADD CONSTRAINT "DocumentRow_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentRow" ADD CONSTRAINT "DocumentRow_goldItemId_fkey" FOREIGN KEY ("goldItemId") REFERENCES "public"."GoldItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentRow" ADD CONSTRAINT "DocumentRow_coinTypeId_fkey" FOREIGN KEY ("coinTypeId") REFERENCES "public"."CoinType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
