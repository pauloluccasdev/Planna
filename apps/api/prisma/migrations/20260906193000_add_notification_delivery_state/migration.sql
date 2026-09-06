ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

ALTER TABLE "notifications"
  ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "next_attempt_at" TIMESTAMPTZ(6);

CREATE INDEX "notifications_status_next_attempt_at_scheduled_for_idx"
  ON "notifications"("status", "next_attempt_at", "scheduled_for");
