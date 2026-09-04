-- Store the page scope so Reels can appear on user and company media tabs.
ALTER TABLE "Reel" ADD COLUMN IF NOT EXISTS "companyPageId" TEXT;
ALTER TABLE "Reel" ADD COLUMN IF NOT EXISTS "authorType" TEXT;
CREATE INDEX IF NOT EXISTS "Reel_companyPageId_createdAt_idx" ON "Reel"("companyPageId", "createdAt");