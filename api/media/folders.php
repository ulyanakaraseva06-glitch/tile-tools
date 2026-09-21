<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/bootstrap.php';

$user = tt_require_user();
$pdo = tt_pdo();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $statement = $pdo->prepare(
        'SELECT f.id, f.name, f.created_at, f.updated_at, COUNT(ft.tile_id) AS tile_count
         FROM tt_media_folders f LEFT JOIN tt_media_folder_tiles ft ON ft.folder_id = f.id
         WHERE f.user_id = ? GROUP BY f.id ORDER BY f.updated_at DESC, f.name'
    );
    $statement->execute([(int) $user['id']]);
    tt_json(['ok' => true, 'items' => $statement->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = tt_json_body();
    tt_require_csrf($body);
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '' || mb_strlen($name) > 120) tt_abort(422, 'invalid_folder_name', 'Folder name must contain 1–120 characters.');
    $id = tt_uuid();
    try {
        $statement = $pdo->prepare('INSERT INTO tt_media_folders (id, user_id, name) VALUES (?, ?, ?)');
        $statement->execute([$id, (int) $user['id'], $name]);
    } catch (PDOException $error) {
        if ((string) $error->getCode() === '23000') tt_abort(409, 'folder_exists', 'A folder with this name already exists.');
        throw $error;
    }
    tt_json(['ok' => true, 'item' => ['id' => $id, 'name' => $name, 'tile_count' => 0]], 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $body = tt_json_body();
    tt_require_csrf($body);
    $id = (string) ($body['id'] ?? '');
    if (!tt_valid_uuid($id)) tt_abort(422, 'invalid_folder_id', 'Folder ID is invalid.');
    $statement = $pdo->prepare('DELETE FROM tt_media_folders WHERE id = ? AND user_id = ?');
    $statement->execute([$id, (int) $user['id']]);
    tt_json(['ok' => true]);
}

tt_abort(405, 'method_not_allowed', 'Use GET, POST or DELETE.');
