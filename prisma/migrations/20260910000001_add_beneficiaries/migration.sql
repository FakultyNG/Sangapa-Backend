-- CreateEnum
CREATE TYPE "BeneficiaryType" AS ENUM ('EUR_IBAN', 'EUR_WISETAG', 'USDC_ADDRESS');

-- CreateEnum
CREATE TYPE "BeneficiaryStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BeneficiaryType" NOT NULL,
    "beneficiaryName" TEXT NOT NULL,
    "iban" TEXT,
    "bankName" TEXT,
    "beneficiaryAddress" TEXT,
    "wiseTag" TEXT,
    "usdcAddress" TEXT,
    "usdcNetwork" TEXT,
    "status" "BeneficiaryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "beneficiaries_userId_type_idx" ON "beneficiaries"("userId", "type");

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
