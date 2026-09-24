-- Долгоживущие токены входа Tile Tools.
-- В cookie хранится selector + случайный validator, в базе — только SHA-256 validator.

CREATE TABLE IF NOT EXISTS tt_auth_tokens (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL,
  selector          CHAR(24) NOT NULL,
  validator_hash    CHAR(64) NOT NULL,
  user_agent_hash   CHAR(64) NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at      DATETIME NULL,
  expires_at        DATETIME NOT NULL,
  revoked_at        DATETIME NULL,
  UNIQUE KEY uq_tt_auth_tokens_selector (selector),
  KEY idx_tt_auth_tokens_user (user_id, expires_at, revoked_at),
  CONSTRAINT fk_tt_auth_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
