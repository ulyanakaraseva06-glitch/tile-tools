-- Минимальная совместимая таблица пользователей для чистого локального окружения.
-- В отличие от install.sql исходного «Сравни плитку» здесь нет тестовых
-- администраторов и известных временных паролей.

CREATE TABLE IF NOT EXISTS users (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  email                  VARCHAR(255) NOT NULL UNIQUE,
  password_hash          VARCHAR(255) NOT NULL,
  first_name             VARCHAR(100) NOT NULL DEFAULT '',
  last_name              VARCHAR(100) NOT NULL DEFAULT '',
  company                VARCHAR(200) NOT NULL DEFAULT '',
  role                   ENUM('user','admin') NOT NULL DEFAULT 'user',
  status                 ENUM('pending','active','banned','restricted') NOT NULL DEFAULT 'pending',
  restriction_until      DATETIME NULL,
  downloads_bonus        INT NOT NULL DEFAULT 0,
  downloads_monthly      INT NOT NULL DEFAULT 0,
  downloads_total        INT NOT NULL DEFAULT 0,
  downloads_reset_month  VARCHAR(7) NULL,
  favorites              TEXT NULL,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_by            INT NULL,
  approved_at            DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
