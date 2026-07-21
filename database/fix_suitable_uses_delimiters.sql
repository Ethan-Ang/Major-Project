-- Restore canonical (delimited) usage so Product Detail 'Suitable Uses' renders as rows.
-- DB: yeelimad_website (cPanel phpMyAdmin). BACK UP the products table first.
-- Review each line, then run.

UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Leather product bonding; Shoe in-soles; General purpose.' WHERE id = 1; -- Deer™ Brand 101
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Leather crafting; Adhesion of laminates (E.g. Carpentry, Door, Cabinet and etc.); Marine supplies - Building and repair works; General purpose.' WHERE id = 2; -- Deer™ Brand 129
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Tile bonding; Marble bonding; Stone bonding; Metal bonding; Raised flooring joint works; Fish ponds.' WHERE id = 3; -- Deer™ Brand 212
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Artificial Turf; Artificial Grass/Carpet Grass; Synthetic Tiles/Turf.' WHERE id = 4; -- Deer™ Brand 212G
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Foam; Styrofoam; Polyfoam; PVC foam; Plastic; Insulation materials; Interior landscaping; Vertical Gardening.' WHERE id = 5; -- Deer™ Brand 232
UPDATE products SET usage = 'Apply by dip. Suitable for: Marketing; Advertisements; Labels; Letters; Magazine; Credit Card.' WHERE id = 6; -- Deer™ Brand 232-FG
UPDATE products SET usage = 'Apply by spray, brush or roll. Suitable for: Foam; Styrofoam; Polyfoam; PVC foam; Plastic; Insulation materials; Interior landscaping; Vertical Gardening.' WHERE id = 7; -- Deer™ Brand 232ST
UPDATE products SET usage = 'Apply by spray, brush or roll. Suitable for: Foam & Sponge bonding; Sofa manufacturing; Adhesion for vehicle interior upholstery; Rubber mat tiles; Fibreglass wool bonding; General Purpose.' WHERE id = 11; -- Deer™ Brand 969H
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Bonding of carpet roll; General purpose.' WHERE id = 12; -- Deer™ Brand 969NT
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Wood to wood bonding; Paper; Cloth; Paper & Book Binding; General Art & Craft; General purpose.' WHERE id = 14; -- Deer™ Brand PVA
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Adhesion of waterproofing membrane to concrete; Adhesion of rubber mat tiles to concrete; Marine supplies - Building and repair works; General purpose.' WHERE id = 15; -- Horsemen™ 707
UPDATE products SET usage = 'Apply by scrape, brush or roll. Suitable for: Bonding of Laminates; General Purpose.' WHERE id = 16; -- Horsemen™ 707A5
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: For bonding of carpet roll; General purpose.' WHERE id = 17; -- Horsemen™ 707C
UPDATE products SET usage = 'Apply by spray, brush or roll. Suitable for: Adhesion for vehicle interior upholstery; Adhesion of rubber mat tiles to concrete; Furniture upholstery (Sofa making); Packaging; General purpose.' WHERE id = 18; -- Horsemen™ 707S
UPDATE products SET usage = 'Apply by scrape, brush or roll. Suitable for: Carpet tile bonding; Labels bonding.' WHERE id = 19; -- Premier™ Brand 100
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Rubber-typed shoe soles; Leather-typed shoes; Shoe in-soles; Leather crafting; Shoe repair clobbering works.' WHERE id = 23; -- Premier™ Brand 138
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Waterproofing membrane works; Gasket bonding; Lift lamination; Marine supplies - Building and repair works; Rubber bonding; General purpose.' WHERE id = 25; -- Premier™ Brand 202
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Carpet tile works; Pressure Sensitive Adhesive; Singapore Green Label Scheme.' WHERE id = 28; -- Premier™ Brand G100 Carpet Tile Adhesive
UPDATE products SET usage = 'Apply by brush or roll. Suitable for: Adhesion of laminates (E.g. Carpentry, Door, Cabinet and etc.); General purpose.' WHERE id = 29; -- Rhino™ Brand 909
UPDATE products SET usage = 'For use with spray-grade adhesives. Adjust the three spray controls (volume, fan and air) to suit the job; clean after use with the supplied cleaning kit.' WHERE id = 30; -- ASG001 Adhesive Spray Gun 001
