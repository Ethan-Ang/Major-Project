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
  status ENUM('Available', 'Unavailable') DEFAULT 'Available',
  industries JSON,
  surfaces JSON,
  features JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- enquiries table exists on the live DB (currently empty) but its structure
-- and the corresponding api/enquiries.php endpoint have not been built yet.
-- frontend/admin/enquiries.js already expects GET /api/enquiries.php,
-- and frontend/enquiry.html's submit form does not yet POST anywhere.
