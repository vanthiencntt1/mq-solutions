-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'LOCKED', 'DISPUTED', 'DELETED');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('BV_CONG', 'BV_TU', 'PHONG_KHAM', 'PHONG_MACH', 'XET_NGHIEM');

-- CreateEnum
CREATE TYPE "FacilityStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PayMethod" AS ENUM ('ONLINE', 'AT_FACILITY');

-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('SPECIALTY', 'DOCTOR', 'BOTH');

-- CreateEnum
CREATE TYPE "ObjectType" AS ENUM ('DICH_VU', 'BHYT');

-- CreateEnum
CREATE TYPE "BookingApi" AS ENUM ('PAID', 'UNPAID');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CHO_THANH_TOAN', 'QUA_HAN', 'DA_THANH_TOAN', 'DANG_GUI_HIS', 'LOI_HIS', 'DA_CO_STT', 'DA_KHAM', 'DA_HUY', 'CHO_HOAN_TIEN', 'DA_HOAN_TIEN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'AMOUNT_MISMATCH', 'UNMATCHED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "patient_account" (
    "id" UUID NOT NULL,
    "cccd_enc" TEXT NOT NULL,
    "cccd_hmac" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "full_name_norm" TEXT NOT NULL,
    "birth_year" INTEGER NOT NULL,
    "birth_date" DATE,
    "gender" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_hmac" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address_line" TEXT,
    "insurance_no_enc" TEXT,
    "password_hash" TEXT NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "password_changed_at" TIMESTAMP(3),
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "consent_version" TEXT NOT NULL,
    "consent_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FacilityType" NOT NULL,
    "province_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "hotline" TEXT,
    "working_hours" JSONB NOT NULL,
    "logo_url" TEXT,
    "images" TEXT[],
    "short_desc" TEXT,
    "intro_json" JSONB,
    "api_base_url" TEXT NOT NULL,
    "partner_code" TEXT NOT NULL DEFAULT 'MQ_WEB',
    "secret_ref" TEXT NOT NULL,
    "timeout_ms" INTEGER NOT NULL DEFAULT 5000,
    "health" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "last_ok_at" TIMESTAMP(3),
    "pay_provider" TEXT NOT NULL DEFAULT 'SEPAY',
    "bank_code" TEXT,
    "bank_account_no" TEXT,
    "bank_account_name" TEXT,
    "webhook_key_ref" TEXT,
    "booking_mode" "BookingMode" NOT NULL DEFAULT 'SPECIALTY',
    "allow_bhyt" BOOLEAN NOT NULL DEFAULT false,
    "allow_same_day" BOOLEAN NOT NULL DEFAULT false,
    "pay_options" "PayMethod"[] DEFAULT ARRAY['ONLINE', 'AT_FACILITY']::"PayMethod"[],
    "cancel_cutoff" TEXT NOT NULL DEFAULT 'D-1 15:00',
    "reconcile_time" TEXT NOT NULL DEFAULT '21:00',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "FacilityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "his_id" BIGINT NOT NULL,
    "account_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "ma_bn" TEXT,
    "is_new_patient" BOOLEAN NOT NULL DEFAULT false,
    "specialty_his_id" TEXT NOT NULL,
    "specialty_name" TEXT NOT NULL,
    "doctor_his_id" TEXT,
    "doctor_name" TEXT,
    "room_his_id" INTEGER NOT NULL,
    "room_name" TEXT NOT NULL,
    "exam_date" DATE NOT NULL,
    "slot_his_id" INTEGER,
    "slot_label" TEXT NOT NULL,
    "booking_number" INTEGER NOT NULL,
    "object_type" "ObjectType" NOT NULL,
    "pay_method" "PayMethod" NOT NULL,
    "booking_api" "BookingApi" NOT NULL,
    "amount" DECIMAL(12,0) NOT NULL,
    "status" "AppointmentStatus" NOT NULL,
    "stt" INTEGER,
    "stt_at" TIMESTAMP(3),
    "his_booking_id" TEXT,
    "his_error" TEXT,
    "checked_in_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "cancel_request" BOOLEAN NOT NULL DEFAULT false,
    "reconciled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_event" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "appointment_id" UUID,
    "facility_id" UUID NOT NULL,
    "order_code" TEXT,
    "amount" DECIMAL(12,0) NOT NULL,
    "paid_amount" DECIMAL(12,0),
    "provider" TEXT NOT NULL DEFAULT 'SEPAY',
    "provider_txn_id" TEXT,
    "bank_ref" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "paid_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "refund_ref" TEXT,
    "refund_by" UUID,
    "refund_approved_by" UUID,
    "raw_webhook" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "his_outbox" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "command" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_run_at" TIMESTAMP(3) NOT NULL,
    "done_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "his_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_log" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "job" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconcile_batch" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "exam_date" DATE NOT NULL,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "missing_in_his" INTEGER NOT NULL DEFAULT 0,
    "missing_in_web" INTEGER NOT NULL DEFAULT 0,
    "status_changed" INTEGER NOT NULL DEFAULT 0,
    "amount_diff" INTEGER NOT NULL DEFAULT 0,
    "detail" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "reconcile_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_category" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "cover_url" TEXT,
    "content_json" JSONB NOT NULL,
    "category_id" UUID NOT NULL,
    "tags" TEXT[],
    "facility_ids" TEXT[],
    "specialty_tags" TEXT[],
    "author_name" TEXT,
    "reviewer_name" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "seo_title" TEXT,
    "seo_desc" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_block" (
    "id" UUID NOT NULL,
    "page" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banner" (
    "id" UUID NOT NULL,
    "placement" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_mobile_url" TEXT,
    "title" TEXT,
    "link" TEXT,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popup" (
    "id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "link" TEXT,
    "pages" TEXT[],
    "frequency" TEXT NOT NULL,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "popup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "static_page" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_json" JSONB NOT NULL,
    "version" TEXT NOT NULL,
    "effective_at" TIMESTAMP(3) NOT NULL,
    "require_reconsent" BOOLEAN NOT NULL DEFAULT false,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "static_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_item" (
    "id" UUID NOT NULL,
    "group_name" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "faq_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item" (
    "id" UUID NOT NULL,
    "location" TEXT NOT NULL,
    "parent_id" UUID,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_version" (
    "id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reply" TEXT,
    "show_on_home" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_lead" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "org" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignee" UUID,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "appointment_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignee" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_role" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],

    CONSTRAINT "admin_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "totp_secret_enc" TEXT NOT NULL,
    "role_id" UUID NOT NULL,
    "facility_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_session" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "facility_id" UUID,
    "target" TEXT,
    "diff" JSONB,
    "ip_hash" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_template" (
    "code" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_json" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_template_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "email_log" (
    "id" UUID NOT NULL,
    "template" TEXT NOT NULL,
    "to_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "search_log" (
    "id" UUID NOT NULL,
    "keyword" TEXT NOT NULL,
    "results" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_account_cccd_hmac_key" ON "patient_account"("cccd_hmac");

-- CreateIndex
CREATE INDEX "patient_account_phone_hmac_idx" ON "patient_account"("phone_hmac");

-- CreateIndex
CREATE INDEX "notification_account_id_read_at_idx" ON "notification"("account_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "facility_code_key" ON "facility"("code");

-- CreateIndex
CREATE UNIQUE INDEX "facility_slug_key" ON "facility"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_code_key" ON "appointment"("code");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_his_id_key" ON "appointment"("his_id");

-- CreateIndex
CREATE INDEX "appointment_facility_id_exam_date_idx" ON "appointment"("facility_id", "exam_date");

-- CreateIndex
CREATE INDEX "appointment_account_id_status_idx" ON "appointment"("account_id", "status");

-- CreateIndex
CREATE INDEX "appointment_status_idx" ON "appointment"("status");

-- CreateIndex
CREATE INDEX "appointment_event_appointment_id_at_idx" ON "appointment_event"("appointment_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_appointment_id_key" ON "payment"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_order_code_key" ON "payment"("order_code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_txn_id_key" ON "payment"("provider_txn_id");

-- CreateIndex
CREATE INDEX "payment_facility_id_status_idx" ON "payment"("facility_id", "status");

-- CreateIndex
CREATE INDEX "his_outbox_facility_id_done_at_next_run_at_idx" ON "his_outbox"("facility_id", "done_at", "next_run_at");

-- CreateIndex
CREATE INDEX "sync_log_facility_id_job_at_idx" ON "sync_log"("facility_id", "job", "at");

-- CreateIndex
CREATE UNIQUE INDEX "reconcile_batch_facility_id_exam_date_key" ON "reconcile_batch"("facility_id", "exam_date");

-- CreateIndex
CREATE UNIQUE INDEX "post_category_slug_key" ON "post_category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "post_slug_key" ON "post"("slug");

-- CreateIndex
CREATE INDEX "post_status_published_at_idx" ON "post"("status", "published_at");

-- CreateIndex
CREATE INDEX "page_block_page_status_sort_order_idx" ON "page_block"("page", "status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "static_page_slug_key" ON "static_page"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "media_key_key" ON "media"("key");

-- CreateIndex
CREATE INDEX "content_version_entity_entity_id_created_at_idx" ON "content_version"("entity", "entity_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "review_appointment_id_key" ON "review"("appointment_id");

-- CreateIndex
CREATE INDEX "review_facility_id_status_idx" ON "review"("facility_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_role_name_key" ON "admin_role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_session_token_hash_key" ON "admin_session"("token_hash");

-- CreateIndex
CREATE INDEX "audit_log_module_at_idx" ON "audit_log"("module", "at");

-- CreateIndex
CREATE INDEX "audit_log_facility_id_at_idx" ON "audit_log"("facility_id", "at");

-- CreateIndex
CREATE INDEX "audit_log_actor_type_actor_id_at_idx" ON "audit_log"("actor_type", "actor_id", "at");

-- CreateIndex
CREATE INDEX "email_log_template_created_at_idx" ON "email_log"("template", "created_at");

-- CreateIndex
CREATE INDEX "search_log_keyword_idx" ON "search_log"("keyword");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "patient_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "patient_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_event" ADD CONSTRAINT "appointment_event_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "his_outbox" ADD CONSTRAINT "his_outbox_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "his_outbox" ADD CONSTRAINT "his_outbox_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_log" ADD CONSTRAINT "sync_log_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconcile_batch" ADD CONSTRAINT "reconcile_batch_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "post_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menu_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "patient_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "patient_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user" ADD CONSTRAINT "admin_user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user" ADD CONSTRAINT "admin_user_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_session" ADD CONSTRAINT "admin_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
