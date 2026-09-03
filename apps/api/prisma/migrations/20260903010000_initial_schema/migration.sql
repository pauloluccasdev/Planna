-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventContentsStatus" AS ENUM ('INFORMED', 'NOT_INFORMED_YET');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PROCESSING', 'READY', 'REVIEWING', 'CONFIRMED', 'DISCARDED', 'FAILED');

-- CreateEnum
CREATE TYPE "DiagnosticKind" AS ENUM ('CAPACITY_DEFICIT', 'MISSING_ESTIMATE', 'UNKNOWN_EVENT_CONTENTS');

-- CreateEnum
CREATE TYPE "BlockSource" AS ENUM ('MANUAL', 'AUTOMATIC', 'REPLANNED');

-- CreateEnum
CREATE TYPE "BlockStatus" AS ENUM ('CONFIRMED', 'IN_PROGRESS', 'PAUSED', 'OVERDUE', 'COMPLETED', 'CANCELLED', 'REPLANNED');

-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('PLANNED', 'UNPLANNED', 'RETROACTIVE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('RUNNING', 'PAUSED', 'COMPLETED', 'NEEDS_RECONCILIATION');

-- CreateEnum
CREATE TYPE "SessionSegmentKind" AS ENUM ('FOCUS', 'POMODORO_BREAK');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('GENERATED', 'EDITING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SuggestionGenerationKind" AS ENUM ('AUTOMATIC_FIRST', 'STUDENT_REQUESTED');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('STUDY_BLOCK_REMINDER', 'ACADEMIC_EVENT_REMINDER', 'RISK_ALERT', 'OVERDUE_BLOCK', 'REPLANNING_SUGGESTION');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SCHEDULED', 'SENT', 'FAILED', 'CANCELLED', 'READ');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY');

-- CreateTable
CREATE TABLE "user_accounts" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "username_normalized" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_normalized" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ(6),
    "blocked_at" TIMESTAMPTZ(6),
    "blocked_by_user_id" UUID,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_periods" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "position" INTEGER,
    "starts_on" DATE,
    "ends_on" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "academic_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "academic_period_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL,
    "estimated_duration_seconds" INTEGER,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_parts" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "content_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_event_types" (
    "id" UUID NOT NULL,
    "student_id" UUID,
    "name" VARCHAR(80) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_events" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "event_type_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "contents_status" "EventContentsStatus" NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "academic_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_event_contents" (
    "academic_event_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,

    CONSTRAINT "academic_event_contents_pkey" PRIMARY KEY ("academic_event_id","content_id")
);

-- CreateTable
CREATE TABLE "availability_intervals" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_local_time" TIME(0) NOT NULL,
    "end_local_time" TIME(0) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "availability_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pomodoro_preferences" (
    "student_id" UUID NOT NULL,
    "focus_seconds" INTEGER NOT NULL,
    "break_seconds" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pomodoro_preferences_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "planning_proposals" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "status" "ProposalStatus" NOT NULL,
    "algorithm_version" VARCHAR(40) NOT NULL,
    "parameters_snapshot" JSONB NOT NULL,
    "input_version" VARCHAR(128) NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "failure_code" VARCHAR(80),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "planning_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_courses" (
    "proposal_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,

    CONSTRAINT "proposal_courses_pkey" PRIMARY KEY ("proposal_id","course_id")
);

-- CreateTable
CREATE TABLE "proposal_subjects" (
    "proposal_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,

    CONSTRAINT "proposal_subjects_pkey" PRIMARY KEY ("proposal_id","subject_id")
);

-- CreateTable
CREATE TABLE "proposed_study_blocks" (
    "id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "planned_duration_seconds" INTEGER NOT NULL,
    "focus_seconds" INTEGER NOT NULL,
    "break_seconds" INTEGER NOT NULL,
    "explanation_factors" JSONB NOT NULL,
    "source_overdue_block_id" UUID,
    "removed_at" TIMESTAMPTZ(6),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "proposed_study_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposed_block_parts" (
    "proposed_block_id" UUID NOT NULL,
    "content_part_id" UUID NOT NULL,

    CONSTRAINT "proposed_block_parts_pkey" PRIMARY KEY ("proposed_block_id","content_part_id")
);

-- CreateTable
CREATE TABLE "proposal_diagnostics" (
    "id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "kind" "DiagnosticKind" NOT NULL,
    "course_id" UUID,
    "subject_id" UUID,
    "content_id" UUID,
    "academic_event_id" UUID,
    "required_seconds" INTEGER,
    "available_seconds" INTEGER,
    "deficit_seconds" INTEGER,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_diagnostics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurrence_series" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL DEFAULT 'DAILY',
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recurrence_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_blocks" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "proposal_id" UUID,
    "proposed_block_id" UUID,
    "recurrence_series_id" UUID,
    "source" "BlockSource" NOT NULL,
    "status" "BlockStatus" NOT NULL DEFAULT 'CONFIRMED',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "planned_duration_seconds" INTEGER NOT NULL,
    "focus_seconds" INTEGER NOT NULL,
    "break_seconds" INTEGER NOT NULL,
    "replaces_block_id" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "study_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_block_parts" (
    "study_block_id" UUID NOT NULL,
    "content_part_id" UUID NOT NULL,

    CONSTRAINT "study_block_parts_pkey" PRIMARY KEY ("study_block_id","content_part_id")
);

-- CreateTable
CREATE TABLE "study_block_versions" (
    "id" UUID NOT NULL,
    "study_block_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_user_id" UUID NOT NULL,
    "change_reason" VARCHAR(120),
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "study_block_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "study_block_id" UUID,
    "kind" "SessionKind" NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "ended_at" TIMESTAMPTZ(6),
    "focus_duration_seconds" INTEGER,
    "pomodoro_break_duration_seconds" INTEGER,
    "realized_duration_seconds" INTEGER,
    "note" TEXT,
    "reconciled_at" TIMESTAMPTZ(6),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_session_segments" (
    "id" UUID NOT NULL,
    "study_session_id" UUID NOT NULL,
    "kind" "SessionSegmentKind" NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "ended_at" TIMESTAMPTZ(6),
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "study_session_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_session_completed_parts" (
    "study_session_id" UUID NOT NULL,
    "content_part_id" UUID NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_session_completed_parts_pkey" PRIMARY KEY ("study_session_id","content_part_id")
);

-- CreateTable
CREATE TABLE "replanning_suggestions" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "overdue_block_id" UUID NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'GENERATED',
    "generation_kind" "SuggestionGenerationKind" NOT NULL,
    "suggested_starts_at" TIMESTAMPTZ(6) NOT NULL,
    "suggested_ends_at" TIMESTAMPTZ(6) NOT NULL,
    "suggested_duration_seconds" INTEGER NOT NULL,
    "explanation_factors" JSONB NOT NULL,
    "edited_at" TIMESTAMPTZ(6),
    "decided_at" TIMESTAMPTZ(6),
    "created_block_id" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "replanning_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "auth_secret" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "last_success_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "related_type" VARCHAR(80),
    "related_id" UUID,
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sent_at" TIMESTAMPTZ(6),
    "failure_code" VARCHAR(80),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "student_scope_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_username_normalized_key" ON "user_accounts"("username_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_email_normalized_key" ON "user_accounts"("email_normalized");

-- CreateIndex
CREATE INDEX "courses_student_id_status_idx" ON "courses"("student_id", "status");

-- CreateIndex
CREATE INDEX "academic_periods_course_id_position_idx" ON "academic_periods"("course_id", "position");

-- CreateIndex
CREATE INDEX "subjects_student_id_course_id_status_idx" ON "subjects"("student_id", "course_id", "status");

-- CreateIndex
CREATE INDEX "subjects_academic_period_id_idx" ON "subjects"("academic_period_id");

-- CreateIndex
CREATE INDEX "contents_student_id_subject_id_archived_at_idx" ON "contents"("student_id", "subject_id", "archived_at");

-- CreateIndex
CREATE INDEX "content_parts_student_id_idx" ON "content_parts"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_parts_content_id_position_key" ON "content_parts"("content_id", "position");

-- CreateIndex
CREATE INDEX "academic_event_types_student_id_archived_at_idx" ON "academic_event_types"("student_id", "archived_at");

-- CreateIndex
CREATE INDEX "academic_events_student_id_starts_at_idx" ON "academic_events"("student_id", "starts_at");

-- CreateIndex
CREATE INDEX "academic_events_subject_id_idx" ON "academic_events"("subject_id");

-- CreateIndex
CREATE INDEX "academic_event_contents_content_id_idx" ON "academic_event_contents"("content_id");

-- CreateIndex
CREATE INDEX "availability_intervals_student_id_weekday_start_local_time_idx" ON "availability_intervals"("student_id", "weekday", "start_local_time");

-- CreateIndex
CREATE INDEX "planning_proposals_student_id_status_requested_at_idx" ON "planning_proposals"("student_id", "status", "requested_at");

-- CreateIndex
CREATE INDEX "proposal_courses_course_id_idx" ON "proposal_courses"("course_id");

-- CreateIndex
CREATE INDEX "proposal_subjects_subject_id_idx" ON "proposal_subjects"("subject_id");

-- CreateIndex
CREATE INDEX "proposed_study_blocks_proposal_id_starts_at_idx" ON "proposed_study_blocks"("proposal_id", "starts_at");

-- CreateIndex
CREATE INDEX "proposed_study_blocks_student_id_idx" ON "proposed_study_blocks"("student_id");

-- CreateIndex
CREATE INDEX "proposed_study_blocks_content_id_idx" ON "proposed_study_blocks"("content_id");

-- CreateIndex
CREATE INDEX "proposed_block_parts_content_part_id_idx" ON "proposed_block_parts"("content_part_id");

-- CreateIndex
CREATE INDEX "proposal_diagnostics_proposal_id_kind_idx" ON "proposal_diagnostics"("proposal_id", "kind");

-- CreateIndex
CREATE INDEX "recurrence_series_student_id_starts_on_ends_on_idx" ON "recurrence_series"("student_id", "starts_on", "ends_on");

-- CreateIndex
CREATE UNIQUE INDEX "study_blocks_proposed_block_id_key" ON "study_blocks"("proposed_block_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_blocks_replaces_block_id_key" ON "study_blocks"("replaces_block_id");

-- CreateIndex
CREATE INDEX "study_blocks_student_id_starts_at_ends_at_status_idx" ON "study_blocks"("student_id", "starts_at", "ends_at", "status");

-- CreateIndex
CREATE INDEX "study_blocks_content_id_status_starts_at_idx" ON "study_blocks"("content_id", "status", "starts_at");

-- CreateIndex
CREATE INDEX "study_blocks_proposal_id_idx" ON "study_blocks"("proposal_id");

-- CreateIndex
CREATE INDEX "study_blocks_recurrence_series_id_idx" ON "study_blocks"("recurrence_series_id");

-- CreateIndex
CREATE INDEX "study_block_parts_content_part_id_idx" ON "study_block_parts"("content_part_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_block_versions_study_block_id_version_number_key" ON "study_block_versions"("study_block_id", "version_number");

-- CreateIndex
CREATE INDEX "study_sessions_student_id_status_idx" ON "study_sessions"("student_id", "status");

-- CreateIndex
CREATE INDEX "study_sessions_content_id_started_at_idx" ON "study_sessions"("content_id", "started_at");

-- CreateIndex
CREATE INDEX "study_sessions_study_block_id_idx" ON "study_sessions"("study_block_id");

-- CreateIndex
CREATE INDEX "study_session_segments_study_session_id_ended_at_idx" ON "study_session_segments"("study_session_id", "ended_at");

-- CreateIndex
CREATE UNIQUE INDEX "study_session_segments_study_session_id_sequence_key" ON "study_session_segments"("study_session_id", "sequence");

-- CreateIndex
CREATE INDEX "study_session_completed_parts_content_part_id_idx" ON "study_session_completed_parts"("content_part_id");

-- CreateIndex
CREATE UNIQUE INDEX "replanning_suggestions_created_block_id_key" ON "replanning_suggestions"("created_block_id");

-- CreateIndex
CREATE INDEX "replanning_suggestions_student_id_status_created_at_idx" ON "replanning_suggestions"("student_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "replanning_suggestions_overdue_block_id_status_idx" ON "replanning_suggestions"("overdue_block_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_student_id_revoked_at_idx" ON "push_subscriptions"("student_id", "revoked_at");

-- CreateIndex
CREATE INDEX "notifications_student_id_status_scheduled_for_idx" ON "notifications"("student_id", "status", "scheduled_for");

-- CreateIndex
CREATE INDEX "audit_events_actor_user_id_occurred_at_idx" ON "audit_events"("actor_user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_events_student_scope_id_occurred_at_idx" ON "audit_events"("student_scope_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_blocked_by_user_id_fkey" FOREIGN KEY ("blocked_by_user_id") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_periods" ADD CONSTRAINT "academic_periods_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_parts" ADD CONSTRAINT "content_parts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_parts" ADD CONSTRAINT "content_parts_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_event_types" ADD CONSTRAINT "academic_event_types_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_events" ADD CONSTRAINT "academic_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_events" ADD CONSTRAINT "academic_events_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_events" ADD CONSTRAINT "academic_events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "academic_event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_event_contents" ADD CONSTRAINT "academic_event_contents_academic_event_id_fkey" FOREIGN KEY ("academic_event_id") REFERENCES "academic_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_event_contents" ADD CONSTRAINT "academic_event_contents_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_intervals" ADD CONSTRAINT "availability_intervals_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pomodoro_preferences" ADD CONSTRAINT "pomodoro_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_proposals" ADD CONSTRAINT "planning_proposals_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_courses" ADD CONSTRAINT "proposal_courses_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "planning_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_courses" ADD CONSTRAINT "proposal_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_subjects" ADD CONSTRAINT "proposal_subjects_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "planning_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_subjects" ADD CONSTRAINT "proposal_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposed_study_blocks" ADD CONSTRAINT "proposed_study_blocks_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "planning_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposed_study_blocks" ADD CONSTRAINT "proposed_study_blocks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposed_study_blocks" ADD CONSTRAINT "proposed_study_blocks_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposed_study_blocks" ADD CONSTRAINT "proposed_study_blocks_source_overdue_block_id_fkey" FOREIGN KEY ("source_overdue_block_id") REFERENCES "study_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposed_block_parts" ADD CONSTRAINT "proposed_block_parts_proposed_block_id_fkey" FOREIGN KEY ("proposed_block_id") REFERENCES "proposed_study_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposed_block_parts" ADD CONSTRAINT "proposed_block_parts_content_part_id_fkey" FOREIGN KEY ("content_part_id") REFERENCES "content_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_diagnostics" ADD CONSTRAINT "proposal_diagnostics_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "planning_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_blocks" ADD CONSTRAINT "study_blocks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_blocks" ADD CONSTRAINT "study_blocks_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_blocks" ADD CONSTRAINT "study_blocks_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "planning_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_blocks" ADD CONSTRAINT "study_blocks_proposed_block_id_fkey" FOREIGN KEY ("proposed_block_id") REFERENCES "proposed_study_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_blocks" ADD CONSTRAINT "study_blocks_recurrence_series_id_fkey" FOREIGN KEY ("recurrence_series_id") REFERENCES "recurrence_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_blocks" ADD CONSTRAINT "study_blocks_replaces_block_id_fkey" FOREIGN KEY ("replaces_block_id") REFERENCES "study_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_block_parts" ADD CONSTRAINT "study_block_parts_study_block_id_fkey" FOREIGN KEY ("study_block_id") REFERENCES "study_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_block_parts" ADD CONSTRAINT "study_block_parts_content_part_id_fkey" FOREIGN KEY ("content_part_id") REFERENCES "content_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_block_versions" ADD CONSTRAINT "study_block_versions_study_block_id_fkey" FOREIGN KEY ("study_block_id") REFERENCES "study_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_study_block_id_fkey" FOREIGN KEY ("study_block_id") REFERENCES "study_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_session_segments" ADD CONSTRAINT "study_session_segments_study_session_id_fkey" FOREIGN KEY ("study_session_id") REFERENCES "study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_session_completed_parts" ADD CONSTRAINT "study_session_completed_parts_study_session_id_fkey" FOREIGN KEY ("study_session_id") REFERENCES "study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_session_completed_parts" ADD CONSTRAINT "study_session_completed_parts_content_part_id_fkey" FOREIGN KEY ("content_part_id") REFERENCES "content_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanning_suggestions" ADD CONSTRAINT "replanning_suggestions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanning_suggestions" ADD CONSTRAINT "replanning_suggestions_overdue_block_id_fkey" FOREIGN KEY ("overdue_block_id") REFERENCES "study_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanning_suggestions" ADD CONSTRAINT "replanning_suggestions_created_block_id_fkey" FOREIGN KEY ("created_block_id") REFERENCES "study_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain constraints not expressible in the Prisma schema.
ALTER TABLE "contents"
  ADD CONSTRAINT "contents_priority_range" CHECK ("priority" BETWEEN 1 AND 5),
  ADD CONSTRAINT "contents_estimated_duration_positive" CHECK ("estimated_duration_seconds" IS NULL OR "estimated_duration_seconds" > 0);

ALTER TABLE "academic_periods"
  ADD CONSTRAINT "academic_periods_date_order" CHECK ("starts_on" IS NULL OR "ends_on" IS NULL OR "starts_on" <= "ends_on");

ALTER TABLE "academic_events"
  ADD CONSTRAINT "academic_events_time_order" CHECK ("ends_at" IS NULL OR "starts_at" < "ends_at");

ALTER TABLE "availability_intervals"
  ADD CONSTRAINT "availability_weekday_range" CHECK ("weekday" BETWEEN 0 AND 6),
  ADD CONSTRAINT "availability_time_order" CHECK ("start_local_time" < "end_local_time");

ALTER TABLE "pomodoro_preferences"
  ADD CONSTRAINT "pomodoro_focus_positive" CHECK ("focus_seconds" > 0),
  ADD CONSTRAINT "pomodoro_break_positive" CHECK ("break_seconds" > 0);

ALTER TABLE "planning_proposals"
  ADD CONSTRAINT "planning_proposals_period_order" CHECK ("period_start" < "period_end"),
  ADD CONSTRAINT "planning_proposals_revision_positive" CHECK ("revision" > 0);

ALTER TABLE "proposed_study_blocks"
  ADD CONSTRAINT "proposed_study_blocks_time_order" CHECK ("starts_at" < "ends_at"),
  ADD CONSTRAINT "proposed_study_blocks_duration_positive" CHECK ("planned_duration_seconds" > 0),
  ADD CONSTRAINT "proposed_study_blocks_pomodoro_positive" CHECK ("focus_seconds" > 0 AND "break_seconds" > 0),
  ADD CONSTRAINT "proposed_study_blocks_revision_positive" CHECK ("revision" > 0);

ALTER TABLE "recurrence_series"
  ADD CONSTRAINT "recurrence_series_date_order" CHECK ("starts_on" <= "ends_on");

ALTER TABLE "study_blocks"
  ADD CONSTRAINT "study_blocks_time_order" CHECK ("starts_at" < "ends_at"),
  ADD CONSTRAINT "study_blocks_duration_positive" CHECK ("planned_duration_seconds" > 0),
  ADD CONSTRAINT "study_blocks_pomodoro_positive" CHECK ("focus_seconds" > 0 AND "break_seconds" > 0),
  ADD CONSTRAINT "study_blocks_not_self_replacing" CHECK ("replaces_block_id" IS NULL OR "replaces_block_id" <> "id"),
  ADD CONSTRAINT "study_blocks_revision_positive" CHECK ("revision" > 0);

ALTER TABLE "study_sessions"
  ADD CONSTRAINT "study_sessions_time_order" CHECK ("ended_at" IS NULL OR "started_at" <= "ended_at"),
  ADD CONSTRAINT "study_sessions_durations_non_negative" CHECK (
    COALESCE("focus_duration_seconds", 0) >= 0
    AND COALESCE("pomodoro_break_duration_seconds", 0) >= 0
    AND COALESCE("realized_duration_seconds", 0) >= 0
  ),
  ADD CONSTRAINT "study_sessions_revision_positive" CHECK ("revision" > 0);

ALTER TABLE "study_session_segments"
  ADD CONSTRAINT "study_session_segments_time_order" CHECK ("ended_at" IS NULL OR "started_at" <= "ended_at"),
  ADD CONSTRAINT "study_session_segments_sequence_positive" CHECK ("sequence" > 0);

ALTER TABLE "replanning_suggestions"
  ADD CONSTRAINT "replanning_suggestions_time_order" CHECK ("suggested_starts_at" < "suggested_ends_at"),
  ADD CONSTRAINT "replanning_suggestions_duration_positive" CHECK ("suggested_duration_seconds" > 0),
  ADD CONSTRAINT "replanning_suggestions_revision_positive" CHECK ("revision" > 0);

-- Concurrency invariants.
CREATE UNIQUE INDEX "study_sessions_one_running_per_student"
  ON "study_sessions" ("student_id")
  WHERE "status" = 'RUNNING';

CREATE UNIQUE INDEX "study_session_segments_one_open_per_session"
  ON "study_session_segments" ("study_session_id")
  WHERE "ended_at" IS NULL;

CREATE UNIQUE INDEX "replanning_suggestions_one_automatic_first"
  ON "replanning_suggestions" ("overdue_block_id")
  WHERE "generation_kind" = 'AUTOMATIC_FIRST';

-- The NestJS API is the sole data boundary. Keep Supabase Data API roles out.
ALTER TABLE "user_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "academic_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "academic_event_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "academic_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "academic_event_contents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "availability_intervals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pomodoro_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "planning_proposals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proposal_courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proposal_subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proposed_study_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proposed_block_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proposal_diagnostics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurrence_series" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_block_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_block_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_session_segments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_session_completed_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "replanning_suggestions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
  END IF;
END
$$;
