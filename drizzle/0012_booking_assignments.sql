-- ============================================================
-- Migration 0012: user.skills + booking_assignment
-- Driver Flow Part 1 — kto realizuje booking
-- ============================================================

-- User umiejętności (JSONB array: ['driver', 'installer', 'lead'])
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "skills" jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Przypisania do bookingu (kto, co robi)
CREATE TABLE IF NOT EXISTS "booking_assignment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" uuid NOT NULL REFERENCES "booking"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "task" text NOT NULL,                       -- 'driver' | 'installer' | 'lead' | 'other'
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT booking_assignment_unique UNIQUE (booking_id, user_id, task)
);

CREATE INDEX IF NOT EXISTS idx_assignment_booking ON booking_assignment(booking_id);
CREATE INDEX IF NOT EXISTS idx_assignment_user ON booking_assignment(user_id);

-- Seed: user preview dostaje wszystkie skills (bo to default admin)
UPDATE "user"
SET skills = '["driver","installer","lead"]'::jsonb
WHERE email = 'denis@wolnynamiot.pl' OR id = 'preview';
