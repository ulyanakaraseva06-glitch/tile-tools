<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/projects.php';

$user = tt_require_user();
$pdo = tt_pdo();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $statement = $pdo->prepare('SELECT id, project_type, schema_version, title, status, preview_media_id, created_at, updated_at FROM tt_projects WHERE owner_user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 100');
    $statement->execute([(int) $user['id']]);
    tt_json(['ok' => true, 'projects' => $statement->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tt_abort(405, 'method_not_allowed', 'Use GET or POST.');
}

$body = tt_json_body();
tt_require_csrf($body);
[$type, $title, $payload, $payloadJson] = tt_validate_project_input($body);
$id = tt_uuid();
$statement = $pdo->prepare('INSERT INTO tt_projects (id, owner_user_id, project_type, schema_version, title, payload) VALUES (?, ?, ?, 1, ?, ?)');
$statement->execute([$id, (int) $user['id'], $type, $title, $payloadJson]);
tt_json(['ok' => true, 'project' => ['id' => $id, 'projectType' => $type, 'title' => $title, 'payload' => $payload]], 201);
