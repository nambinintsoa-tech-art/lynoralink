-- Add configurable FAQ questions for private group join requests
ALTER TABLE "Group" ADD COLUMN "joinQuestions" TEXT;
