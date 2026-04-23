-- ============================================================
-- Migration 0010: app_setting (k-v singletons)
-- Keys: company, contacts, offers (numeracja)
-- ============================================================

CREATE TABLE IF NOT EXISTS "app_setting" (
  "key" text PRIMARY KEY,
  "value" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Seed firmy
INSERT INTO "app_setting" ("key", "value") VALUES
  ('company', jsonb_build_object(
    'name', 'Wolny Namiot',
    'legalName', 'Denis Górski — Max-GSM',
    'nip', '',
    'regon', '',
    'address', 'Jędrzejów, południe Polski',
    'email', 'biuro@wolnynamiot.pl',
    'phone', '+48 690 000 000',
    'website', 'wolnynamiot.pl'
  )),
  ('contacts', jsonb_build_object(
    'replyTo', 'biuro@wolnynamiot.pl',
    'fromName', 'Wolny Namiot',
    'emailSignature', 'Pozdrawiamy,\nZespół Wolny Namiot\nwolnynamiot.pl'
  )),
  ('offers', jsonb_build_object(
    'prefix', 'OFF',
    'year', extract(year from now())::int,
    'nextNumber', 1,
    'validDays', 14
  ))
ON CONFLICT (key) DO NOTHING;

-- Po seedzie: ustaw nextNumber na max istniejący + 1 (jeśli są już jakieś oferty)
UPDATE "app_setting"
SET "value" = jsonb_set(
  "value",
  '{nextNumber}',
  to_jsonb(coalesce((
    SELECT max(cast(split_part(number, '-', 3) as int)) + 1
    FROM "offer"
    WHERE number ~ '^OFF-[0-9]+-[0-9]+$'
  ), 1))
)
WHERE "key" = 'offers';
