<?php
/* ================================================================
   analytics/api/track_event.php — приём событий аналитики (ЭТАП 04).
   Принимает JSON POST: { csrf, sessionKey, eventName, payload }.
   Пишет событие в analytics_events через analytics_track_event().
   Никогда не мешает клиенту: при любой ошибке отвечает ok:false и
   не бросает исключение наружу.
================================================================ */
require_once __DIR__ . '/../functions.php';
header('Content-Type: application/json; charset=utf-8');
app_session_start();

/* Гостей не трекаем (но и не считаем ошибкой — клиент сам не шлёт). */
$user = current_user();
if (!$user) { echo json_encode(['ok' => false, 'reason' => 'auth']); exit; }

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];

if (!csrf_check($body['csrf'] ?? '')) {
    echo json_encode(['ok' => false, 'reason' => 'csrf']); exit;
}

$sessionKey = isset($body['sessionKey']) ? (string)$body['sessionKey'] : '';
$eventName  = isset($body['eventName'])  ? (string)$body['eventName']  : '';
$payload    = isset($body['payload']) && is_array($body['payload']) ? $body['payload'] : [];

/* Белый список событий этапа 04 — чужие имена молча отбрасываем. */
$allowed = [
    'session_start', 'page_view',
    'zone_select', 'tile_apply', 'tile_apply_all',
    'favorite_add', 'favorite_remove',
    'search', 'filter_change', 'reset_scene',
    'light_temp_change', 'exposure_change',
    'download_click', 'download_success', 'download_failed',
];
if (!in_array($eventName, $allowed, true)) {
    echo json_encode(['ok' => false, 'reason' => 'event']); exit;
}

/* Поля устройства из payload.device переносим на верхний уровень payload,
   чтобы analytics_touch_session() их подхватил (он читает их из $meta). */
if (isset($payload['device']) && is_array($payload['device'])) {
    foreach (['viewport_w','viewport_h','screen_w','screen_h',
              'referrer','landing_path','utm_source','utm_medium','utm_campaign'] as $k) {
        if (isset($payload['device'][$k]) && !isset($payload[$k])) {
            $payload[$k] = $payload['device'][$k];
        }
    }
    unset($payload['device']);
}

try {
    $stored = analytics_track_event((int)$user['id'], $sessionKey, $eventName, $payload);
    echo json_encode(['ok' => true, 'stored' => (bool)$stored]);
} catch (Throwable $e) {
    // Не раскрываем детали клиенту и не валим запрос.
    echo json_encode(['ok' => false, 'reason' => 'server']);
}
