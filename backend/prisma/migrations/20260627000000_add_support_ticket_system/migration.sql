ALTER TABLE "support_requests"
ADD COLUMN "category" VARCHAR(100),
ADD COLUMN "resolution" TEXT,
ADD COLUMN "assigned_admin" INTEGER,
ADD COLUMN "resolved_by" INTEGER,
ADD COLUMN "resolved_at" TIMESTAMP(3),
ADD COLUMN "last_message_at" TIMESTAMP(3);

ALTER TABLE "support_requests"
ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "support_requests"
ADD CONSTRAINT "support_requests_assigned_admin_fkey"
FOREIGN KEY ("assigned_admin") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_requests"
ADD CONSTRAINT "support_requests_resolved_by_fkey"
FOREIGN KEY ("resolved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
