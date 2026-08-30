ALTER TABLE "Post" ADD COLUMN "companyPageId" TEXT;

CREATE INDEX "Post_companyPageId_idx" ON "Post"("companyPageId");