-- CreateTable ReelComment
CREATE TABLE "ReelComment" (
    "id" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "parentId" TEXT,
    "mediaData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReelComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReelComment_reelId_createdAt_idx" ON "ReelComment"("reelId", "createdAt");
CREATE INDEX "ReelComment_parentId_idx" ON "ReelComment"("parentId");

ALTER TABLE "ReelComment" ADD CONSTRAINT "ReelComment_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReelComment" ADD CONSTRAINT "ReelComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReelComment" ADD CONSTRAINT "ReelComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ReelComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
