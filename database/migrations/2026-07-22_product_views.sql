-- Feature 2 (analytics): one row per product-detail view, for time-series stats.
-- Written by api/track_view.php (public, best-effort); read by api/analytics.php
-- (admin-only). session_hash is a coarse, hashed dedupe key, never PII.
CREATE TABLE product_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  session_hash CHAR(64) NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pv_product (product_id),
  KEY idx_pv_viewed (viewed_at)
);
