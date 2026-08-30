-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "description" TEXT,
    "category" TEXT,
    "coverGradient" TEXT,
    "coverUrl" TEXT,
    "avatarUrl" TEXT,
    "privacy" TEXT DEFAULT 'public',
    "postPermission" TEXT DEFAULT 'all',
    "location" TEXT,
    "inviteLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "members" TEXT,
    "posts" TEXT,
    "events" TEXT,
    "media" TEXT,
    "files" TEXT,
    "announcements" TEXT,
    "rules" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Group" ("announcements", "avatarUrl", "category", "coverGradient", "coverUrl", "createdAt", "description", "emoji", "events", "files", "id", "inviteLink", "location", "media", "members", "name", "ownerId", "postPermission", "posts", "privacy", "rules", "tags", "updatedAt") SELECT "announcements", "avatarUrl", "category", "coverGradient", "coverUrl", "createdAt", "description", "emoji", "events", "files", "id", "inviteLink", "location", "media", "members", "name", "ownerId", "postPermission", "posts", "privacy", "rules", "tags", "updatedAt" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "text" TEXT,
    "isArticle" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT,
    "excerpt" TEXT,
    "body" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "mediaData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "reported" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("authorId", "body", "createdAt", "excerpt", "headline", "id", "isArticle", "mediaData", "mediaType", "mediaUrl", "text") SELECT "authorId", "body", "createdAt", "excerpt", "headline", "id", "isArticle", "mediaData", "mediaType", "mediaUrl", "text" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "title" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "password" TEXT,
    "image" TEXT,
    "cover" TEXT,
    "website" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "company" TEXT,
    "sector" TEXT,
    "skills" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("bio", "company", "cover", "createdAt", "email", "emailVerified", "id", "image", "location", "name", "password", "plan", "sector", "skills", "title", "updatedAt", "website") SELECT "bio", "company", "cover", "createdAt", "email", "emailVerified", "id", "image", "location", "name", "password", "plan", "sector", "skills", "title", "updatedAt", "website" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");
