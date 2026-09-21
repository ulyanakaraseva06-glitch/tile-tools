<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/bootstrap.php';

$user = tt_require_user();
$pdo = tt_pdo();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $folderId = (string) ($_GET['folderId'] ?? '');
    if (!tt_valid_uuid($folderId)) tt_abort(422, 'invalid_folder_id', 'Folder ID is invalid.');
    $statement = $pdo->prepare(
        'SELECT ft.tile_id FROM tt_media_folder_tiles ft
         INNER JOIN tt_media_folders f ON f.id = ft.folder_id
         WHERE ft.folder_id = ? AND f.user_id = ? ORDER BY ft.created_at DESC'
    );
    $statement->execute([$folderId, (int) $user['id']]);
    tt_json(['ok' => true, 'tileIds' => array_column($statement->fetchAll(), 'tile_id')]);
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'DELETE'], true)) {
    tt_abort(405, 'method_not_allowed', 'Use GET, PUT or DELETE.');
}
$body = tt_json_body();
tt_require_csrf($body);
$folderId = (string) ($body['folderId'] ?? '');
$tileId = trim((string) ($body['tileId'] ?? ''));
if (!tt_valid_uuid($folderId) || $tileId === '' || mb_strlen($tileId) > 120) {
    tt_abort(422, 'invalid_folder_tile', 'Folder or tile ID is invalid.');
}
$owner = $pdo->prepare('SELECT id FROM tt_media_folders WHERE id = ? AND user_id = ?');
$owner->execute([$folderId, (int) $user['id']]);
if (!$owner->fetchColumn()) tt_abort(404, 'folder_not_found', 'Folder was not found.');

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $statement = $pdo->prepare('INSERT IGNORE INTO tt_media_folder_tiles (folder_id, tile_id) SELECT ?, id FROM tt_catalog_tiles WHERE id = ?');
    $statement->execute([$folderId, $tileId]);
    if ($statement->rowCount() === 0) {
        $exists = $pdo->prepare('SELECT id FROM tt_catalog_tiles WHERE id = ?');
        $exists->execute([$tileId]);
        if (!$exists->fetchColumn()) tt_abort(404, 'tile_not_found', 'Tile was not found.');
    }
    tt_json(['ok' => true], 201);
}

$statement = $pdo->prepare('DELETE FROM tt_media_folder_tiles WHERE folder_id = ? AND tile_id = ?');
$statement->execute([$folderId, $tileId]);
tt_json(['ok' => true]);
