-- Repair for the admin Features save-corruption bug (see
-- docs/superpowers/plans/2026-08-18-product-fields-restructure-plan.md section 0).
--
-- Product #1 Deer(TM) Brand 101 was saved through the old admin form, which split
-- its comma-bearing feature strings into 8 separate entries. That dropped three of
-- four pack sizes from the public Available Sizes row and dumped them into
-- Characteristics. Canonical value below is copied from DEMO_PRODUCTS in
-- frontend/js/data.js, which is authoritative.
--
-- Live value before this runs (8 entries):
--   ["Solvent-based","Application: Brush or Roll","Liquid","Yellow",
--    "Available in 75G Tube","300G","1/4 US Gallon","1 US Gallon"]
--
-- BACK UP THE products TABLE BEFORE RUNNING. Only run AFTER admin.js v25 is live,
-- otherwise the next save through the old form re-corrupts it.

UPDATE products SET features = '["Solvent-based","Application: Brush or Roll","Liquid, Yellow","Available in 75G Tube, 300G, 1/4 US Gallon, 1 US Gallon"]' WHERE id = 1;
