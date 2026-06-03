ALTER TABLE "minute_attachments"
ADD COLUMN "is_public_safe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "public_scan_status" VARCHAR(30) NOT NULL DEFAULT 'pending';
