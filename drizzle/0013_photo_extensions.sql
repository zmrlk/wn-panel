-- ============================================================
-- Migration 0013: photo extensions — kind + taken_by
-- Driver Flow Part 2: kierowca wrzuca zdjęcia z eventu
-- ============================================================

ALTER TABLE "photo" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'general';
-- kind values: 'delivery' | 'return' | 'damage' | 'general'

ALTER TABLE "photo" ADD COLUMN IF NOT EXISTS "taken_by" text REFERENCES "user"("id");

CREATE INDEX IF NOT EXISTS idx_photo_booking ON photo(booking_id);
CREATE INDEX IF NOT EXISTS idx_photo_kind ON photo(kind);
