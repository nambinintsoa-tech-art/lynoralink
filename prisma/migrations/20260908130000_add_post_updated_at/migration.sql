-- Track the last modification time of posts.
ALTER TABLE "Post"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
