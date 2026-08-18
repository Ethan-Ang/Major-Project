-- Plan C, Phase 1: structured product fields.
--
-- Splits the overloaded `features` array and the delimiter-dependent `usage_text`
-- string into real columns, so the admin form can offer one input per public
-- field instead of relying on magic prefixes ("Application:", "Available in",
-- "Suitable for:") that nothing documents and any stray punctuation breaks.
--
-- ADDITIVE AND NULLABLE. Nothing reads these until Phase 3/4 ship, and the
-- legacy `features` / `usage_text` columns are NEVER dropped or emptied: they
-- remain the input to the product advisor, the Ava chatbot, and the API search
-- LIKE clauses in api/products.php. See
-- docs/superpowers/plans/2026-08-18-product-fields-restructure-plan.md
--
-- Safe to run more than once only if the columns do not already exist; use
-- database/apply_product_fields.php, which checks first.

ALTER TABLE products
  ADD COLUMN base_type          VARCHAR(32)  NULL AFTER product_type,
  ADD COLUMN application_method VARCHAR(255) NULL AFTER base_type,
  ADD COLUMN available_sizes    VARCHAR(255) NULL AFTER application_method,
  ADD COLUMN characteristics    JSON         NULL AFTER features,
  ADD COLUMN key_benefits       JSON         NULL AFTER characteristics,
  ADD COLUMN how_to_use         TEXT         NULL AFTER usage_text,
  ADD COLUMN suitable_uses      JSON         NULL AFTER how_to_use;

-- Rollback:
-- ALTER TABLE products
--   DROP COLUMN base_type, DROP COLUMN application_method, DROP COLUMN available_sizes,
--   DROP COLUMN characteristics, DROP COLUMN key_benefits,
--   DROP COLUMN how_to_use, DROP COLUMN suitable_uses;
