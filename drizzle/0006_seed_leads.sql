-- ============================================================
-- Migration 0006: Seed leads (CRM funnel demo)
-- ============================================================

INSERT INTO "lead" (name, company, phone, email, source, event_name, event_date_hint, guests_count, venue_hint, message, status, notes, created_at) VALUES
  ('Magdalena Wójcik',  NULL,
    '+48 601 888 999',  'magda.wojcik@gmail.com',
    'website',          'Wesele',
    '2026-07-18',       120,
    'Stodoła k. Kielc', 'Dzień dobry, planujemy wesele na 18 lipca. Interesuje mnie namiot 6x12 + stoły i krzesła dla ok. 120 osób. Proszę o wycenę. Pozdrawiam!',
    'new',              'Świeży lead z formularza. Wesele lipcowe, duży namiot.',
    '2026-04-22 15:12:00'::timestamp),

  ('Piotr Malinowski',  'Firma Malinowski sp. z o.o.',
    '+48 602 123 456',  'p.malinowski@firma.pl',
    'referral',         'Integracja firmowa',
    '2026-06-14',       60,
    'Ogród, Kraków',    'Polecił mnie Pan Nowak (klient z 2025). Potrzebuję namiot na ok. 60 osób, pakiet ze stołami. Termin 14 czerwca, ewentualnie 21.',
    'contacted',        'Zadzwoniłem, wstępnie zainteresowany. Wyślę wycenę jutro.',
    '2026-04-20 09:30:00'::timestamp),

  ('Aleksandra Nowicka', NULL,
    '+48 603 444 555',  'olka.nowicka@wp.pl',
    'facebook',         '40-tka (urodziny)',
    '2026-05-24',       40,
    'Dom, Jędrzejów',   'Widziałam reklamę na FB. Chciałabym namiot 6x3 z montażem na 24 maja. Prywatna impreza, ok. 40 osób. Ile to kosztuje?',
    'qualified',        'Hot lead. Ma budżet 2000 zł, pasuje na Duży 6×12 lub 5×10. Czeka na szczegóły.',
    '2026-04-18 14:45:00'::timestamp),

  ('Jakub Zawada',      'Zawada Events',
    '+48 604 777 888',  'jakub@zawadaevents.pl',
    'phone',            'Festyn rodzinny OSP',
    '2026-06-07',       200,
    'Plac OSP, Pińczów','Współpraca B2B — organizujemy festyn. Potrzebuję 2 × duży namiot 6x12 + 150 krzeseł + stoły + oświetlenie.',
    'quoted',           'Wysłano ofertę 19.04 (wartość 4800 zł). Czeka na decyzję — przypomnieć w tym tygodniu.',
    '2026-04-15 11:00:00'::timestamp),

  ('Karolina Szymańska', NULL,
    '+48 605 111 222',  'szymanska.k@onet.pl',
    'olx',              'Komunia',
    '2026-05-17',       30,
    'Ogród, Busko-Zdrój', 'Znalazłam was przez OLX. Interesuje mnie namiot ekspres 4,5x3 na komunię córki. Termin 17 maja, rano na 1 dzień.',
    'won',              'Podpisała — OFF-2026-0004 accepted. Kaucja wpłacona. Zwycięski lead!',
    '2026-04-12 16:20:00'::timestamp),

  ('Dominika Kubiak',   NULL,
    '+48 606 333 444',  'd.kubiak@gmail.com',
    'website',          'Wesele (szukam ofert)',
    '2026-08-22',       180,
    'Pałac, Warszawa',  'Szukam namiotu na wesele 22 sierpnia, 180 osób. Jaka cena? Mam też ofertę od konkurencji za 6500 zł.',
    'lost',             'Przegrana — za drogo w naszym regionie. Transport do Warszawy podniósł cenę. Odmowa.',
    '2026-04-05 10:00:00'::timestamp)
ON CONFLICT DO NOTHING;
