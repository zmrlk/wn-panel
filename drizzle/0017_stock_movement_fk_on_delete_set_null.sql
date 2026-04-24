-- v5.58: stock_movement.created_by FK on delete set null
-- Rationale: jeśli user zostanie usunięty (np. offboarding), stock_movement
-- powinien pozostać (audit trail) z created_by = NULL, nie blokować delete.
ALTER TABLE "stock_movement"
  DROP CONSTRAINT IF EXISTS "stock_movement_created_by_fkey";

ALTER TABLE "stock_movement"
  ADD CONSTRAINT "stock_movement_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;
