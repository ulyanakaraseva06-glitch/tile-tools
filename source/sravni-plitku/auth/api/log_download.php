<?php
/* ================================================================
   auth/api/log_download.php — учёт скачиваний + проверка лимита (ЭТАП 05).
   Приём JSON POST:
     { csrf, sessionKey, sceneId, selection:{zone:tileId,...}, exportFormat }
   Логика:
     1) проверка пользователя и CSRF;
     2) проверка доступа (бан/ограничение/одобрение);
     3) ленивый сброс месячного счётчика;
     4) лимит превышен -> запись download_events.status='blocked_limit', ok:false;
     5) иначе -> инкремент счётчиков + запись status='attempt', вернуть downloadEventId.
   Запись в download_events — best-effort (если таблиц аналитики нет, лимит всё
   равно работает). Подтверждение факта генерации — в confirm_download.php.
================================================================ */
require_once __DIR__ . '/../functions.php';
header('Content-Type: application/json; charset=utf-8');
app_session_start();

/* ---- небольшие локальные помощники (без зависимости от модуля analytics) ---- */
function dl_table_ready() {
    static $r = null;
    if ($r !== null) return $r;
    try { $r = (bool)db()->query("SHOW TABLES LIKE 'download_events'")->fetchColumn(); }
    catch (Throwable $e) { $r = false; }
    return $r;
}
function dl_clean_scene($v) {
    $s = trim((string)$v);
    return $s === '' ? null : mb_substr($s, 0, 120);
}
function dl_selection_json($sel) {
    if (!is_array($sel) || !$sel) return null;
    $clean = [];
    foreach ($sel as $zone => $tile) {
        $z = mb_substr(trim((string)$zone), 0, 120);
        $t = mb_substr(trim((string)$tile), 0, 120);
        if ($z !== '') $clean[$z] = $t;
        if (count($clean) >= 50) break;
    }
    if (!$clean) return null;
    $json = json_encode($clean, JSON_UNESCAPED_UNICODE);
    return ($json === false || strlen($json) > 8192) ? null : $json;
}
function dl_format($v) {
    $f = strtolower(trim((string)$v));
    return in_array($f, ['jpg','jpeg','png','webp'], true) ? $f : 'jpg';
}

$user = current_user();
if (!$user) { echo json_encode(['ok' => false, 'reason' => 'auth']); exit; }

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];
if (!csrf_check($body['csrf'] ?? ($_POST['csrf'] ?? ''))) {
    echo json_encode(['ok' => false, 'reason' => 'csrf']); exit;
}

list($allowed) = access_gate($user);
if (!$allowed) { echo json_encode(['ok' => false, 'reason' => 'access']); exit; }

ensure_month_reset($user);
$limit      = effective_limit($user);
$usedBefore = (int)$user['downloads_monthly'];

$sessionKey = isset($body['sessionKey']) ? mb_substr(trim((string)$body['sessionKey']), 0, 64) : null;
$sceneId    = dl_clean_scene($body['sceneId'] ?? null);
$selJson    = dl_selection_json($body['selection'] ?? null);
$format     = dl_format($body['exportFormat'] ?? 'jpg');

/* ---- запись строки в download_events (best-effort) ---- */
function dl_insert($userId, $sessionKey, $sceneId, $format, $selJson, $limit, $usedBefore, $usedAfter, $status) {
    if (!dl_table_ready()) return null;
    try {
        $st = db()->prepare('INSERT INTO download_events
            (user_id, session_key, scene_id, export_format, selection_json,
             limit_snapshot, used_before, used_after, status, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,NOW())');
        $st->execute([
            (int)$userId, $sessionKey, $sceneId, $format, $selJson,
            (int)$limit, (int)$usedBefore, ($usedAfter === null ? null : (int)$usedAfter), $status,
        ]);
        return (int)db()->lastInsertId();
    } catch (Throwable $e) { return null; }
}

/* ---- 4) лимит превышен ---- */
if ($usedBefore >= $limit) {
    dl_insert($user['id'], $sessionKey, $sceneId, $format, $selJson, $limit, $usedBefore, $usedBefore, 'blocked_limit');
    echo json_encode(['ok' => false, 'reason' => 'limit', 'limit' => $limit, 'used' => $usedBefore]);
    exit;
}

/* ---- 5) лимит не превышен: инкремент + attempt ---- */
db()->prepare('UPDATE users SET downloads_monthly = downloads_monthly + 1, downloads_total = downloads_total + 1 WHERE id = ?')
    ->execute([$user['id']]);
$usedAfter = $usedBefore + 1;

$eventId = dl_insert($user['id'], $sessionKey, $sceneId, $format, $selJson, $limit, $usedBefore, $usedAfter, 'attempt');

echo json_encode([
    'ok'              => true,
    'limit'           => $limit,
    'used'            => $usedAfter,
    'downloadEventId' => $eventId,   // может быть null, если таблиц аналитики ещё нет
]);
