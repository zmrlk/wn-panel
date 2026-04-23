-- ============================================================
-- Migration 0009: Seed booking_tent — rezerwacje per booking
-- Żeby dashboard matrix pokazywał realne zajętości
-- ============================================================

-- Wesele Kowalskich 25-27 kwi (confirmed)
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Wesele Kowalskich'),
  (SELECT id FROM tent WHERE name='Namiot 6×12 biały'),
  1
ON CONFLICT DO NOTHING;
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Wesele Kowalskich'),
  (SELECT id FROM tent WHERE name='Stół prostokątny 220×80'),
  10
ON CONFLICT DO NOTHING;
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Wesele Kowalskich'),
  (SELECT id FROM tent WHERE name='Krzesło białe'),
  80
ON CONFLICT DO NOTHING;
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Wesele Kowalskich'),
  (SELECT id FROM tent WHERE name='Oświetlenie LED girlanda'),
  4
ON CONFLICT DO NOTHING;
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Wesele Kowalskich'),
  (SELECT id FROM tent WHERE name='Bok panelowy'),
  6
ON CONFLICT DO NOTHING;
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Wesele Kowalskich'),
  (SELECT id FROM tent WHERE name='Obciążnik betonowy 30kg'),
  12
ON CONFLICT DO NOTHING;

-- Urodziny 50 Tomek 10-11 maja (draft)
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Urodziny 50 Tomek'),
  (SELECT id FROM tent WHERE name='Namiot 5×10 biały'),
  1
ON CONFLICT DO NOTHING;
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Urodziny 50 Tomek'),
  (SELECT id FROM tent WHERE name='Stół prostokątny 220×80'),
  6
ON CONFLICT DO NOTHING;
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Urodziny 50 Tomek'),
  (SELECT id FROM tent WHERE name='Krzesło białe'),
  50
ON CONFLICT DO NOTHING;

-- Komunia Natalii 17 maja (confirmed)
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Komunia Natalii'),
  (SELECT id FROM tent WHERE name='Namiot 6×3 biały'),
  1
ON CONFLICT DO NOTHING;
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Komunia Natalii'),
  (SELECT id FROM tent WHERE name='Stół prostokątny 220×80'),
  4
ON CONFLICT DO NOTHING;
INSERT INTO booking_tent (booking_id, tent_id, quantity)
SELECT
  (SELECT id FROM booking WHERE event_name='Komunia Natalii'),
  (SELECT id FROM tent WHERE name='Krzesło białe'),
  30
ON CONFLICT DO NOTHING;
