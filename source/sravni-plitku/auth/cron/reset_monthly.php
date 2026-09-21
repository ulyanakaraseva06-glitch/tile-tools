<?php
/* cron/reset_monthly.php — массовый сброс месячных счётчиков.
   Запускается планировщиком (cron) 1-го числа каждого месяца:
       0 0 1 * *   php /полный/путь/auth/cron/reset_monthly.php
   Сброс также происходит автоматически при первом скачивании в новом месяце
   (на случай, если cron не настроен) — это лишь страховка.
*/
require_once __DIR__ . '/../functions.php';

// Разрешаем запуск только из консоли (или с секретным ключом, если когда-то нужно через web)
if (php_sapi_name() !== 'cli') {
    // при веб-доступе требуем ключ ?key=... совпадающий с SESSION_NAME-подобным секретом
    if (!isset($_GET['key']) || $_GET['key'] !== sha1(DB_NAME . DB_PASS)) {
        http_response_code(403);
        die('forbidden');
    }
}

$cur = date('Y-m');
$stmt = db()->prepare('UPDATE users SET downloads_monthly = 0, downloads_reset_month = ? WHERE downloads_reset_month IS NULL OR downloads_reset_month <> ?');
$stmt->execute([$cur, $cur]);

echo 'Месячные счётчики сброшены для месяца ' . $cur . '. Обновлено строк: ' . $stmt->rowCount() . "\n";
