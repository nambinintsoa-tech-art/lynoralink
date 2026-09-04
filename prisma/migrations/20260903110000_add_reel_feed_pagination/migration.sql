-- Support cursor pagination for the published reels feed.
CREATE INDEX "Reel_status_createdAt_id_idx" ON "Reel"("status", "createdAt", "id");