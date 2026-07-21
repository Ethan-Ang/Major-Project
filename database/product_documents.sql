-- ============================================================================
-- Table: product_documents  (SYNCED FROM LIVE — teammate's SDS/TDS uploader)
-- This table ALREADY EXISTS on the live server; it was created by the teammate
-- who built the drag-drop document uploader. It is reconstructed here from the
-- live endpoint code (upload_product_document.php / product_documents.php /
-- delete_product_document.php) for LOCAL DEV + as documentation.
--   *** DO NOT run this on the live database — it already exists there. ***
-- Written by: upload_product_document.php.  Read: product_documents.php (GET).
--   Delete:   delete_product_document.php.   FK cascade: product delete clears rows.
-- ============================================================================

CREATE TABLE product_documents (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  product_id    INT NOT NULL,
  document_type VARCHAR(20) NOT NULL,          -- SDS / TDS / OTHER
  original_name VARCHAR(255) NOT NULL,         -- display filename
  stored_name   VARCHAR(255) NOT NULL,         -- random on-disk name
  file_path     VARCHAR(255) NOT NULL,         -- /uploads/products/product-N/documents/xxx.pdf
  file_size     INT NULL,
  uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pd_product (product_id, document_type),
  CONSTRAINT fk_pd_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
