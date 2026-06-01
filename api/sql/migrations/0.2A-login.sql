USE tipovacka_ms2026;

ALTER TABLE users ADD COLUMN IF NOT EXISTS login_name VARCHAR(120) NULL AFTER name;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(190) NULL AFTER role;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(190) NULL AFTER pin_hash;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER password_hash;

-- Pokud MySQL/MariaDB neumí ADD COLUMN IF NOT EXISTS, použij ruční ALTER podle README.

UPDATE users
SET login_name = LOWER(REPLACE(name, ' ', '-'))
WHERE login_name IS NULL OR login_name = '';

UPDATE users
SET login_name = 'admin', password_hash = SHA2('admin2026', 256), is_active = 1
WHERE role = 'admin'
ORDER BY id ASC
LIMIT 1;

UPDATE users
SET pin_hash = SHA2('1234', 256), is_active = 1
WHERE role = 'player' AND pin_hash IS NULL;
