-- DropIndex
DROP INDEX "Post_campaignId_idx";

-- DropIndex
DROP INDEX "Post_isSponsored_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME;
