ALTER TABLE "Story" ADD COLUMN "companyPageId" TEXT;

CREATE INDEX "Story_companyPageId_idx" ON "Story"("companyPageId");
