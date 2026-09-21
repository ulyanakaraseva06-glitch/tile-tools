<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $user = tt_current_user();
    if (!$user) {
        tt_start_session();
        tt_json(['ok' => true, 'items' => array_map(static fn(string $id): array => ['entity_type' => 'tile', 'entity_id' => $id], array_values((array) ($_SESSION['guest_tile_favorites'] ?? [])))]);
    }
    $statement = tt_pdo()->prepare('SELECT entity_type, entity_id, created_at FROM tt_favorite_items WHERE user_id = ? ORDER BY created_at DESC');
    $statement->execute([(int) $user['id']]);
    tt_json(['ok' => true, 'items' => $statement->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    tt_abort(405, 'method_not_allowed', 'Use GET, PUT or DELETE.');
}

$body = tt_json_body();
tt_require_csrf($body);
$user = tt_current_user();
$entityType = (string) ($body['entityType'] ?? '');
$entityId = trim((string) ($body['entityId'] ?? ''));
$allowedTypes = ['tile', 'media', 'equipment', 'project', 'service'];
if (!in_array($entityType, $allowedTypes, true) || $entityId === '' || mb_strlen($entityId) > 255) {
    tt_abort(422, 'invalid_favorite', 'Unsupported favorite entity.');
}

if (!$user) {
    if ($entityType !== 'tile') tt_abort(401, 'auth_required', 'Authentication required.');
    tt_start_session();
    $favorites = array_values(array_unique(array_filter((array) ($_SESSION['guest_tile_favorites'] ?? []), 'is_string')));
    if ($_SERVER['REQUEST_METHOD'] === 'PUT' && !in_array($entityId, $favorites, true)) $favorites[] = $entityId;
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') $favorites = array_values(array_filter($favorites, static fn(string $id): bool => $id !== $entityId));
    $_SESSION['guest_tile_favorites'] = array_slice($favorites, 0, 500);
    tt_json(['ok' => true, 'favorite' => ['entityType' => $entityType, 'entityId' => $entityId]], $_SERVER['REQUEST_METHOD'] === 'PUT' ? 201 : 200);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $statement = tt_pdo()->prepare('INSERT IGNORE INTO tt_favorite_items (user_id, entity_type, entity_id) VALUES (?, ?, ?)');
    $statement->execute([(int) $user['id'], $entityType, $entityId]);
    tt_json(['ok' => true, 'favorite' => ['entityType' => $entityType, 'entityId' => $entityId]], 201);
}

$statement = tt_pdo()->prepare('DELETE FROM tt_favorite_items WHERE user_id = ? AND entity_type = ? AND entity_id = ?');
$statement->execute([(int) $user['id'], $entityType, $entityId]);
tt_json(['ok' => true]);
