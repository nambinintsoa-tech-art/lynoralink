-- CreateTable Reel
CREATE TABLE "Reel" (
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

-- CreateTable ReelReaction
CREATE TABLE "ReelReaction" (
    "id" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL DEFAULT 'ok',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReelReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReelReaction_reelId_userId_key" ON "ReelReaction"("reelId", "userId");

-- CreateIndex
CREATE INDEX "ReelReaction_reelId_idx" ON "ReelReaction"("reelId");

-- CreateIndex
CREATE INDEX "ReelReaction_userId_idx" ON "ReelReaction"("userId");

-- AddForeignKey
ALTER TABLE "ReelReaction" ADD CONSTRAINT "ReelReaction_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelReaction" ADD CONSTRAINT "ReelReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
