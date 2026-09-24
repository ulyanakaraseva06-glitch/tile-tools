-- Временный администратор и минимальная серверная аналитика Tile Tools.
-- Пароль admin предназначен только для локальной разработки и должен быть
-- заменён перед публикацией сервиса.

CREATE TABLE IF NOT EXISTS tt_site_visitors (
  visitor_key CHAR(64) PRIMARY KEY,
  user_id INT NULL,
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  page_views BIGINT UNSIGNED NOT NULL DEFAULT 1,
  last_page VARCHAR(80) NULL,
  INDEX idx_site_visitors_user (user_id),
  INDEX idx_site_visitors_last_seen (last_seen_at),
  CONSTRAINT fk_tt_site_visitor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users
  (email, password_hash, first_name, last_name, company, role, status, downloads_reset_month, created_at, approved_at)
VALUES
  ('admin@tile-tools.local', '$2y$10$z7g9IuhXYQjFPVOWymVE3eVSp2NzzSa1WGbTOSSzU69aQL/2MA3pG', 'admin', '', 'Tile Tools', 'admin', 'active', DATE_FORMAT(NOW(), '%Y-%m'), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  first_name = IF(first_name = '', 'admin', first_name),
  role = 'admin',
  status = 'active',
  approved_at = COALESCE(approved_at, NOW());
