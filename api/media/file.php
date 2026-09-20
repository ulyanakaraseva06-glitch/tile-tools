<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/media.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    tt_abort(405, 'method_not_allowed', 'Use GET.');
}

tt_start_session();
$user = tt_current_user();
$media = tt_find_visible_media(tt_pdo(), $user, (string) ($_GET['id'] ?? ''));
$path = tt_safe_storage_path((string) $media['storage_key']);
if ($path === null || !is_file($path)) {
    tt_abort(404, 'media_file_not_found', 'Media file was not found.');
}

header('Content-Type: ' . $media['mime_type']);
header('Content-Length: ' . (string) filesize($path));
header('Content-Disposition: inline; filename*=UTF-8\'\'' . rawurlencode(tt_media_download_name($media)));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, max-age=3600');
readfile($path);
exit;
