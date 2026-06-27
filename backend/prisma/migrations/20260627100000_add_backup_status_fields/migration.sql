-- Add new fields to backup_logs for comprehensive status tracking
ALTER TABLE "backup_logs" 
  ADD COLUMN IF NOT EXISTS "type" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "file_size" INTEGER,
  ADD COLUMN IF NOT EXISTS "error_message" TEXT,
  ADD COLUMN IF NOT EXISTS "triggered_by" VARCHAR(50);

-- Update existing backup records to have proper defaults
UPDATE "backup_logs" SET "status" = 'SUCCESS' WHERE "status" = 'PENDING' AND "file_name" IS NOT NULL;
UPDATE "backup_logs" SET "started_at" = "created_at" WHERE "started_at" IS NULL;
UPDATE "backup_logs" SET "completed_at" = "created_at" WHERE "completed_at" IS NULL;
UPDATE "backup_logs" SET "type" = 'MANUAL' WHERE "type" IS NULL AND "action_type" = 'backup';
