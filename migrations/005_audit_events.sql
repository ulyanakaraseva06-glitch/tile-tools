-- Аудит действий, которые меняют общие объекты сервиса.

CREATE TABLE IF NOT EXISTS tt_audit_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  event_type VARCHAR(100) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_actor_created (actor_user_id, created_at),
  INDEX idx_audit_target (target_type, target_id),
  CONSTRAINT fk_tt_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
