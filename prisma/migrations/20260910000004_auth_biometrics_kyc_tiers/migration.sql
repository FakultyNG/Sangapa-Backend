-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('TIER_1', 'TIER_2');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserDeletionStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "KycIdCardType" AS ENUM ('PASSPORT', 'NATIONAL_ID', 'VOTER_CARD', 'DRIVER_LICENCE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "users" ADD COLUMN "tier" "UserTier" NOT NULL DEFAULT 'TIER_1';
ALTER TABLE "users" ADD COLUMN "dailyDepositLimitXaf" TEXT NOT NULL DEFAULT '500000';
ALTER TABLE "users" ADD COLUMN "monthlyDepositLimitXaf" TEXT NOT NULL DEFAULT '2500000';
ALTER TABLE "users" ADD COLUMN "profileImageUrl" TEXT;
ALTER TABLE "users" ADD COLUMN "deletionStatus" "UserDeletionStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "biometric_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "challenge" TEXT,
    "challengeExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT,
    "frontImageUrl" TEXT NOT NULL,
    "backImageUrl" TEXT,
    "selfieImageUrl" TEXT,
    "countryOfOrigin" TEXT,
    "countryOfResidence" TEXT,
    "proofOfAddressUrl" TEXT,
    "faceVerificationImageUrl" TEXT,
    "idCardType" "KycIdCardType",
    "idFrontUrl" TEXT,
    "idBackUrl" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_environment_variables" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sensitive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_environment_variables_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "biometric_credentials_userId_deviceId_key" ON "biometric_credentials"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_credentials_deviceId_key" ON "biometric_credentials"("deviceId");

-- CreateIndex
CREATE INDEX "kyc_submissions_userId_status_idx" ON "kyc_submissions"("userId", "status");

-- CreateIndex
CREATE INDEX "kyc_submissions_status_createdAt_idx" ON "kyc_submissions"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "biometric_credentials" ADD CONSTRAINT "biometric_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
