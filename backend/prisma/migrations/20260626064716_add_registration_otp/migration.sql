-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "register_otp_expires_at" TIMESTAMP(3),
ADD COLUMN     "register_otp_hash" VARCHAR(255);
