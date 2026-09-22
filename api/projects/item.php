<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/projects.php';

$user = tt_require_user();
$pdo = tt_pdo();
$projectId = (string) ($_GET['id'] ?? '');
$project = tt_find_owned_project($pdo, (int) $user['id'], $projectId);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    tt_json(['ok' => true, 'project' => [
        'id' => $project['id'],
        'projectType' => $project['project_type'],
        'schemaVersion' => (int) $project['schema_version'],
        'title' => $project['title'],
        'status' => $project['status'],
        'payload' => $project['payload'],
        'previewMediaId' => $project['preview_media_id'],
        'createdAt' => $project['created_at'],
        'updatedAt' => $project['updated_at'],
    ]]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    tt_abort(405, 'method_not_allowed', 'Use GET or PATCH.');
}

$body = tt_json_body();
tt_require_csrf($body);
$status = (string) ($body['status'] ?? $project['status']);
$title = array_key_exists('title', $body) ? trim((string) $body['title']) : (string) $project['title'];
if (!in_array($status, ['draft', 'active', 'done', 'archived'], true)) {
    tt_abort(422, 'invalid_project_status', 'Unsupported project status.');
}
if ($title === '' || mb_strlen($title) > 255) {
    tt_abort(422, 'invalid_project_title', 'Project title must contain 1 to 255 characters.');
}
$payloadJson = null;
if (array_key_exists('payload', $body)) {
    [, , , $payloadJson] = tt_validate_project_input([
        'projectType' => $project['project_type'],
        'title' => $title,
        'payload' => $body['payload'],
    ]);
}
if ($payloadJson !== null) {
    $statement = $pdo->prepare('UPDATE tt_projects SET title = ?, status = ?, payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_user_id = ?');
    $statement->execute([$title, $status, $payloadJson, $projectId, (int) $user['id']]);
} else {
    $statement = $pdo->prepare('UPDATE tt_projects SET title = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_user_id = ?');
    $statement->execute([$title, $status, $projectId, (int) $user['id']]);
}
tt_audit($pdo, (int) $user['id'], 'project_updated', 'project', $projectId, ['status' => $status]);
tt_json(['ok' => true, 'project' => ['id' => $projectId, 'title' => $title, 'status' => $status]]);
