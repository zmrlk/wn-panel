-- ============================================================
-- Migration 0005: Magazyn — ruchy magazynowe (stock_movement)
-- Lift z STAGO v2 warehouse_movements (append-only ledger)
-- ============================================================

-- Extension na item
ALTER TABLE "tent" ADD COLUMN IF NOT EXISTS "unit" text NOT NULL DEFAULT 'szt';
ALTER TABLE "tent" ADD COLUMN IF NOT EXISTS "min_qty" integer NOT NULL DEFAULT 0;
ALTER TABLE "tent" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;

-- Ruchy magazynowe (append-only)
CREATE TABLE IF NOT EXISTS "stock_movement" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "item_id" uuid NOT NULL REFERENCES "tent"("id") ON DELETE RESTRICT,
  "direction" text NOT NULL CHECK (direction IN ('IN', 'OUT')),
  "kind" text NOT NULL CHECK (kind IN (
    'zakup', 'zwrot_po_evencie', 'korekta_plus', 'serwis_powrot',
    'wydanie_na_event', 'wydanie_serwis', 'strata', 'korekta_minus'
  )),
  "qty" integer NOT NULL CHECK (qty > 0),
  "price_cents" integer,
  "booking_id" uuid REFERENCES "booking"("id") ON DELETE SET NULL,
  "reason" text,
  "notes" text,
  "created_by" text REFERENCES "user"("id"),
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Direction + kind consistency check
ALTER TABLE "stock_movement" DROP CONSTRAINT IF EXISTS sm_direction_kind_check;
ALTER TABLE "stock_movement" ADD CONSTRAINT sm_direction_kind_check CHECK (
  (direction = 'IN' AND kind IN ('zakup', 'zwrot_po_evencie', 'korekta_plus', 'serwis_powrot')) OR
  (direction = 'OUT' AND kind IN ('wydanie_na_event', 'wydanie_serwis', 'strata', 'korekta_minus'))
);

-- wydanie_na_event wymaga booking_id
ALTER TABLE "stock_movement" DROP CONSTRAINT IF EXISTS sm_wydanie_requires_booking;
ALTER TABLE "stock_movement" ADD CONSTRAINT sm_wydanie_requires_booking CHECK (
  kind != 'wydanie_na_event' OR booking_id IS NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sm_item_time ON "stock_movement"(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sm_kind ON "stock_movement"(kind);
CREATE INDEX IF NOT EXISTS idx_sm_booking ON "stock_movement"(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sm_time ON "stock_movement"(created_at DESC);

-- Trigger: auto-update tent.total_qty on stock_movement INSERT
CREATE OR REPLACE FUNCTION fn_apply_stock_movement() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'IN' THEN
    UPDATE "tent" SET total_qty = total_qty + NEW.qty, updated_at = NOW()
    WHERE id = NEW.item_id;
  ELSE
    UPDATE "tent" SET total_qty = total_qty - NEW.qty, updated_at = NOW()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON "stock_movement";
CREATE TRIGGER trg_apply_stock_movement
  AFTER INSERT ON "stock_movement"
  FOR EACH ROW
  EXECUTE FUNCTION fn_apply_stock_movement();

-- Set min_qty per kategoria (alerty)
UPDATE "tent" SET min_qty = 1 WHERE category = 'Namioty';
UPDATE "tent" SET min_qty = 10 WHERE category = 'Stoły';
UPDATE "tent" SET min_qty = 50 WHERE category = 'Krzesła';
UPDATE "tent" SET min_qty = 5 WHERE category = 'Ławki';
UPDATE "tent" SET min_qty = 2 WHERE category = 'Oświetlenie';
UPDATE "tent" SET min_qty = 5 WHERE category = 'Akcesoria';

-- Seed przykładowe ruchy (historia magazynowa — zakupy + wydania na events)
-- Note: triger aktualizuje total_qty, więc najpierw RESETUJĘ total_qty do 0, potem ruchy
UPDATE "tent" SET total_qty = 0;

-- 1. INITIAL STOCK (zakupy z przeszłości — INBOUND)
INSERT INTO "stock_movement" (item_id, direction, kind, qty, price_cents, reason, notes, created_at)
SELECT id, 'IN', 'zakup', total_qty_initial, NULL, 'Stan początkowy magazynu', 'Migration seed — initial stock',
  '2026-01-15 09:00:00'::timestamp
FROM (VALUES
  ('T-4.5x3-W', 5),
  ('T-6x3-W', 6),
  ('T-4x8-W', 3),
  ('T-5x10-W', 2),
  ('T-6x12-W', 1),
  ('T-4.5x3-G', 2),
  ('S-220x80', 50),
  ('S-KOKT', 10),
  ('C-W', 400),
  ('C-DREW', 120),
  ('L-220', 40),
  ('O-GIRL', 15),
  ('O-REF', 8),
  ('A-BOK', 20),
  ('A-OBC', 32)
) AS stock(sku, total_qty_initial)
JOIN "tent" ON "tent".sku = stock.sku;

-- 2. Ostatnie wydania (na current bookings — OUT)
-- Kowalski 25-27 kwi (wydanie 24 kwi)
INSERT INTO "stock_movement" (item_id, direction, kind, qty, booking_id, reason, created_at)
SELECT "tent".id, 'OUT', 'wydanie_na_event', v.qty,
  (SELECT id FROM booking WHERE event_name='Wesele Kowalskich' LIMIT 1),
  'Wydanie na Wesele Kowalskich', '2026-04-24 08:00:00'::timestamp
FROM (VALUES
  ('T-4.5x3-W', 2),
  ('T-6x3-W', 1),
  ('S-220x80', 10),
  ('C-W', 100),
  ('L-220', 20),
  ('O-GIRL', 3)
) AS v(sku, qty)
JOIN "tent" ON "tent".sku = v.sku;

-- Zwrot po Weselu (IN, 28 kwi) — simulated future
-- (w tym momencie nie wrzucamy, bo chcemy zobaczyć magazyn w akcji)

-- Serwis — namiot 4×8 uszkodzony
INSERT INTO "stock_movement" (item_id, direction, kind, qty, reason, notes, created_at)
SELECT id, 'OUT', 'wydanie_serwis', 1, 'Uszkodzone boki po ostatnim evencie', 'Reklamacja producenta', '2026-04-22 10:30:00'::timestamp
FROM "tent" WHERE sku = 'T-4x8-W';

-- 20 krzeseł drewnianych do serwisu (lakierowanie)
INSERT INTO "stock_movement" (item_id, direction, kind, qty, reason, notes, created_at)
SELECT id, 'OUT', 'wydanie_serwis', 20, 'Odświeżenie lakieru', 'Powrót planowany na 5 maja', '2026-04-22 14:15:00'::timestamp
FROM "tent" WHERE sku = 'C-DREW';

-- Korekta — przy inwentaryzacji brakło 3 obciążników
INSERT INTO "stock_movement" (item_id, direction, kind, qty, reason, created_at)
SELECT id, 'OUT', 'korekta_minus', 3, 'Inwentaryzacja kwietniowa — brak 3 szt.', '2026-04-20 16:00:00'::timestamp
FROM "tent" WHERE sku = 'A-OBC';

-- Zakup nowych girland LED (rozbudowa na sezon)
INSERT INTO "stock_movement" (item_id, direction, kind, qty, price_cents, reason, notes, created_at)
SELECT id, 'IN', 'zakup', 5, 85000, 'Rozbudowa na sezon 2026', 'Dostawca: LED Polska', '2026-04-21 11:00:00'::timestamp
FROM "tent" WHERE sku = 'O-GIRL';
