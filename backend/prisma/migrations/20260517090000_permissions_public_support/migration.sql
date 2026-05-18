ALTER TABLE "meeting_minutes"
ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "published_at" TIMESTAMP(3);

UPDATE "meeting_minutes"
SET "is_public" = true,
    "published_at" = COALESCE("updated_at", "created_at")
WHERE "status" = 'approved';

CREATE TABLE "support_requests" (
    "request_id" SERIAL NOT NULL,
    "requested_by" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "response" TEXT,
    "handled_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("request_id")
);

ALTER TABLE "support_requests"
ADD CONSTRAINT "support_requests_requested_by_fkey"
FOREIGN KEY ("requested_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_requests"
ADD CONSTRAINT "support_requests_handled_by_fkey"
FOREIGN KEY ("handled_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
