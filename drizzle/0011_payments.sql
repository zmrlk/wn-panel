-- ============================================================
-- Migration 0011: payment — płatności per booking
-- Prostota: jedna transakcja = jeden wpis. Summary = SUM(amount_cents).
-- Model biznesowy: głównie płacą przy dispatch/return, rzadko przedpłata.
-- ============================================================

CREATE TABLE IF NOT EXISTS "payment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" uuid NOT NULL REFERENCES "booking"("id") ON DELETE CASCADE,
  "amount_cents" integer NOT NULL CHECK (amount_cents > 0),
  "method" text NOT NULL,          -- 'gotówka' | 'przelew' | 'inne'
  "kind" text NOT NULL DEFAULT 'pełna',  -- 'pełna' | 'dopłata' (zaliczka rzadko, na razie nie wspieramy)
  "paid_at" date NOT NULL DEFAULT CURRENT_DATE,
  "received_by" text REFERENCES "user"("id"),
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_booking ON payment(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_paid_at ON payment(paid_at);
