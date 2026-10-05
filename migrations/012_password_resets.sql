-- Одноразовые токены восстановления пароля. В базе хранится только хеш секрета.

CREATE TABLE IF NOT EXISTS tt_password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  selector CHAR(24) NOT NULL,
  validator_hash CHAR(64) NOT NULL,
  requested_ip_hash CHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  UNIQUE KEY uq_tt_password_reset_selector (selector),
  KEY idx_tt_password_reset_user (user_id, created_at, used_at),
  KEY idx_tt_password_reset_expiry (expires_at),
  CONSTRAINT fk_tt_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
