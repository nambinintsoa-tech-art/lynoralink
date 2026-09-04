-- Repair migration for databases whose migration history is ahead of the schema.
CREATE TABLE IF NOT EXISTS "Reel" (
    "id" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "poster" TEXT,
    "tone" TEXT,
    "authorId" TEXT,
    "authorName" TEXT,
    "authorHandle" TEXT,
    "authorAvatar" TEXT,
    "authorVerified" BOOLEAN NOT NULL DEFAULT false,
    "caption" TEXT,
    "sound" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "following" BOOLEAN NOT NULL DEFAULT false,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Reel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReelSave" (
    "id" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReelSave_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReelShare" (
    "id" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReelShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReelSave_reelId_userId_key" ON "ReelSave"("reelId", "userId");
CREATE INDEX IF NOT EXISTS "ReelSave_userId_createdAt_idx" ON "ReelSave"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReelShare_reelId_createdAt_idx" ON "ReelShare"("reelId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReelShare_userId_createdAt_idx" ON "ReelShare"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Reel_status_createdAt_id_idx" ON "Reel"("status", "createdAt", "id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReelSave_reelId_fkey') THEN
    ALTER TABLE "ReelSave" ADD CONSTRAINT "ReelSave_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReelSave_userId_fkey') THEN
    ALTER TABLE "ReelSave" ADD CONSTRAINT "ReelSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReelShare_reelId_fkey') THEN
    ALTER TABLE "ReelShare" ADD CONSTRAINT "ReelShare_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReelShare_userId_fkey') THEN
    ALTER TABLE "ReelShare" ADD CONSTRAINT "ReelShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
