-- SQLite cannot alter a unique constraint in place, so rebuild Conversation with page context.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Conversation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userAId" TEXT NOT NULL,
  "userBId" TEXT NOT NULL,
  "pageId" TEXT,
  "groupName" TEXT,
  "isGroup" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Conversation_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Conversation_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Conversation" ("id", "userAId", "userBId", "groupName", "isGroup", "createdAt", "updatedAt")
SELECT "id", "userAId", "userBId", "groupName", "isGroup", "createdAt", "updatedAt" FROM "Conversation";

DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
CREATE UNIQUE INDEX "Conversation_userAId_userBId_pageId_key" ON "Conversation" ("userAId", "userBId", "pageId");
PRAGMA foreign_keys=ON;
