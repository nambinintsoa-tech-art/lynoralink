-- CreateTable
CREATE TABLE "RemovedConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RemovedConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RemovedConnection_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "companyPageId" TEXT,
    "text" TEXT,
    "isArticle" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT,
    "excerpt" TEXT,
    "body" TEXT,
    "presentation" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "mediaData" TEXT,
    "mood" TEXT,
    "identifiedUsers" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "status" TEXT NOT NULL DEFAULT 'published',
    "reported" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Post_companyPageId_fkey" FOREIGN KEY ("companyPageId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("authorId", "body", "companyPageId", "createdAt", "excerpt", "featured", "headline", "id", "identifiedUsers", "isArticle", "mediaData", "mediaType", "mediaUrl", "mood", "presentation", "reported", "status", "text", "visibility") SELECT "authorId", "body", "companyPageId", "createdAt", "excerpt", "featured", "headline", "id", "identifiedUsers", "isArticle", "mediaData", "mediaType", "mediaUrl", "mood", "presentation", "reported", "status", "text", "visibility" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RemovedConnection_userId_idx" ON "RemovedConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RemovedConnection_userId_targetId_key" ON "RemovedConnection"("userId", "targetId");
