-- Créer la table Reel
CREATE TABLE IF NOT EXISTS "Reel" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table ReelReaction
CREATE TABLE IF NOT EXISTS "ReelReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL DEFAULT 'ok',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReelReaction_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE,
    CONSTRAINT "ReelReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "ReelReaction_reelId_userId_key" UNIQUE("reelId", "userId")
);

-- Créer les index
CREATE INDEX IF NOT EXISTS "ReelReaction_reelId_idx" ON "ReelReaction"("reelId");
CREATE INDEX IF NOT EXISTS "ReelReaction_userId_idx" ON "ReelReaction"("userId");
