-- CreateTable ReelCommentReaction
CREATE TABLE "ReelCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL DEFAULT 'ok',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReelCommentReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReelCommentReaction_commentId_userId_key" ON "ReelCommentReaction"("commentId", "userId");
CREATE INDEX "ReelCommentReaction_commentId_idx" ON "ReelCommentReaction"("commentId");
CREATE INDEX "ReelCommentReaction_userId_idx" ON "ReelCommentReaction"("userId");

ALTER TABLE "ReelCommentReaction" ADD CONSTRAINT "ReelCommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ReelComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReelCommentReaction" ADD CONSTRAINT "ReelCommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
