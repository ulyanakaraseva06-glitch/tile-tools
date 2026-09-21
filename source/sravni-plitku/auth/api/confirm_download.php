<?php
/* ================================================================
   auth/api/confirm_download.php — подтверждение результата скачивания (ЭТАП 05).
   Вызывается фронтом ПОСЛЕ генерации JPG.
   Приём JSON POST:
     { csrf, downloadEventId, status:'success'|'failed', errorMessage? }
   Обновляет строку download_events, ТОЛЬКО если она принадлежит этому
   пользователю и сейчас в статусе 'attempt' (нельзя перезаписать
   blocked_limit/чужую запись). Счётчик скачиваний здесь НЕ трогаем:
   списание уже произошло на этапе attempt (политика — по роудмапу).
================================================================ */
require_once __DIR__ . '/../functions.php';
header('Content-Type: application/json; charset=utf-8');
app_session_start();

$user = current_user();
if (!$user) { echo json_encode(['ok' => false, 'reason' => 'auth']); exit; }

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];
if (!csrf_check($body['csrf'] ?? '')) {
    echo json_encode(['ok' => false, 'reason' => 'csrf']); exit;
}

$eventId = isset($body['downloadEventId']) ? (int)$body['downloadEventId'] : 0;
$status  = (string)($body['status'] ?? '');
if ($eventId <= 0 || !in_array($status, ['success', 'failed'], true)) {
    echo json_encode(['ok' => false, 'reason' => 'bad_request']); exit;
}

$errMsg = null;
if ($status === 'failed') {
    $errMsg = trim((string)($body['errorMessage'] ?? ''));
    $errMsg = $errMsg === '' ? null : mb_substr($errMsg, 0, 500);
}

/* Таблицы аналитики могут отсутствовать — это не ошибка для клиента. */
try {
    $exists = (bool)db()->query("SHOW TABLES LIKE 'download_events'")->fetchColumn();
    if (!$exists) { echo json_encode(['ok' => true, 'updated' => false]); exit; }

    $st = db()->prepare("UPDATE download_events
        SET status = ?, error_message = ?
        WHERE id = ? AND user_id = ? AND status = 'attempt'");
    $st->execute([$status, $errMsg, $eventId, (int)$user['id']]);

    echo json_encode(['ok' => true, 'updated' => $st->rowCount() > 0]);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'reason' => 'server']);
}
