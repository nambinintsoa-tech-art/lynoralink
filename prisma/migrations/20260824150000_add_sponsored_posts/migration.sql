ALTER TABLE "Post" ADD COLUMN "isSponsored" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Post_isSponsored_idx" ON "Post"("isSponsored");
