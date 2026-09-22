<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/projects.php';

$user = tt_require_user();
$pdo = tt_pdo();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $statement = $pdo->prepare(
        "SELECT project.id, project.project_type, project.schema_version, project.title, project.status,
                project.preview_media_id, project.created_at, project.updated_at,
                (favorite.id IS NOT NULL) AS is_favorite,
                (SELECT COUNT(*) FROM tt_project_items item WHERE item.project_id = project.id) AS item_count
         FROM tt_projects project
         LEFT JOIN tt_favorite_items favorite
           ON favorite.user_id = project.owner_user_id AND favorite.entity_type = 'project' AND favorite.entity_id = project.id
         WHERE project.owner_user_id = ? AND project.deleted_at IS NULL
         ORDER BY project.updated_at DESC LIMIT 100"
    );
    $statement->execute([(int) $user['id']]);
    tt_json(['ok' => true, 'projects' => $statement->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tt_abort(405, 'method_not_allowed', 'Use GET or POST.');
}

$body = tt_json_body();
tt_require_csrf($body);
[$type, $title, $payload, $payloadJson] = tt_validate_project_input($body);
$status = (string) ($body['status'] ?? 'draft');
if (!in_array($status, ['draft', 'active', 'done', 'archived'], true)) {
    tt_abort(422, 'invalid_project_status', 'Unsupported project status.');
}
$id = tt_uuid();
$statement = $pdo->prepare('INSERT INTO tt_projects (id, owner_user_id, project_type, schema_version, title, status, payload) VALUES (?, ?, ?, 1, ?, ?, ?)');
$statement->execute([$id, (int) $user['id'], $type, $title, $status, $payloadJson]);
tt_json(['ok' => true, 'project' => ['id' => $id, 'projectType' => $type, 'title' => $title, 'status' => $status, 'payload' => $payload]], 201);
