-- ============================================================
-- Migration 0007: Seed bookings (realne realizacje)
-- ============================================================

INSERT INTO "booking" (client_id, event_name, start_date, end_date, venue, status, price_cents, notes) VALUES
  ((SELECT id FROM "client" WHERE name='Katarzyna Kowalska' LIMIT 1),
    'Wesele Kowalskich',
    '2026-04-25', '2026-04-27',
    'Stodoła u Babci, Chmielnik',
    'confirmed',
    180000,
    'Konwersja z OFF-2026-0001 (accepted). Kaucja 500 zł wpłacona 12.04.'),

  ((SELECT id FROM "client" WHERE name='Tomek Nowak' LIMIT 1),
    'Urodziny 50 Tomek',
    '2026-05-10', '2026-05-11',
    'Sala OSP Jędrzejów',
    'draft',
    240000,
    'Konwersja z OFF-2026-0003. Czeka na potwierdzenie menu.'),

  ((SELECT id FROM "client" WHERE name='Karolina Szymańska' LIMIT 1),
    'Komunia Natalii',
    '2026-05-17', '2026-05-17',
    'Ogród, Busko-Zdrój',
    'confirmed',
    50000,
    'Konwersja z OFF-2026-0004. 1-dniowa impreza, ekspres 4,5×3.'),

  ((SELECT id FROM "client" WHERE name='Katarzyna Kowalska' LIMIT 1),
    'Wesele kuzynki (powrót)',
    '2026-03-15', '2026-03-17',
    'Dom rodzinny, Kielce',
    'done',
    150000,
    'Wykonane w marcu. Klient zadowolony, zostawił opinię 5/5.')
ON CONFLICT DO NOTHING;
