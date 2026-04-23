-- ============================================================
-- Migration 0014: seed email templates do app_setting
-- Kluczowi: email_templates jako JSON z 4 defaults
-- ============================================================

INSERT INTO "app_setting" ("key", "value") VALUES
('email_templates', jsonb_build_object(
  'thank_you', jsonb_build_object(
    'name', 'Dziękujemy za kontakt',
    'subject', 'Dziękujemy za zapytanie — Wolny Namiot',
    'body', E'Cześć {{clientName}},\n\nDzięki za zainteresowanie naszymi namiotami. Otrzymaliśmy Twoje zapytanie o {{eventName}}.\n\nOdezwiemy się w ciągu 24h z konkretami (cennik, dostępność, ewentualne pytania).\n\nMiłego dnia,\nZespół Wolny Namiot\n+48 690 000 000 · wolnynamiot.pl'
  ),
  'offer_sent', jsonb_build_object(
    'name', 'Wysłanie oferty',
    'subject', 'Oferta {{offerNumber}} — {{eventName}}',
    'body', E'Cześć {{clientName}},\n\nZgodnie z rozmową wysyłam ofertę na {{eventName}} ({{eventDateRange}}).\n\nCałość: {{totalValue}} — szczegóły w PDF w załączniku albo pod linkiem:\n{{offerLink}}\n\nOferta ważna do {{validUntil}}. Potrzebujesz czegoś jeszcze albo zmienić zakres? Odezwij się — dopasujemy.\n\nPozdrawiamy,\nZespół Wolny Namiot'
  ),
  'booking_confirmed', jsonb_build_object(
    'name', 'Potwierdzenie rezerwacji',
    'subject', 'Rezerwacja potwierdzona — {{eventName}}',
    'body', E'Cześć {{clientName}},\n\nRezerwacja na {{eventName}} ({{eventDateRange}}) jest potwierdzona.\n\nAdres montażu: {{venue}}\nKwota: {{totalValue}}{{paymentInfo}}\n\nNa 1-2 dni przed eventem zadzwonimy żeby dopiąć szczegóły (godziny dostawy, kontakt na miejscu).\n\nDzięki i do zobaczenia!\nZespół Wolny Namiot'
  ),
  'event_reminder', jsonb_build_object(
    'name', 'Przypomnienie przed eventem',
    'subject', 'Jutro widzimy się na {{eventName}}',
    'body', E'Cześć {{clientName}},\n\nJutro ({{eventDateRange}}) zaczynamy {{eventName}}. Przypomnienie na ostatnią chwilę:\n\n📍 Adres: {{venue}}\n🕐 Dostawa: ustalimy dokładną godzinę rano\n👥 Kierowca: {{driverName}}, tel: {{driverPhone}}\n\nGdyby coś się zmieniło — zadzwoń: +48 690 000 000.\n\nDo zobaczenia!\nZespół Wolny Namiot'
  )
))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
