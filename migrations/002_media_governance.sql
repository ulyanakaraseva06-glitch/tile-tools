-- Управление квотой и отложенным удалением медиа.
-- Сначала выполнить на staging после 001_core_entities.sql.

CREATE TABLE IF NOT EXISTS tt_user_storage_quotas (
  user_id INT PRIMARY KEY,
  limit_bytes BIGINT UNSIGNED NOT NULL DEFAULT 104857600,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tt_quota_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE tt_media_assets
  ADD COLUMN purge_after DATETIME NULL AFTER deleted_at,
  ADD COLUMN published_at DATETIME NULL AFTER purge_after,
  ADD INDEX idx_media_purge (status, purge_after);

-- Существующим активным владельцам можно создать дефолтную квоту при развёртывании:
-- INSERT IGNORE INTO tt_user_storage_quotas (user_id)
-- SELECT id FROM users;
