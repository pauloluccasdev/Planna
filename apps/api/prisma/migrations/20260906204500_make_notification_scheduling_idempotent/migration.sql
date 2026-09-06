CREATE UNIQUE INDEX "notifications_student_id_kind_related_type_related_id_scheduled_for_key"
  ON "notifications"("student_id", "kind", "related_type", "related_id", "scheduled_for");
