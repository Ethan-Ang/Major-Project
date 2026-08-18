-- Plan C: structured product fields, generated 2026-08-18
-- Generated FROM LIVE DATA (31 products) so the values match exactly.
--
-- STATUS: ALREADY APPLIED to the live database on 2026-08-18. Kept as the record
-- of exactly what was run. Re-running the ALTER would fail (columns exist); the
-- UPDATEs are idempotent. Verified afterwards: 31/31 rows rebuild the original
-- `features` / `usage_text` byte-identically, 0 mismatches.
--
-- Run in cPanel > phpMyAdmin against the live database, after exporting the
-- products table. Purely additive: it adds seven nullable columns and fills
-- them. It never touches `features` or `usage_text`, which stay the source of
-- truth for the product advisor, the Ava chatbot and the API search.
--
-- NOTHING READS THESE COLUMNS YET. Applying this changes no behaviour; it only
-- prepares for retiring the string parsing later. Safe to postpone indefinitely.

ALTER TABLE products
  ADD COLUMN base_type          VARCHAR(32)  NULL AFTER product_type,
  ADD COLUMN application_method VARCHAR(255) NULL AFTER base_type,
  ADD COLUMN available_sizes    VARCHAR(255) NULL AFTER application_method,
  ADD COLUMN characteristics    JSON         NULL AFTER features,
  ADD COLUMN key_benefits       JSON         NULL AFTER characteristics,
  ADD COLUMN how_to_use         TEXT         NULL AFTER usage_text,
  ADD COLUMN suitable_uses      JSON         NULL AFTER how_to_use;

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '75G Tube, 300G, 1/4 US Gallon, 1 US Gallon',
  characteristics    = '["Liquid, Yellow"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Leather product bonding","Shoe in-soles","General purpose"]'
WHERE id = 1;  -- Deer™ Brand 101

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '1/4 US Gallon, 1 US Gallon',
  characteristics    = '["Liquid, Yellow"]',
  key_benefits       = '["Low VOC (as stated by Yee Lim)","Low / non-detectable formaldehyde (lab-tested)"]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Leather crafting","Adhesion of laminates (E.g. Carpentry, Door, Cabinet and etc.)","Marine supplies - Building and repair works","General purpose"]'
WHERE id = 2;  -- Deer™ Brand 129

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '5KGs, 20KGs',
  characteristics    = '["Paste, Ivory White"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Tile bonding","Marble bonding","Stone bonding","Metal bonding","Raised flooring joint works","Fish ponds"]'
WHERE id = 3;  -- Deer™ Brand 212

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '5KGs, 20KGs',
  characteristics    = '["Paste, Green"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Artificial Turf","Artificial Grass/Carpet Grass","Synthetic Tiles/Turf"]'
WHERE id = 4;  -- Deer™ Brand 212G

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '1 US Gallon, 18L',
  characteristics    = '["Liquid, Transparent, Slight amber"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Foam","Styrofoam","Polyfoam","PVC foam","Plastic","Insulation materials","Interior landscaping","Vertical Gardening"]'
WHERE id = 5;  -- Deer™ Brand 232

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Dip',
  available_sizes    = '200ml, 1/4 US Gallon',
  characteristics    = '["Liquid (Slight Paste), Transparent"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by dip.',
  suitable_uses      = '["Marketing","Advertisements","Labels","Letters","Magazine","Credit Card"]'
WHERE id = 6;  -- Deer™ Brand 232-FG

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Spray, Brush or Roll',
  available_sizes    = '1 US Gallon, 18L',
  characteristics    = '["Liquid, Transparent, Slight amber"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by spray, brush or roll.',
  suitable_uses      = '["Foam","Styrofoam","Polyfoam","PVC foam","Plastic","Insulation materials","Interior landscaping","Vertical Gardening"]'
WHERE id = 7;  -- Deer™ Brand 232ST

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '400ml',
  characteristics    = '["Liquid, Colourless"]',
  key_benefits       = '[]',
  how_to_use         = 'Ensure bonding pipes/surface are cleaned, dried and free from any contaminants. Apply adhesive on the both entire bonding surface (e.g. the entire circumference of both pipe). Push and twist both pipes in one full cycle to ensure proper spread and coverage of adhesive. End the twist in its final bonding position and let dry for at least 3 - 5 minutes. Initial strength achieve within short period of time. For best adhesion effect, allow up to 24 hours curing time.',
  suitable_uses      = '[]'
