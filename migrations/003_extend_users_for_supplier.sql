-- Выполнять отдельно на staging после проверки текущего определения users.role.
-- Поставщик может публиковать материалы в общую медиатеку без модерации.
-- Перед запуском убедиться, что на сервере MySQL поддерживает данное ENUM-значение.

ALTER TABLE users
  MODIFY COLUMN role ENUM('user', 'admin', 'supplier') NOT NULL DEFAULT 'user';
