-- Allow one reaction row per type for each user and post.
DROP INDEX "Like_postId_userId_key";
CREATE UNIQUE INDEX "Like_postId_userId_reaction_key" ON "Like"("postId", "userId", "reaction");
