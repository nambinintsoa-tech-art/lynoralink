-- CreateTable
CREATE TABLE "StatusCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "StatusCheck_checkedAt_idx" ON "StatusCheck"("checkedAt");
