ALTER TABLE "Post" ADD COLUMN "campaignId" TEXT;

CREATE INDEX "Post_campaignId_idx" ON "Post"("campaignId");