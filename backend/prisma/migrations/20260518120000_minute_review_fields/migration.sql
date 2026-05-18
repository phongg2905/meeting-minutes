ALTER TABLE "meeting_minutes"
ADD COLUMN "reviewed_by" INTEGER,
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "review_note" TEXT;
