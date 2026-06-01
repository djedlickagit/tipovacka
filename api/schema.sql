CREATE DATABASE IF NOT EXISTS tipovacka_ms2026
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tipovacka_ms2026;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  login_name VARCHAR(120) NULL,
  email VARCHAR(190) NULL,
  role ENUM('admin', 'player') NOT NULL DEFAULT 'player',
  pin_hash VARCHAR(190) NULL,
  password_hash VARCHAR(190) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_login_name (login_name)
);

CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(120) NULL,
  source VARCHAR(60) NULL,
  stage VARCHAR(50) NOT NULL DEFAULT 'group',
  group_name VARCHAR(20) NULL,
  home_team VARCHAR(120) NOT NULL,
  away_team VARCHAR(120) NOT NULL,
  start_time DATETIME NULL,
  venue VARCHAR(190) NULL,
  home_score INT NULL,
  away_score INT NULL,
  status ENUM('scheduled', 'locked', 'finished', 'evaluated') NOT NULL DEFAULT 'scheduled',
  synced_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_matches_source_external (source, external_id)
);


CREATE TABLE IF NOT EXISTS sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(60) NOT NULL DEFAULT 'sample',
  action VARCHAR(80) NOT NULL,
  status ENUM('ok','error') NOT NULL DEFAULT 'ok',
  message TEXT NULL,
  imported_count INT NOT NULL DEFAULT 0,
  updated_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  match_id INT NOT NULL,
  home_tip INT NOT NULL,
  away_tip INT NOT NULL,
  points INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_match (user_id, match_id),
  INDEX idx_tips_user_id (user_id),
  INDEX idx_tips_match_id (match_id),
  CONSTRAINT fk_tips_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tips_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scoring_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exact_score_points INT NOT NULL DEFAULT 3,
  correct_result_points INT NOT NULL DEFAULT 1,
  wrong_tip_points INT NOT NULL DEFAULT 0,
  rules_text TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO scoring_settings (
  exact_score_points,
  correct_result_points,
  wrong_tip_points,
  rules_text
)
SELECT
  3,
  1,
  0,
  '1. Nejdříve se tipují všechny zápasy základních skupin.\n2. Po odehrání skupin se postupně otevírají další kola.\n3. Za přesný výsledek jsou 3 body.\n4. Za uhodnutí vítěze nebo remízy je 1 bod.\n5. Za špatný tip je 0 bodů.\n6. Tip je možné změnit pouze do začátku zápasu.'
WHERE NOT EXISTS (SELECT 1 FROM scoring_settings);

-- Výchozí přístup: admin / admin2026
INSERT INTO users (name, login_name, email, role, password_hash, is_active)
SELECT 'Admin', 'admin', 'admin@tipovacka.local', 'admin', SHA2('admin2026', 256), 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin');

-- Ukázkový tipovač: David / 1234
INSERT INTO users (name, login_name, email, role, pin_hash, is_active)
SELECT 'David', 'david', 'david@example.local', 'player', SHA2('1234', 256), 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE login_name = 'david');

INSERT INTO matches (stage, group_name, home_team, away_team, start_time, status)
SELECT 'group', 'A', 'Tým A1', 'Tým A2', '2026-06-11 21:00:00', 'scheduled'
WHERE NOT EXISTS (SELECT 1 FROM matches);
