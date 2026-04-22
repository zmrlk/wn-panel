-- ============================================================
-- Migration 0002: Rozbudowa item (tent) + pakiety
-- ============================================================

-- ─── item (rename kolumn tent → generic item) ──────────────
ALTER TABLE "tent" ADD COLUMN IF NOT EXISTS "sku" text UNIQUE;
ALTER TABLE "tent" ADD COLUMN IF NOT EXISTS "item_type" text NOT NULL DEFAULT 'tent';
ALTER TABLE "tent" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "tent" ADD COLUMN IF NOT EXISTS "total_qty" integer NOT NULL DEFAULT 1;
ALTER TABLE "tent" ADD COLUMN IF NOT EXISTS "price_per_day_cents" integer;
ALTER TABLE "tent" ALTER COLUMN "size_label" DROP NOT NULL;

-- Copy "type" → "item_type" if exists, then drop type
UPDATE "tent" SET "item_type" = "type" WHERE "type" IS NOT NULL;
ALTER TABLE "tent" DROP COLUMN IF EXISTS "type";

-- ─── package ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "package" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "tier" text NOT NULL,
  "price_from_cents" integer NOT NULL,
  "price_to_cents" integer,
  "includes_delivery" boolean NOT NULL DEFAULT false,
  "includes_install" boolean NOT NULL DEFAULT false,
  "min_guests" integer,
  "max_guests" integer,
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ─── package_item ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "package_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "package_id" uuid NOT NULL REFERENCES "package"("id") ON DELETE CASCADE,
  "tent_id" uuid REFERENCES "tent"("id"),
  "custom_label" text,
  "quantity" integer NOT NULL DEFAULT 1,
  "sort_order" integer NOT NULL DEFAULT 0
);

-- ─── Seed itemów z asortymentu wolnynamiot.pl ──────────────
INSERT INTO "tent" (sku, name, item_type, category, size_label, width_m, length_m, color, total_qty, status, price_per_day_cents, notes)
VALUES
  ('T-4.5x3-W',  'Namiot 4,5×3 biały',         'tent',       'Namioty',      '4,5×3 m',   5,  3,   'biały',  5,   'available', 25000,  'Ekspresowy'),
  ('T-6x3-W',    'Namiot 6×3 biały',           'tent',       'Namioty',      '6×3 m',     6,  3,   'biały',  6,   'available', 30000,  'Ekspresowy'),
  ('T-4x8-W',    'Namiot 4×8 biały',           'tent',       'Namioty',      '4×8 m',     4,  8,   'biały',  3,   'available', 80000,  'Wymaga montażu'),
  ('T-5x10-W',   'Namiot 5×10 biały',          'tent',       'Namioty',      '5×10 m',    5,  10,  'biały',  2,   'available', 100000, 'Wymaga montażu'),
  ('T-6x12-W',   'Namiot 6×12 biały',          'tent',       'Namioty',      '6×12 m',    6,  12,  'biały',  1,   'available', 130000, 'Wymaga montażu'),
  ('T-4.5x3-G',  'Namiot 4,5×3 szary',         'tent',       'Namioty',      '4,5×3 m',   5,  3,   'szary',  2,   'available', 28000,  'Ekspresowy'),
  ('S-220x80',   'Stół prostokątny 220×80',    'table',      'Stoły',        '220×80 cm', NULL, NULL, NULL,   50,  'available', 2500,   NULL),
  ('S-KOKT',     'Stół koktajlowy',            'table',      'Stoły',        'Ø60 cm',    NULL, NULL, NULL,   10,  'available', 3500,   NULL),
  ('C-W',        'Krzesło białe',              'chair',      'Krzesła',      NULL,        NULL, NULL, 'biały', 400, 'available', 500,    NULL),
  ('C-DREW',     'Krzesło drewniane',          'chair',      'Krzesła',      NULL,        NULL, NULL, 'drewno', 120,'available', 700,    NULL),
  ('L-220',      'Ławka 220 cm',               'bench',      'Ławki',        '220 cm',    NULL, NULL, NULL,   40,  'available', 1500,   NULL),
  ('O-GIRL',     'Oświetlenie LED girlanda',   'light',      'Oświetlenie',  '10m',       NULL, NULL, NULL,   15,  'available', 4000,   NULL),
  ('O-REF',      'Reflektor LED 50W',          'light',      'Oświetlenie',  NULL,        NULL, NULL, NULL,   8,   'available', 5000,   NULL),
  ('A-BOK',      'Bok panelowy',               'accessory',  'Akcesoria',    '3×2 m',     NULL, NULL, NULL,   20,  'available', 2000,   NULL),
  ('A-OBC',      'Obciążnik betonowy 30kg',    'accessory',  'Akcesoria',    NULL,        NULL, NULL, NULL,   32,  'available', 1000,   NULL)
ON CONFLICT (sku) DO NOTHING;

-- ─── Seed pakietów (4 tier'y z wolnynamiot.pl) ─────────────
INSERT INTO "package" (slug, name, description, tier, price_from_cents, price_to_cents, includes_delivery, includes_install, min_guests, max_guests, sort_order) VALUES
  ('ekspres',
    'Namiot ekspresowy',
    'Odbiór własny, samodzielny montaż. Idealne na małe imprezy, grille, urodziny w ogrodzie.',
    'ekspres',       20000, 30000, false, false, 10, 30, 1),
  ('ekspres-stoly',
    'Ekspres + stoły',
    'Odbiór własny + komplet stołów i ławek. Wszystko gotowe do ustawienia.',
    'ekspres-stoly', 40000, 80000, false, false, 20, 50, 2),
  ('duze-montaz',
    'Duży namiot z montażem',
    'Namiot 4×8, 5×10 lub 6×12. Dostawa i montaż w cenie. Dla większych wesel i eventów.',
    'duze-montaz',  120000, 130000, true, true, 40, 100, 3),
  ('duze-pelny',
    'Pełny pakiet',
    'Namiot duży + komplet stołów, ławek, oświetlenia. Dostawa i montaż. Wszystko, czego potrzebujesz.',
    'duze-pelny',   150000, 160000, true, true, 50, 150, 4)
ON CONFLICT (slug) DO NOTHING;
