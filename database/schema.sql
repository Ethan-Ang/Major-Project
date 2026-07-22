-- Schema for the yeelimad_website MySQL database (cPanel hosting)
-- Reverse-engineered from the live phpMyAdmin structure on 2026-06-11.

CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_admins_username (username)
);

CREATE TABLE admin_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  token VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_admin_tokens_token (token),
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mongo_id VARCHAR(32),
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) DEFAULT 'Yee Lim',
  category VARCHAR(100) NOT NULL,
  short_description TEXT NOT NULL,
  full_description TEXT,
  usage_text TEXT,
  image_url VARCHAR(255),
  images JSON,
  sds_url VARCHAR(255) NULL,            -- optional Safety Data Sheet link (URL or relative path); blank = hidden
  tds_url VARCHAR(255) NULL,            -- optional Technical Data Sheet link (URL or relative path); blank = hidden
  status ENUM('Available', 'Unavailable') DEFAULT 'Available',
  industries JSON,
  surfaces JSON,
  features JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customer enquiries submitted from the public enquiry basket (enquiry.html).
-- Served by api/enquiries.php: POST (public submit) + GET/PATCH (admin).
CREATE TABLE enquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  message TEXT,
  products JSON,                       -- array of product names enquired about
  reply_token VARCHAR(64),             -- unguessable token for the email "Mark as replied" one-tap link
  replied TINYINT(1) NOT NULL DEFAULT 0, -- 0 = New (needs a response), 1 = Replied
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_enquiries_created (created_at)
);

-- Product-detail view events (analytics). Written by api/track_view.php
-- (public, best-effort, deduped); aggregated by api/analytics.php (admin-only).
CREATE TABLE product_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  session_hash CHAR(64) NULL,          -- coarse hashed dedupe key, never PII
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pv_product (product_id),
  KEY idx_pv_viewed (viewed_at)
);
