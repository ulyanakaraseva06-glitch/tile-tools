<?php
/* api/favorites.php — синхронизация избранного с аккаунтом */
require_once __DIR__ . '/../functions.php';
header('Content-Type: application/json; charset=utf-8');
app_session_start();

$user = current_user();
if (!$user) { echo json_encode(['ok' => false, 'reason' => 'auth']); exit; }

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];
if (!csrf_check($body['csrf'] ?? '')) { echo json_encode(['ok' => false, 'reason' => 'csrf']); exit; }

$action = $body['action'] ?? 'get';

if ($action === 'set') {
    $ids = (isset($body['favorites']) && is_array($body['favorites'])) ? $body['favorites'] : [];
    // не более 5000 элементов — простая защита
    $ids = array_slice($ids, 0, 5000);
    $ids = save_favorites($user['id'], $ids);
    echo json_encode(['ok' => true, 'favorites' => $ids]);
    exit;
}

echo json_encode(['ok' => true, 'favorites' => get_favorites($user)]);
