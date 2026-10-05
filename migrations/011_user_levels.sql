-- Трёхуровневая система пользователей, приглашения и будущие голосования.

ALTER TABLE users
  ADD COLUMN nickname VARCHAR(100) NULL AFTER email;

UPDATE users
SET nickname = CASE
  WHEN role = 'admin' AND LOWER(first_name) = 'admin' THEN 'admin'
  ELSE CONCAT('user', id)
END;

ALTER TABLE users
  MODIFY nickname VARCHAR(100) NOT NULL,
  ADD UNIQUE INDEX uq_users_nickname (nickname);

CREATE TABLE tt_user_progress (
  user_id INT PRIMARY KEY,
  feedback_completed_at DATETIME NULL,
  vote_participations INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tt_user_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tt_user_referrals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  referrer_user_id INT NOT NULL,
  referred_user_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tt_referral_referred (referred_user_id),
  INDEX idx_tt_referral_referrer (referrer_user_id),
  CONSTRAINT fk_tt_referral_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_referral_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO tt_user_progress (user_id)
SELECT id FROM users;

INSERT INTO tt_user_storage_quotas (user_id, limit_bytes)
SELECT id, 104857600 FROM users
ON DUPLICATE KEY UPDATE limit_bytes = GREATEST(limit_bytes, 104857600);
