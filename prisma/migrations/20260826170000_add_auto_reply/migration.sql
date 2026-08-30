ALTER TABLE "User" ADD COLUMN "auto_reply_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "autoReplyTone" TEXT DEFAULT 'friendly';
ALTER TABLE "User" ADD COLUMN "autoReplyDefaultMessage" TEXT;
ALTER TABLE "User" ADD COLUMN "autoReplyFaq" TEXT;

CREATE TABLE "auto_reply_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "auto_reply_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "auto_reply_rules_userId_dayOfWeek_idx" ON "auto_reply_rules"("userId", "dayOfWeek");