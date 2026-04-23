-- ============================================================
-- Migration 0015: offer_document — snapshoty ofert (historia)
--
-- Wpis tworzony przy kliku "📸 Zrób snapshot PDF" (przed wysłaniem)
-- albo przy "Wyślij ofertę" (przyszłe: Resend). Przechowuje migawkę
-- danych oferty (items + client + primaryTent + company + totals)
-- żebyśmy widzieli CO klient dostał, nawet jeśli oferta była potem
-- edytowana.
-- ============================================================

CREATE TABLE IF NOT EXISTS "offer_document" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "offer_id" uuid NOT NULL REFERENCES "offer"("id") ON DELETE CASCADE,
    "snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "note" text,
    "sent_to_email" text,
    "sent_at" timestamp,
    "resend_id" text,
    "created_by" text REFERENCES "user"("id"),
    "created_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "offer_document_offer_id_idx" ON "offer_document" ("offer_id");
CREATE INDEX IF NOT EXISTS "offer_document_created_at_idx" ON "offer_document" ("created_at" DESC);
