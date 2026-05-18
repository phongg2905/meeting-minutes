-- CreateTable
CREATE TABLE "roles" (
    "role_id" SERIAL NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "minute_types" (
    "type_id" SERIAL NOT NULL,
    "type_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "minute_types_pkey" PRIMARY KEY ("type_id")
);

-- CreateTable
CREATE TABLE "meeting_minutes" (
    "minute_id" SERIAL NOT NULL,
    "minute_code" VARCHAR(50) NOT NULL,
    "type_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "class_name" VARCHAR(100) NOT NULL,
    "meeting_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "location" VARCHAR(255),
    "meeting_form" VARCHAR(50),
    "host_name" VARCHAR(100),
    "secretary_name" VARCHAR(100),
    "attendee_summary" TEXT,
    "absentee_summary" TEXT,
    "purpose" TEXT,
    "discussion_content" TEXT NOT NULL,
    "conclusion_content" TEXT,
    "followup_summary" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "meeting_minutes_pkey" PRIMARY KEY ("minute_id")
);

-- CreateTable
CREATE TABLE "minute_tasks" (
    "task_id" SERIAL NOT NULL,
    "minute_id" INTEGER NOT NULL,
    "task_content" TEXT NOT NULL,
    "assigned_to" VARCHAR(100),
    "deadline" DATE,
    "task_status" VARCHAR(20) NOT NULL DEFAULT 'pending',

    CONSTRAINT "minute_tasks_pkey" PRIMARY KEY ("task_id")
);

-- CreateTable
CREATE TABLE "minute_participants" (
    "participant_id" SERIAL NOT NULL,
    "minute_id" INTEGER NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "role_in_meeting" VARCHAR(100),
    "attendance_status" VARCHAR(30) NOT NULL DEFAULT 'present',

    CONSTRAINT "minute_participants_pkey" PRIMARY KEY ("participant_id")
);

-- CreateTable
CREATE TABLE "minute_attachments" (
    "attachment_id" SERIAL NOT NULL,
    "minute_id" INTEGER NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(50),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minute_attachments_pkey" PRIMARY KEY ("attachment_id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "log_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action_name" VARCHAR(100) NOT NULL,
    "target_table" VARCHAR(100),
    "target_id" INTEGER,
    "action_detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "backup_logs" (
    "backup_id" SERIAL NOT NULL,
    "performed_by" INTEGER NOT NULL,
    "action_type" VARCHAR(20) NOT NULL,
    "file_name" VARCHAR(255),
    "file_path" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_logs_pkey" PRIMARY KEY ("backup_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_minutes_minute_code_key" ON "meeting_minutes"("minute_code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "minute_types"("type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minute_tasks" ADD CONSTRAINT "minute_tasks_minute_id_fkey" FOREIGN KEY ("minute_id") REFERENCES "meeting_minutes"("minute_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minute_participants" ADD CONSTRAINT "minute_participants_minute_id_fkey" FOREIGN KEY ("minute_id") REFERENCES "meeting_minutes"("minute_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minute_attachments" ADD CONSTRAINT "minute_attachments_minute_id_fkey" FOREIGN KEY ("minute_id") REFERENCES "meeting_minutes"("minute_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minute_attachments" ADD CONSTRAINT "minute_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_logs" ADD CONSTRAINT "backup_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
