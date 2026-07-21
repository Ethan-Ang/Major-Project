-- ============================================================================
-- Migration: download_tokens  (CLIENT-003 gated downloads)
-- Purpose:   Single-use, short-lived tokens issued after a visitor fills the
--            gate form. api/download_document.php validates one, streams the PDF
--            from the private path, and marks it used. Direct file URLs are never
--            exposed to the browser.
-- Date:      2026-07-21
-- Rollback:  DROP TABLE download_tokens;
-- ============================================================================

CREATE TABLE download_tokens (
  token       CHAR(64) PRIMARY KEY,          -- random hex, unguessable
  download_id INT NOT NULL,                  -- document_downloads.id (the visitor record)
  product_id  INT NULL,
  doc_type    ENUM('sds','tds') NOT NULL,
  expires_at  DATETIME NOT NULL,             -- ~15 min after issue
  used_at     DATETIME NULL,                 -- set on first successful download (single-use)
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_dt_expires (expires_at),
  CONSTRAINT fk_dt_download FOREIGN KEY (download_id) REFERENCES document_downloads(id) ON DELETE CASCADE
);
