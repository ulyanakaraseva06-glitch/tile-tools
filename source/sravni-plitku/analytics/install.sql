-- ============================================================
--  analytics/install.sql — таблицы продуктовой аналитики (ЭТАП 03)
--  Выполнить ОДИН РАЗ в phpMyAdmin (вкладка SQL) на той же базе, что и users.
--  Все таблицы ссылаются на users.id через user_id (без жёсткого FK,
--  чтобы удаление пользователя не блокировалось историей).
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_key VARCHAR(64) NOT NULL UNIQUE,
  user_id INT NULL,
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  device_type VARCHAR(20) NULL,
  browser VARCHAR(80) NULL,
  os VARCHAR(80) NULL,
  viewport_w INT NULL,
  viewport_h INT NULL,
  screen_w INT NULL,
  screen_h INT NULL,
  user_agent TEXT NULL,
  ip_hash VARCHAR(64) NULL,
  referrer TEXT NULL,
  landing_path VARCHAR(255) NULL,
  utm_source VARCHAR(120) NULL,
  utm_medium VARCHAR(120) NULL,
  utm_campaign VARCHAR(120) NULL,
  pageviews INT NOT NULL DEFAULT 0,
  events_count INT NOT NULL DEFAULT 0,
  INDEX idx_user_id (user_id),
  INDEX idx_first_seen (first_seen_at),
  INDEX idx_last_seen (last_seen_at),
  INDEX idx_device_type (device_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_key VARCHAR(64) NOT NULL,
  user_id INT NULL,
  event_name VARCHAR(80) NOT NULL,
  page_path VARCHAR(255) NULL,
  scene_id VARCHAR(120) NULL,
  zone_id VARCHAR(120) NULL,
  tile_id VARCHAR(120) NULL,
  tile_brand VARCHAR(120) NULL,
  tile_collection VARCHAR(120) NULL,
  tile_color VARCHAR(80) NULL,
  tile_size VARCHAR(80) NULL,
  tile_surface VARCHAR(80) NULL,
  tile_design VARCHAR(80) NULL,
  search_query VARCHAR(255) NULL,
  filters_json TEXT NULL,
  selection_json TEXT NULL,
  metadata_json TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_event_created (event_name, created_at),
  INDEX idx_tile_created (tile_id, created_at),
  INDEX idx_scene_zone_created (scene_id, zone_id, created_at),
  INDEX idx_session_key (session_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS download_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_key VARCHAR(64) NULL,
  scene_id VARCHAR(120) NULL,
  export_format VARCHAR(20) NOT NULL DEFAULT 'jpg',
  selection_json TEXT NULL,
  limit_snapshot INT NULL,
  used_before INT NULL,
  used_after INT NULL,
  status ENUM('attempt','success','failed','blocked_limit') NOT NULL DEFAULT 'attempt',
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_notes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  admin_id INT NOT NULL,
  note TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
