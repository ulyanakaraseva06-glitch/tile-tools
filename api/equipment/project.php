<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tt_abort(405, 'method_not_allowed', 'Use POST.');
}

$body = tt_json_body();
tt_require_csrf($body);
$user = tt_require_user();
$equipmentId = trim((string) ($body['equipmentId'] ?? ''));
$projectId = trim((string) ($body['projectId'] ?? ''));
if ($equipmentId === '' || $projectId === '') {
    tt_abort(422, 'invalid_project_item', 'Выберите оборудование и проект.');
}

$pdo = tt_pdo();
$equipment = $pdo->prepare('SELECT id FROM tt_equipment_items WHERE id = ? AND is_active = 1');
$equipment->execute([$equipmentId]);
if (!$equipment->fetch()) {
    tt_abort(404, 'equipment_not_found', 'Оборудование не найдено.');
}
$project = $pdo->prepare('SELECT id FROM tt_projects WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL');
$project->execute([$projectId, (int) $user['id']]);
if (!$project->fetch()) {
    tt_abort(404, 'project_not_found', 'Проект не найден или недоступен.');
}

$item = $pdo->prepare('INSERT IGNORE INTO tt_project_items (project_id, entity_type, entity_id, role_name) VALUES (?, "equipment", ?, "reference")');
$item->execute([$projectId, $equipmentId]);
tt_audit($pdo, (int) $user['id'], 'equipment_added_to_project', 'equipment', $equipmentId, ['project_id' => $projectId]);
tt_json(['ok' => true, 'created' => $item->rowCount() === 1]);
