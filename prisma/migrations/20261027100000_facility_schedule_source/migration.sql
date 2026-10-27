-- Nguồn lịch khám theo cơ sở: HIS (DMBSKHAMBENH) hoặc FIXED (khung giờ cố định của web)
CREATE TYPE "ScheduleSource" AS ENUM ('HIS', 'FIXED');

ALTER TABLE "facility"
  ADD COLUMN "schedule_source" "ScheduleSource" NOT NULL DEFAULT 'HIS',
  ADD COLUMN "fixed_schedule" JSONB;
