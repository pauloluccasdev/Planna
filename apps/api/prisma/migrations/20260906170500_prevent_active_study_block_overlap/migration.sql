CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "study_blocks"
ADD CONSTRAINT "study_blocks_no_active_overlap"
EXCLUDE USING gist (
  "student_id" WITH =,
  tstzrange("starts_at", "ends_at", '[)') WITH &&
)
WHERE (
  "status" IN ('CONFIRMED', 'IN_PROGRESS', 'PAUSED', 'OVERDUE')
)
DEFERRABLE INITIALLY DEFERRED;
