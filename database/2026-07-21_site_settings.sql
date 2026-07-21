-- ============================================================================
-- Migration: site_settings  (CLIENT-006)
-- Purpose:   Let a non-technical admin update the site's contact details (email,
--            WhatsApp number, phone display, address) and the enquiry-notification
--            recipient, without a developer editing code or config.
-- NO secrets: DB creds, SMTP, tokens etc. stay in config.php and never live here.
-- Date:      2026-07-21
-- Rollback:  DROP TABLE site_settings;
-- ============================================================================

CREATE TABLE site_settings (
  setting_key   VARCHAR(64) PRIMARY KEY,
  setting_value VARCHAR(500) NOT NULL,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by    INT NULL                     -- admins.id of the last editor
);

-- Seed with the values currently hardcoded across footer.js / contact / product
-- detail, so the site stays byte-identical until an admin changes something.
INSERT INTO site_settings (setting_key, setting_value) VALUES
  ('contact_email',   'contact@yeelimadhesives.com.sg'),
  ('whatsapp_number', '6588755786'),
  ('phone_display',   '+65 8875 5786'),
  ('address_line',    '1 Ang Mo Kio Street 65, #03-17, Singapore 569063');

-- enquiry_recipient is intentionally NOT seeded: enquiries.php falls back to the
-- ENQUIRY_NOTIFY_TO constant in config.php until an admin sets it here. It is
-- server-only and is never returned by the public settings GET.
