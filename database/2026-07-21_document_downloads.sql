-- ============================================================================
-- Migration: document_downloads  (CLIENT-003 / CLIENT-004)
-- Purpose:   Record who downloaded an SDS/TDS after filling the gate form, so
--            the admin can view and delete these site-visitor records. The data
--            lives only in the admin panel and is never emailed (client's wish).
-- Written by: the gate endpoint (Phase C). Read/deleted by: api/downloads.php.
-- Date:      2026-07-21
-- Rollback:  DROP TABLE document_downloads;
-- ============================================================================

CREATE TABLE document_downloads (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  product_id      INT NULL,                     -- NULL if the product is later deleted
  product_name    VARCHAR(255) NOT NULL,        -- snapshot, so history survives product edits
  doc_type        ENUM('sds','tds') NOT NULL,
  visitor_name    VARCHAR(255) NOT NULL,
  visitor_email   VARCHAR(255) NOT NULL,
  visitor_company VARCHAR(255) NOT NULL,
  visitor_phone   VARCHAR(50)  NULL,            -- optional (approved decision)
  notice_version  VARCHAR(16)  NULL,            -- which privacy notice the visitor saw
  downloaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_dl_created (downloaded_at),
  KEY idx_dl_product (product_id),
  KEY idx_dl_type (doc_type)
);
