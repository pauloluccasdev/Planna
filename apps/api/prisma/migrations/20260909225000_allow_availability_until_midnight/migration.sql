ALTER TABLE "availability_intervals"
  DROP CONSTRAINT "availability_time_order";

ALTER TABLE "availability_intervals"
  ADD CONSTRAINT "availability_time_order"
  CHECK (
    "start_local_time" < "end_local_time"
    OR (
      "end_local_time" = TIME '00:00:00'
      AND "start_local_time" > TIME '00:00:00'
    )
  );
