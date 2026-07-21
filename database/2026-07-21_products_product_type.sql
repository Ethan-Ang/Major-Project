-- ============================================================================
-- Migration: products.product_type  (CLIENT-005, "make Product Types addable")
-- Purpose:   Give products a STORED product type so admins can define types
--            beyond the built-in Adhesives / Spray Guns split and assign each
--            product explicitly, instead of the value being derived in code.
-- Backfill:  reproduces the exact rule currently in js/data.js productType():
--              accessory  (brand = 'Others & Accessories' OR category = 'Others')
--                         -> 'Spray Guns & Accessories'
--              everything else -> 'Adhesives'
-- Order:     apply AFTER 2026-07-21_taxonomy_terms.sql.
-- Date:      2026-07-21
-- Rollback:  ALTER TABLE products DROP COLUMN product_type;
-- ============================================================================

ALTER TABLE products
  ADD COLUMN product_type VARCHAR(120) NULL AFTER category;

UPDATE products
  SET product_type = CASE
    WHEN brand = 'Others & Accessories' OR category = 'Others'
      THEN 'Spray Guns & Accessories'
    ELSE 'Adhesives'
  END
  WHERE product_type IS NULL OR product_type = '';

-- Verification (should return zero rows: every product must have a type):
--   SELECT id, name FROM products WHERE product_type IS NULL OR product_type = '';
