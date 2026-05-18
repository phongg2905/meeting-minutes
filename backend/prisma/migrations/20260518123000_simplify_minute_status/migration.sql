UPDATE "meeting_minutes"
SET "status" = CASE
  WHEN "status" IN ('approved', 'rejected', 'completed') THEN 'completed'
  ELSE 'draft'
END;

UPDATE "meeting_minutes"
SET "is_public" = false,
    "published_at" = null
WHERE "status" <> 'completed';
