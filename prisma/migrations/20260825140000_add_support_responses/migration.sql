-- AlterTable
ALTER TABLE "SupportRequest" ADD COLUMN "response" TEXT;
ALTER TABLE "SupportRequest" ADD COLUMN "respondedAt" DATETIME;
ALTER TABLE "SupportRequest" ADD COLUMN "respondedBy" TEXT;
