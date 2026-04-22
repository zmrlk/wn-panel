-- ============================================================
-- Migration 0004: Seed klientów + ofert (demo data)
-- ============================================================

INSERT INTO "client" (name, company, phone, email, notes) VALUES
  ('Katarzyna Kowalska',   NULL,                    '+48 600 100 200', 'kasia.k@gmail.com',       'Polecenie od siostry. Wesele 100 gości.'),
  ('TechStudio sp. z o.o.', 'TechStudio sp. z o.o.', '+48 700 300 400', 'office@techstudio.pl',    'Corpo event firmowy, coroczny.'),
  ('Tomek Nowak',          NULL,                    '+48 800 500 600', 'tomek.n@wp.pl',           '50-tka, rodzinna impreza.'),
  ('Anna Zielińska',       NULL,                    '+48 601 111 222', 'anna.z@gmail.com',        'Lead z Facebooka, jeszcze nie zdecydowana.'),
  ('Film Action Studio',   'Film Action Studio',    '+48 602 222 333', 'produkcja@filmaction.pl', 'Film plenerowy, 3 dni zdjęciowe.')
ON CONFLICT DO NOTHING;

INSERT INTO "offer" (number, client_id, event_name, event_start_date, event_end_date, venue, total_cents, status, sent_at, viewed_at, accepted_at, valid_until, notes) VALUES
  ('OFF-2026-0001',
    (SELECT id FROM "client" WHERE name='Katarzyna Kowalska' LIMIT 1),
    'Wesele Kowalskich',
    '2026-04-25', '2026-04-27',
    'Stodoła u Babci, Chmielnik',
    180000,
    'accepted',
    '2026-04-10 12:00:00', '2026-04-10 14:30:00', '2026-04-12 09:15:00',
    '2026-04-20',
    'Pakiet: Duży 6×12 + stoły. Zaakceptowane, czeka kaucja.'),

  ('OFF-2026-0002',
    (SELECT id FROM "client" WHERE name='TechStudio sp. z o.o.' LIMIT 1),
    'Corpo Event TechStudio 2026',
    '2026-05-01', '2026-05-03',
    'Park Krakowski, Kraków',
    650000,
    'viewed',
    '2026-04-18 09:00:00', '2026-04-19 11:20:00', NULL,
    '2026-04-28',
    '2 namioty 6×12, pełne wyposażenie. Viewed wczoraj, czekam na akcept.'),

  ('OFF-2026-0003',
    (SELECT id FROM "client" WHERE name='Tomek Nowak' LIMIT 1),
    'Urodziny 50 Tomek',
    '2026-05-10', '2026-05-11',
    'Sala OSP Jędrzejów',
    240000,
    'sent',
    '2026-04-20 16:45:00', NULL, NULL,
    '2026-05-05',
    'Wysłane 2 dni temu. Jeszcze nie otworzył.'),

  ('OFF-2026-0004',
    (SELECT id FROM "client" WHERE name='Anna Zielińska' LIMIT 1),
    'Komunia Kasi Z.',
    '2026-05-17', '2026-05-17',
    'Ogród, Kielce',
    50000,
    'draft',
    NULL, NULL, NULL,
    NULL,
    'Draft — czeka na dopytanie o menu.'),

  ('OFF-2026-0005',
    (SELECT id FROM "client" WHERE name='Film Action Studio' LIMIT 1),
    'Film plenerowy "Pod namiotem"',
    '2026-06-05', '2026-06-07',
    'Lasy kieleckie (plener)',
    480000,
    'rejected',
    '2026-04-05 10:00:00', '2026-04-05 10:15:00', NULL,
    '2026-04-15',
    'Odrzucone — ''za drogo, biorą konkurencję''.')
ON CONFLICT (number) DO NOTHING;
