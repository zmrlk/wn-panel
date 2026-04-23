-- ============================================================
-- Migration 0008: Seed package_items — mapowanie pakietów na konkretne przedmioty z magazynu
-- Dzięki temu klik pakietu w kalkulatorze = auto prefill pozycji oferty
-- ============================================================

-- EKSPRES 4.5×3 (samodzielny montaż, odbiór własny)
INSERT INTO "package_item" (package_id, tent_id, quantity, sort_order)
SELECT p.id, i.id, 1, 1
FROM "package" p, "tent" i
WHERE p.slug = 'eks-4-5x3' AND i.sku = 'T-4.5x3-W'
ON CONFLICT DO NOTHING;

-- EKSPRES 6×3
INSERT INTO "package_item" (package_id, tent_id, quantity, sort_order)
SELECT p.id, i.id, 1, 1
FROM "package" p, "tent" i
WHERE p.slug = 'eks-6x3' AND i.sku = 'T-6x3-W'
ON CONFLICT DO NOTHING;

-- EKSPRES 4.5×3 + STOŁY (namiot + 3 stoły + 20 krzeseł)
INSERT INTO "package_item" (package_id, tent_id, quantity, sort_order)
SELECT p.id, i.id, q, so FROM "package" p, "tent" i,
  (VALUES ('T-4.5x3-W', 1, 1), ('S-220x80', 3, 2), ('C-W', 20, 3)) AS x(sku, q, so)
WHERE p.slug = 'eks-4-5x3-stl' AND i.sku = x.sku
ON CONFLICT DO NOTHING;

-- EKSPRES 6×3 + STOŁY (namiot + 5 stołów + 30 krzeseł)
INSERT INTO "package_item" (package_id, tent_id, quantity, sort_order)
SELECT p.id, i.id, q, so FROM "package" p, "tent" i,
  (VALUES ('T-6x3-W', 1, 1), ('S-220x80', 5, 2), ('C-W', 30, 3)) AS x(sku, q, so)
WHERE p.slug = 'eks-6x3-stl' AND i.sku = x.sku
ON CONFLICT DO NOTHING;

-- DUŻY 4×8 Z MONTAŻEM (namiot + boki + obciążniki)
INSERT INTO "package_item" (package_id, tent_id, quantity, sort_order)
SELECT p.id, i.id, q, so FROM "package" p, "tent" i,
  (VALUES ('T-4x8-W', 1, 1), ('A-BOK', 4, 2), ('A-OBC', 8, 3)) AS x(sku, q, so)
WHERE p.slug = 'duz-4x8' AND i.sku = x.sku
ON CONFLICT DO NOTHING;

-- DUŻY 5×10 Z MONTAŻEM
INSERT INTO "package_item" (package_id, tent_id, quantity, sort_order)
SELECT p.id, i.id, q, so FROM "package" p, "tent" i,
  (VALUES ('T-5x10-W', 1, 1), ('A-BOK', 5, 2), ('A-OBC', 10, 3)) AS x(sku, q, so)
WHERE p.slug = 'duz-5x10' AND i.sku = x.sku
ON CONFLICT DO NOTHING;

-- DUŻY 6×12 Z MONTAŻEM
INSERT INTO "package_item" (package_id, tent_id, quantity, sort_order)
SELECT p.id, i.id, q, so FROM "package" p, "tent" i,
  (VALUES ('T-6x12-W', 1, 1), ('A-BOK', 6, 2), ('A-OBC', 12, 3)) AS x(sku, q, so)
WHERE p.slug = 'duz-6x12' AND i.sku = x.sku
ON CONFLICT DO NOTHING;

-- DUŻY 4×8 + STOŁY I KRZESŁA (namiot + akcesoria + 5 stołów + 40 krzeseł + 4 girlandy)
INSERT INTO "package_item" (package_id, tent_id, quantity, sort_order)
SELECT p.id, i.id, q, so FROM "package" p, "tent" i,
  (VALUES ('T-4x8-W', 1, 1), ('A-BOK', 4, 2), ('A-OBC', 8, 3),
    ('S-220x80', 5, 4), ('C-W', 40, 5), ('O-GIRL', 4, 6)) AS x(sku, q, so)
WHERE p.slug = 'duz-4x8-stl' AND i.sku = x.sku
ON CONFLICT DO NOTHING;

-- DUŻY 5×10 + STOŁY I KRZESŁA
INSERT INTO "package_item" (package_id, tent_id, quantity, sort_order)
SELECT p.id, i.id, q, so FROM "package" p, "tent" i,
  (VALUES ('T-5x10-W', 1, 1), ('A-BOK', 5, 2), ('A-OBC', 10, 3),
    ('S-220x80', 7, 4), ('C-W', 60, 5), ('O-GIRL', 5, 6)) AS x(sku, q, so)
WHERE p.slug = 'duz-5x10-stl' AND i.sku = x.sku
ON CONFLICT DO NOTHING;

-- DUŻY 6×12 + STOŁY I KRZESŁA (flagship)
INSERT INTO "package_item" (package_id, tent_id, quantity, sort_order)
SELECT p.id, i.id, q, so FROM "package" p, "tent" i,
  (VALUES ('T-6x12-W', 1, 1), ('A-BOK', 6, 2), ('A-OBC', 12, 3),
    ('S-220x80', 10, 4), ('C-W', 80, 5), ('O-GIRL', 6, 6)) AS x(sku, q, so)
WHERE p.slug = 'duz-6x12-stl' AND i.sku = x.sku
ON CONFLICT DO NOTHING;
