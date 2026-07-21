-- ============================================================================
-- Migration: taxonomy_terms  (CLIENT-005)
-- Purpose:   Let non-technical admins add / rename / archive the catalogue
--            filter values (Product Types, Brands, Industries, Surfaces)
--            without a developer editing js/data.js by hand.
-- Model:     "Managed allowlist" (architecture Option C). Products keep storing
--            their display strings; this table DEFINES which values are allowed
--            and how they appear in the sidebar. The public API shape is
--            unchanged, so nothing downstream breaks.
-- Applies to: yeelimad_website  (apply locally first, then live via phpMyAdmin).
-- Date:      2026-07-21
-- Rollback:  DROP TABLE taxonomy_terms;   -- additive; touches no product row.
-- ============================================================================

CREATE TABLE taxonomy_terms (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  group_key      ENUM('product_type','brand','industry','surface') NOT NULL,
  label          VARCHAR(120) NOT NULL,          -- official display name incl. (TM)
  slug           VARCHAR(120) NOT NULL,          -- stable URL token; never auto-changed on rename
  logo_url       VARCHAR(255) NULL,              -- brands only (nullable for other groups)
  logo_alt       VARCHAR(255) NULL,              -- brands only
  sort_order     INT NOT NULL DEFAULT 0,         -- display order within the group
  public_visible TINYINT(1) NOT NULL DEFAULT 1,  -- 0 = admin-only (hidden from the public sidebar, still assignable)
  archived       TINYINT(1) NOT NULL DEFAULT 0,  -- 1 = retired: hidden everywhere, existing product strings kept
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_group_slug (group_key, slug),
  UNIQUE KEY uq_group_label (group_key, label),
  KEY idx_group_active (group_key, archived, sort_order)
);

-- ── Seed: exactly the values currently hardcoded in js/data.js ──────────────
-- Slugs match the live URL slugs (products.js ylSlug + BRAND_SLUGS) so existing
-- ?brand=deer / ?industry=flooring links keep working unchanged.

-- Product Types. These are currently DERIVED in code from brand/category
-- (data.js productType()). Seeded here so the sidebar can be data-driven.
-- NOTE: adding a genuinely NEW product type also needs a per-product assignment
-- mechanism (a stored product_type column + a product-form selector); see the
-- companion migration 2026-07-21_products_product_type.sql if that scope is chosen.
INSERT INTO taxonomy_terms (group_key, label, slug, sort_order) VALUES
  ('product_type', 'Adhesives',                'adhesives',              1),
  ('product_type', 'Spray Guns & Accessories', 'spray-guns-accessories', 2);

-- Brands. public_visible = 0 for the "Others & Accessories" grouping so it stays
-- out of the public Brand filter but remains assignable in admin, exactly
-- mirroring the current PUBLIC_BRANDS vs BRANDS split.
INSERT INTO taxonomy_terms (group_key, label, slug, sort_order, public_visible) VALUES
  ('brand', 'Deer™ Brand',          'deer',               1, 1),
  ('brand', 'Horsemen™ Brand',      'horsemen',           2, 1),
  ('brand', 'Premier™ Brand',       'premier',            3, 1),
  ('brand', 'Rhino™ Brand',         'rhino',              4, 1),
  ('brand', 'Others & Accessories', 'others-accessories', 5, 0);

-- Industries (12).
INSERT INTO taxonomy_terms (group_key, label, slug, sort_order) VALUES
  ('industry', 'Automotive',          'automotive',        1),
  ('industry', 'Carpentry',           'carpentry',         2),
  ('industry', 'Cooling Process',     'cooling-process',   3),
  ('industry', 'Fashion',             'fashion',           4),
  ('industry', 'Flooring',            'flooring',          5),
  ('industry', 'Insulation',          'insulation',        6),
  ('industry', 'Lift & Escalator',    'lift-escalator',    7),
  ('industry', 'Marine',              'marine',            8),
  ('industry', 'Packaging',           'packaging',         9),
  ('industry', 'Plumbing & Sanitary', 'plumbing-sanitary', 10),
  ('industry', 'Upholstery',          'upholstery',        11),
  ('industry', 'Waterproof',          'waterproof',        12);

-- Surfaces (15).
INSERT INTO taxonomy_terms (group_key, label, slug, sort_order) VALUES
  ('surface', 'Carpet',              'carpet',            1),
  ('surface', 'Fibreglass Wool',     'fibreglass-wool',   2),
  ('surface', 'Foam & Sponge',       'foam-sponge',       3),
  ('surface', 'Labels',              'labels',            4),
  ('surface', 'Laminates',           'laminates',         5),
  ('surface', 'Leather',             'leather',           6),
  ('surface', 'Metal',               'metal',             7),
  ('surface', 'Paper',               'paper',             8),
  ('surface', 'Plastics & Acrylics', 'plastics-acrylics', 9),
  ('surface', 'Rubber',              'rubber',           10),
  ('surface', 'Stone Ceramics',      'stone-ceramics',   11),
  ('surface', 'Tiles',               'tiles',            12),
  ('surface', 'Turf',                'turf',             13),
  ('surface', 'Wallpaper',           'wallpaper',        14),
  ('surface', 'Wood',                'wood',             15);

-- ── Verification (run after seeding; each query MUST return zero rows) ───────
-- A distinct product value missing from taxonomy_terms would silently vanish
-- from the sidebar once it is data-driven, so confirm there are none.
--
-- Brands on products but not seeded:
--   SELECT DISTINCT p.brand FROM products p
--   LEFT JOIN taxonomy_terms t ON t.group_key='brand' AND t.label = p.brand
--   WHERE p.brand IS NOT NULL AND p.brand <> '' AND t.id IS NULL;
--
-- Industries on products but not seeded (MySQL 8+ JSON_TABLE):
--   SELECT DISTINCT jt.val FROM products p,
--     JSON_TABLE(p.industries, '$[*]' COLUMNS (val VARCHAR(120) PATH '$')) jt
--   LEFT JOIN taxonomy_terms t ON t.group_key='industry' AND t.label = jt.val
--   WHERE t.id IS NULL;
--
-- Surfaces on products but not seeded:
--   SELECT DISTINCT jt.val FROM products p,
--     JSON_TABLE(p.surfaces, '$[*]' COLUMNS (val VARCHAR(120) PATH '$')) jt
--   LEFT JOIN taxonomy_terms t ON t.group_key='surface' AND t.label = jt.val
--   WHERE t.id IS NULL;
