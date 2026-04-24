-- ============================================================
-- Migration 0016: link seed offers ↔ seed bookings
--
-- Naprawa: w seedach (0004 offers, 0007 bookings) oba pliki tworzą
-- te same eventy ale offer.status='sent'/'viewed' bez linkowania
-- do booking. Skutek: jeśli ktoś klikne "Wygrany" na offer 0001/3/4,
-- konwersja stworzy DUPLIKAT bookingu (już seed booking istnieje).
--
-- Tu: linkujemy seed offers do swoich seed bookings (zgodnie z
-- adnotacjami "Konwersja z OFF-XXXX" w booking.notes) +
-- ustawiamy offer.status na 'accepted' żeby UI nie pozwalał
-- ponownie konwertować.
-- ============================================================

UPDATE "offer"
SET status = 'accepted',
    accepted_at = COALESCE(accepted_at, NOW()),
    converted_to_booking_id = (
        SELECT id FROM "booking"
        WHERE event_name = 'Wesele Kowalskich'
          AND start_date = '2026-04-25'
        LIMIT 1
    )
WHERE number = 'OFF-2026-0001'
  AND converted_to_booking_id IS NULL;

UPDATE "offer"
SET status = 'accepted',
    accepted_at = COALESCE(accepted_at, NOW()),
    converted_to_booking_id = (
        SELECT id FROM "booking"
        WHERE event_name = 'Urodziny 50 Tomek'
          AND start_date = '2026-05-10'
        LIMIT 1
    )
WHERE number = 'OFF-2026-0003'
  AND converted_to_booking_id IS NULL;

UPDATE "offer"
SET status = 'accepted',
    accepted_at = COALESCE(accepted_at, NOW()),
    converted_to_booking_id = (
        SELECT id FROM "booking"
        WHERE event_name = 'Komunia Natalii'
          AND start_date = '2026-05-17'
        LIMIT 1
    )
WHERE number = 'OFF-2026-0004'
  AND converted_to_booking_id IS NULL;
