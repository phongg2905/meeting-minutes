ALTER TABLE "users"
ADD COLUMN "password_reset_code_hash" VARCHAR(255),
ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);
