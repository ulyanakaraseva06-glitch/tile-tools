<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

const TT_TRANSFER_FORMAT = 'tile-tools-project';
const TT_TRANSFER_VERSION = 1;
const TT_MAX_PROJECT_PAYLOAD_BYTES = 2_097_152;

function tt_project_types(): array
{
    return ['visualization', 'calculation', 'pdf'];
}

function tt_valid_uuid(string $value): bool
{
    return (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $value);
}

function tt_validate_project_input(array $input): array
{
    $type = (string) ($input['projectType'] ?? '');
    $title = trim((string) ($input['title'] ?? ''));
    $payload = $input['payload'] ?? [];
    if (!in_array($type, tt_project_types(), true)) {
        tt_abort(422, 'invalid_project_type', 'Unsupported project type.');
    }
    if ($title === '' || mb_strlen($title) > 255) {
        tt_abort(422, 'invalid_project_title', 'Project title must contain 1 to 255 characters.');
    }
    if (!is_array($payload)) {
        tt_abort(422, 'invalid_project_payload', 'Project payload must be an object.');
    }
    try {
        $json = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } catch (JsonException) {
        tt_abort(422, 'invalid_project_payload', 'Project payload cannot be encoded.');
    }
    if (strlen($json) > TT_MAX_PROJECT_PAYLOAD_BYTES) {
        tt_abort(422, 'project_payload_too_large', 'Project payload exceeds the 2 MB limit.');
    }
    return [$type, $title, $payload, $json];
}

function tt_find_owned_project(PDO $pdo, int $userId, string $projectId): array
{
    if (!tt_valid_uuid($projectId)) {
        tt_abort(422, 'invalid_project_id', 'Project ID must be a UUID.');
    }
    $statement = $pdo->prepare('SELECT * FROM tt_projects WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL LIMIT 1');
    $statement->execute([$projectId, $userId]);
    $project = $statement->fetch();
    if (!$project) {
        tt_abort(404, 'project_not_found', 'Project was not found.');
    }
    $project['payload'] = json_decode((string) $project['payload'], true, 32, JSON_THROW_ON_ERROR);
    return $project;
}

function tt_project_items(PDO $pdo, string $projectId): array
{
    $statement = $pdo->prepare('SELECT entity_type, entity_id, role_name, sort_order FROM tt_project_items WHERE project_id = ? ORDER BY sort_order, id');
    $statement->execute([$projectId]);
    return $statement->fetchAll();
}

function tt_project_media_for_export(PDO $pdo, string $projectId, int $ownerUserId): array
{
    $statement = $pdo->prepare(
        "SELECT DISTINCT media.id, media.owner_user_id, media.scope, media.original_name, media.storage_key, media.mime_type, media.bytes, media.checksum_sha256
         FROM tt_project_items item
         INNER JOIN tt_media_assets media ON media.id = item.entity_id
         WHERE item.project_id = ? AND item.entity_type = 'media' AND media.status = 'ready'
           AND (media.owner_user_id = ? OR media.scope IN ('system', 'shared'))"
    );
    $statement->execute([$projectId, $ownerUserId]);
    return $statement->fetchAll();
}

function tt_safe_storage_path(string $storageKey): ?string
{
    if (!preg_match('#^[a-z0-9][a-z0-9/_-]*\.[a-z0-9]{2,8}$#i', $storageKey)) {
        return null;
    }
    $root = rtrim((string) tt_config()['app']['storage_root'], '/\\');
    $candidate = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $storageKey);
    $directory = realpath(dirname($candidate));
    $rootReal = realpath($root);
    if ($directory === false || $rootReal === false || !str_starts_with($directory, $rootReal)) {
        return null;
    }
    return $candidate;
}

function tt_replace_media_ids(mixed $value, array $mediaIdMap): mixed
{
    if (is_string($value)) {
        return $mediaIdMap[$value] ?? $value;
    }
    if (!is_array($value)) {
        return $value;
    }
    $updated = [];
    foreach ($value as $key => $child) {
        $updated[$key] = tt_replace_media_ids($child, $mediaIdMap);
    }
    return $updated;
}
