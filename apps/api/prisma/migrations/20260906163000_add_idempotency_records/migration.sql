CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "operation" VARCHAR(120) NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "result_reference" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "idempotency_records_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "idempotency_records_student_id_operation_idempotency_key_key"
  ON "idempotency_records"("student_id", "operation", "idempotency_key");

CREATE INDEX "idempotency_records_student_id_created_at_idx"
  ON "idempotency_records"("student_id", "created_at");

ALTER TABLE "idempotency_records" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "idempotency_records" FROM anon;
REVOKE ALL ON TABLE "idempotency_records" FROM authenticated;
