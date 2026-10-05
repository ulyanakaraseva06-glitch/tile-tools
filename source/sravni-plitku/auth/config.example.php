<?php
/* ================================================================
   config.example.php — ШАБЛОН настроек.
   Скопируйте этот файл в config.php и впишите реальные значения.
   Реальный config.php НЕ должен попадать в передаваемые/публичные архивы.
================================================================ */

/* --- Данные подключения к базе данных (из ISPmanager) --- */
define('DB_HOST', 'localhost');
define('DB_NAME', 'database_name');
define('DB_USER', 'database_user');
define('DB_PASS', 'database_password');
define('DB_CHARSET', 'utf8mb4');

/* --- Лимит скачиваний по умолчанию (на месяц) для нового пользователя ---
   Итоговый лимит пользователя = эта константа + персональный «бонус» (его задаёт админ). */
define('DEFAULT_MONTHLY_LIMIT', 20);

/* --- Имя cookie сессии --- */
define('SESSION_NAME', 'SPSESSID');
// Для общей авторизации укажите ту же папку сессий, что и в Tile Tools.
define('SESSION_SAVE_PATH', '');

/* --- Адрес страницы входа (для редиректов) --- */
define('LOGIN_URL', 'auth/login.php');