WHERE id = 8;  -- Deer™ Brand 313

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush, Roll or Injection',
  available_sizes    = '400ml',
  characteristics    = '["Liquid, Colourless"]',
  key_benefits       = '[]',
  how_to_use         = '1. Ensure bonding surface are cleaned, dried and free from any contaminants. 2. Ensure the bonding edges of both surface are well aligned and smooth. 3. Apply adhesive on both bonding surface using a injection kit or brush and bond immediately. 4. Allow both bonding pieces to lay and set for at least 30 - 45mins before shifting or lifting up. 5. Initial strength achieve within short period of time. For best adhesion effect, allow up to 24 hours curing time',
  suitable_uses      = '[]'
WHERE id = 9;  -- Deer™ Brand 500 Acrylic Glue Adhesive

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Spray, Brush or Roll',
  available_sizes    = '1 US Gallon, 18 Litres',
  characteristics    = '["Liquid, Yellow"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by spray, brush or roll.',
  suitable_uses      = '["Fiberglass/Mineral wool to aluminum sheet bonding"]'
WHERE id = 10;  -- Deer™ Brand 969A

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Spray, Brush or Roll',
  available_sizes    = '1 US Gallon, 18 Litres',
  characteristics    = '["Liquid, Yellow"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by spray, brush or roll.',
  suitable_uses      = '["Foam & Sponge bonding","Sofa manufacturing","Adhesion for vehicle interior upholstery","Rubber mat tiles","Fibreglass wool bonding","General Purpose"]'
WHERE id = 11;  -- Deer™ Brand 969H

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '1 US Gallon',
  characteristics    = '["Liquid, Transparent, Slight amber"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Bonding of carpet roll","General purpose"]'
WHERE id = 12;  -- Deer™ Brand 969NT

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Spray, Brush or Roll',
  available_sizes    = '1 US Gallon, 18L',
  characteristics    = '["Liquid, Transparent Yellow"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by spray, brush or roll.',
  suitable_uses      = '["Fiberglass to aluminum bonding"]'
WHERE id = 13;  -- Deer™ Brand 969WT

UPDATE products SET
  base_type          = 'Water-based',
  application_method = 'Brush or Roll',
  available_sizes    = '150ml, 250ml, 3KG, 6KG, 20KG',
  characteristics    = '["Liquid, White"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Wood to wood bonding","Paper","Cloth","Paper & Book Binding","General Art & Craft","General purpose"]'
WHERE id = 14;  -- Deer™ Brand PVA

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '1/4 US Gallon, 1 US Gallon',
  characteristics    = '["Liquid, Yellow"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Adhesion of waterproofing membrane to concrete","Adhesion of rubber mat tiles to concrete","Marine supplies - Building and repair works","General purpose"]'
WHERE id = 15;  -- Horsemen™ 707

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Scrape, Brush or Roll',
  available_sizes    = '1 US Gallon',
  characteristics    = '["Liquid, Yellow"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by scrape, brush or roll.',
  suitable_uses      = '["Bonding of Laminates","General Purpose"]'
WHERE id = 16;  -- Horsemen™ 707A5

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '1 US Gallon',
  characteristics    = '["Liquid, Yellow"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["For bonding of carpet roll","General purpose"]'
WHERE id = 17;  -- Horsemen™ 707C

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Spray, Brush or Roll',
  available_sizes    = '1 US Gallon, 18L',
  characteristics    = '["Liquid, Yellow"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by spray, brush or roll.',
  suitable_uses      = '["Adhesion for vehicle interior upholstery","Adhesion of rubber mat tiles to concrete","Furniture upholstery (Sofa making)","Packaging","General purpose"]'
WHERE id = 18;  -- Horsemen™ 707S

UPDATE products SET
  base_type          = 'Water-based',
  application_method = 'Scrape, Brush or Roll',
  available_sizes    = '18L',
  characteristics    = '["Liquid, White (Transparent when dried.)"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by scrape, brush or roll.',
  suitable_uses      = '["Carpet tile bonding","Labels bonding"]'
WHERE id = 19;  -- Premier™ Brand 100

UPDATE products SET
  base_type          = 'Water-based',
  application_method = 'Scrape, Brush or Roll',
  available_sizes    = '18L',
  characteristics    = '["Liquid, White (Transparent when dried.)"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by scrape, brush or roll.',
  suitable_uses      = '["Carpet tile bonding"]'
WHERE id = 20;  -- Premier™ Brand 100B

