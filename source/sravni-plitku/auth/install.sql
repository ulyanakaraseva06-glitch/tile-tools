-- ============================================================
--  install.sql — установка таблицы пользователей и 3 админов
--  Выполнить ОДИН РАЗ в phpMyAdmin (вкладка SQL) на вашей базе.
-- ============================================================

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
  downloads_bonus        INT NOT NULL DEFAULT 0,   -- прибавка/убавка к лимиту (может быть отрицательной)
  downloads_monthly      INT NOT NULL DEFAULT 0,   -- счётчик за текущий месяц
  downloads_total        INT NOT NULL DEFAULT 0,   -- всего за всё время
  downloads_reset_month  VARCHAR(7) NULL,          -- месяц последнего сброса, формат 2026-06
  favorites              TEXT NULL,                -- избранные плитки (JSON-массив id)
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_by            INT NULL,
  approved_at            DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
--  2 администратора.
--  Пароль у обоих (временный):  Sravni!Admin2026
--  ОБЯЗАТЕЛЬНО смените пароль каждого после первого входа
--  (Личный кабинет → «Сменить пароль»).
--  Поменяйте e-mail и имена на свои перед выполнением.
-- ------------------------------------------------------------
INSERT INTO users (email, password_hash, first_name, last_name, company, role, status, downloads_reset_month, approved_at) VALUES
('admin1@example.com', '$2y$10$D0fAAtA0ieiHvAyo6xHiS.vqUo.GzHeBvROUvDszBQGI4HTq9NSYq', 'Администратор', 'Первый',  'СравниПлитку', 'admin', 'active', DATE_FORMAT(NOW(),'%Y-%m'), NOW()),
('admin2@example.com', '$2y$10$D0fAAtA0ieiHvAyo6xHiS.vqUo.GzHeBvROUvDszBQGI4HTq9NSYq', 'Администратор', 'Второй',  'СравниПлитку', 'admin', 'active', DATE_FORMAT(NOW(),'%Y-%m'), NOW());
