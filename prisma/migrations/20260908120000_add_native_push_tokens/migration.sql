CREATE TABLE "NativePushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NativePushToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NativePushToken_token_key" ON "NativePushToken"("token");
CREATE INDEX "NativePushToken_userId_idx" ON "NativePushToken"("userId");

ALTER TABLE "NativePushToken" ADD CONSTRAINT "NativePushToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;