UPDATE products SET
  base_type          = 'Water-based',
  application_method = 'Scrape, Brush or Roll',
  available_sizes    = '18L',
  characteristics    = '["Liquid, White (Transparent when dried.)"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by scrape, brush or roll.',
  suitable_uses      = '["Carpet tile bonding"]'
WHERE id = 21;  -- Premier™ Brand 100B2

UPDATE products SET
  base_type          = 'Water-based',
  application_method = 'Scrape, Brush or Roll',
  available_sizes    = '18L',
  characteristics    = '["Liquid, White (Transparent when dried.)"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by scrape, brush or roll.',
  suitable_uses      = '["Carpet tile bonding"]'
WHERE id = 22;  -- Premier™ Brand 110

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '1/4 US Gallon, 1 US Gallon',
  characteristics    = '["Liquid, Yellow"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Rubber-typed shoe soles","Leather-typed shoes","Shoe in-soles","Leather crafting","Shoe repair clobbering works"]'
WHERE id = 23;  -- Premier™ Brand 138

UPDATE products SET
  base_type          = 'Water-based',
  application_method = 'Brush or Roll',
  available_sizes    = '5KGs, 10KGs, 20KGs',
  characteristics    = '["Liquid, White"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["PVC & Vinyl tile"]'
WHERE id = 24;  -- Premier™ Brand 2000

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '1/4 US Gallon, 1 US Gallon',
  characteristics    = '["Liquid, Yellow"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Waterproofing membrane works","Gasket bonding","Lift lamination","Marine supplies - Building and repair works","Rubber bonding","General purpose"]'
WHERE id = 25;  -- Premier™ Brand 202

UPDATE products SET
  base_type          = 'Water-based',
  application_method = 'Brush or Roll',
  available_sizes    = '200g',
  characteristics    = '["Powder, White"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Wallpaper covering works"]'
WHERE id = 26;  -- Premier™ Brand 3000 Series Wallpaper Adhesives

UPDATE products SET
  base_type          = 'Water-based',
  application_method = 'Brush or Roll',
  available_sizes    = '5KGs',
  characteristics    = '["Paste, Transparent White"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Heavy duty wallpaper covering"]'
WHERE id = 27;  -- Premier™ Brand 5050

UPDATE products SET
  base_type          = 'Water-based',
  application_method = 'Brush or Roll',
  available_sizes    = '18L',
  characteristics    = '["Liquid, White (Transparent when dried.)"]',
  key_benefits       = '["Low VOC (as stated by Yee Lim)","Singapore Green Label scheme"]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Carpet tile works","Pressure Sensitive Adhesive","Singapore Green Label Scheme"]'
WHERE id = 28;  -- Premier™ Brand G100 Carpet Tile Adhesive

UPDATE products SET
  base_type          = 'Solvent-based',
  application_method = 'Brush or Roll',
  available_sizes    = '1 US Gallon',
  characteristics    = '["Liquid, Yellow"]',
  key_benefits       = '[]',
  how_to_use         = 'Apply by brush or roll.',
  suitable_uses      = '["Adhesion of laminates (E.g. Carpentry, Door, Cabinet and etc.)","General purpose"]'
WHERE id = 29;  -- Rhino™ Brand 909

UPDATE products SET
  base_type          = NULL,
  application_method = NULL,
  available_sizes    = NULL,
  characteristics    = '[]',
  key_benefits       = '["2.5mm nozzle","3 spray controls (volume, fan, air)","Includes cleaning kit & quick-attach mouthpiece"]',
  how_to_use         = 'For use with spray-grade adhesives. Adjust the three spray controls (volume, fan and air) to suit the job; clean after use with the supplied cleaning kit.',
  suitable_uses      = '[]'
WHERE id = 30;  -- ASG001 Adhesive Spray Gun 001

UPDATE products SET
  base_type          = NULL,
  application_method = NULL,
  available_sizes    = NULL,
  characteristics    = '[]',
  key_benefits       = '["2.0mm nozzle","3 spray controls (volume, fan, air)","Includes cleaning kit & quick-attach mouthpiece"]',
  how_to_use         = 'For use with spray-grade adhesives. Adjust the three spray controls (volume, fan and air) to suit the job; clean after use with the supplied cleaning kit.',
  suitable_uses      = '[]'
WHERE id = 31;  -- ASG002 Adhesive Spray Gun 002

-- Rollback:
-- ALTER TABLE products
--   DROP COLUMN base_type, DROP COLUMN application_method, DROP COLUMN available_sizes,
--   DROP COLUMN characteristics, DROP COLUMN key_benefits,
--   DROP COLUMN how_to_use, DROP COLUMN suitable_uses;
