DROP INDEX IF EXISTS "notifications_user_id_is_read_created_at_idx";

CREATE INDEX IF NOT EXISTS "users_role_id_status_created_at_idx"
ON "users" ("role_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "meeting_minutes_created_by_created_at_idx"
ON "meeting_minutes" ("created_by", "created_at");

CREATE INDEX IF NOT EXISTS "meeting_minutes_status_is_public_created_at_idx"
ON "meeting_minutes" ("status", "is_public", "created_at");

CREATE INDEX IF NOT EXISTS "meeting_minutes_type_id_meeting_date_idx"
ON "meeting_minutes" ("type_id", "meeting_date");

CREATE INDEX IF NOT EXISTS "minute_tasks_minute_id_task_id_idx"
ON "minute_tasks" ("minute_id", "task_id");

CREATE INDEX IF NOT EXISTS "minute_participants_minute_id_participant_id_idx"
ON "minute_participants" ("minute_id", "participant_id");

CREATE INDEX IF NOT EXISTS "minute_attachments_minute_id_uploaded_at_idx"
ON "minute_attachments" ("minute_id", "uploaded_at");

CREATE INDEX IF NOT EXISTS "activity_logs_user_id_created_at_idx"
ON "activity_logs" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "activity_logs_action_name_created_at_idx"
ON "activity_logs" ("action_name", "created_at");

CREATE INDEX IF NOT EXISTS "activity_logs_target_table_created_at_idx"
ON "activity_logs" ("target_table", "created_at");

CREATE INDEX IF NOT EXISTS "backup_logs_action_type_created_at_idx"
ON "backup_logs" ("action_type", "created_at");

CREATE INDEX IF NOT EXISTS "backup_logs_performed_by_created_at_idx"
ON "backup_logs" ("performed_by", "created_at");

CREATE INDEX IF NOT EXISTS "backup_logs_status_created_at_idx"
ON "backup_logs" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "support_requests_requested_by_status_created_at_idx"
ON "support_requests" ("requested_by", "status", "created_at");

CREATE INDEX IF NOT EXISTS "support_requests_status_created_at_idx"
ON "support_requests" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "support_messages_ticket_id_created_at_idx"
ON "support_messages" ("ticket_id", "created_at");

CREATE INDEX IF NOT EXISTS "support_attachments_message_id_idx"
ON "support_attachments" ("message_id");

CREATE INDEX IF NOT EXISTS "manager_role_requests_user_id_status_created_at_idx"
ON "manager_role_requests" ("user_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_target_table_created_at_idx"
ON "notifications" ("user_id", "is_read", "target_table", "created_at");
