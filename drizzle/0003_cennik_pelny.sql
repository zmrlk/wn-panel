-- ============================================================
-- Migration 0003: Pełny cennik z wolny-namiot-site/cennik.json
-- 10 pakietów (zamiast generycznych 4)
-- ============================================================

-- Rozszerz package: includes, area_m2, setup_minutes, delivery_type
ALTER TABLE "package" ADD COLUMN IF NOT EXISTS "includes" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "package" ADD COLUMN IF NOT EXISTS "area_m2" integer;
ALTER TABLE "package" ADD COLUMN IF NOT EXISTS "setup_minutes" integer;
ALTER TABLE "package" ADD COLUMN IF NOT EXISTS "delivery_type" text DEFAULT 'self-pickup';

-- Wywal stare 4 generyczne pakiety
DELETE FROM "package_item";
DELETE FROM "package";

-- Seed 10 pakietów z cennik.json (brutto w groszach)
INSERT INTO "package" (slug, name, description, tier, price_from_cents, price_to_cents, includes_delivery, includes_install, min_guests, max_guests, includes, area_m2, setup_minutes, delivery_type, sort_order) VALUES
  ('eks-4-5x3',     'Ekspres 4,5 × 3 m',                'Namiot popup, odbiór własny, samodzielny montaż.',                  'ekspres',       30000, NULL, false, false, 10, 25, '["namiot","stelaż popup","boki"]'::jsonb,                                                                           14,  15,  'self-pickup',  1),
  ('eks-6x3',       'Ekspres 6 × 3 m',                  'Namiot popup, odbiór własny, samodzielny montaż.',                  'ekspres',       30000, NULL, false, false, 15, 30, '["namiot","stelaż popup","boki"]'::jsonb,                                                                           18,  20,  'self-pickup',  2),
  ('eks-4-5x3-stl', 'Ekspres 4,5 × 3 m + stoły',        'Ekspres + stoły prostokątne i krzesła plastikowe.',                 'ekspres-stoly', 40000, NULL, false, false, 10, 25, '["namiot","boki","stoły prostokątne","krzesła plastikowe"]'::jsonb,                                                 14,  NULL,'self-pickup',  3),
  ('eks-6x3-stl',   'Ekspres 6 × 3 m + stoły',          'Ekspres + stoły prostokątne i krzesła plastikowe.',                 'ekspres-stoly', 80000, NULL, false, false, 15, 30, '["namiot","boki","stoły prostokątne","krzesła plastikowe"]'::jsonb,                                                 18,  NULL,'self-pickup',  4),
  ('duz-4x8',       'Duży 4 × 8 m z montażem',          'My przywozimy, stawiamy, demontujemy.',                             'duze-montaz',  120000, NULL, true,  true,  30, 50, '["namiot","konstrukcja","boki","obciążniki","montaż","demontaż","dowóz regionalny"]'::jsonb,                        32,  120, 'full-service', 5),
  ('duz-5x10',      'Duży 5 × 10 m z montażem',         'My przywozimy, stawiamy, demontujemy.',                             'duze-montaz',  120000, NULL, true,  true,  40, 60, '["namiot","konstrukcja","boki","obciążniki","montaż","demontaż","dowóz regionalny"]'::jsonb,                        50,  180, 'full-service', 6),
  ('duz-6x12',      'Duży 6 × 12 m z montażem',         'My przywozimy, stawiamy, demontujemy.',                             'duze-montaz',  130000, NULL, true,  true,  60, 80, '["namiot","konstrukcja","boki","obciążniki","montaż","demontaż","dowóz regionalny"]'::jsonb,                        72,  240, 'full-service', 7),
  ('duz-4x8-stl',   'Duży 4 × 8 m + stoły i krzesła',   'Pełen pakiet: namiot z montażem + stoły + krzesła + girlandy LED.', 'duze-pelny',   150000, NULL, true,  true,  30, 50, '["namiot","konstrukcja","boki","obciążniki","montaż","demontaż","dowóz","stoły","krzesła","girlandy LED"]'::jsonb,  32,  120, 'full-service', 8),
  ('duz-5x10-stl',  'Duży 5 × 10 m + stoły i krzesła',  'Pełen pakiet: namiot z montażem + stoły + krzesła + girlandy LED.', 'duze-pelny',   160000, NULL, true,  true,  40, 60, '["namiot","konstrukcja","boki","obciążniki","montaż","demontaż","dowóz","stoły","krzesła","girlandy LED"]'::jsonb,  50,  180, 'full-service', 9),
  ('duz-6x12-stl',  'Duży 6 × 12 m + stoły i krzesła',  'Pełen pakiet: namiot z montażem + stoły + krzesła + girlandy LED.', 'duze-pelny',   160000, NULL, true,  true,  60, 80, '["namiot","konstrukcja","boki","obciążniki","montaż","demontaż","dowóz","stoły","krzesła","girlandy LED"]'::jsonb,  72,  240, 'full-service', 10);
