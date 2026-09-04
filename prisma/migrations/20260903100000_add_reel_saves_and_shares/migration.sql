-- CreateTable
CREATE TABLE "ReelSave" (
    "id" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReelSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReelShare" (
    "id" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReelShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReelSave_reelId_userId_key" ON "ReelSave"("reelId", "userId");
CREATE INDEX "ReelSave_userId_createdAt_idx" ON "ReelSave"("userId", "createdAt");
CREATE INDEX "ReelShare_reelId_createdAt_idx" ON "ReelShare"("reelId", "createdAt");
CREATE INDEX "ReelShare_userId_createdAt_idx" ON "ReelShare"("userId", "createdAt");

ALTER TABLE "ReelSave" ADD CONSTRAINT "ReelSave_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReelSave" ADD CONSTRAINT "ReelSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReelShare" ADD CONSTRAINT "ReelShare_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReelShare" ADD CONSTRAINT "ReelShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
