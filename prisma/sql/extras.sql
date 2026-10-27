-- Bổ sung sau migration khởi tạo (00-DATABASE mục 7) – Prisma không khai báo được các chỉ mục này.

-- unaccent cần bọc IMMUTABLE để dùng trong index
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

CREATE INDEX IF NOT EXISTS facility_name_trgm ON facility USING gin (immutable_unaccent(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS post_title_trgm    ON post     USING gin (immutable_unaccent(title) gin_trgm_ops);

-- Một bệnh nhân chỉ 1 phiếu còn hiệu lực / cơ sở / ngày (khớp lỗi 4014 của PostBooking_Unpaid)
CREATE UNIQUE INDEX IF NOT EXISTS appointment_one_per_day ON appointment (account_id, facility_id, exam_date)
  WHERE status IN ('CHO_THANH_TOAN', 'DA_THANH_TOAN', 'DANG_GUI_HIS', 'LOI_HIS', 'DA_CO_STT');
