<?php
declare(strict_types=1);

require_once __DIR__ . '/projects.php';

function tt_find_visible_media(PDO $pdo, ?array $user, string $mediaId): array
{
    if (!tt_valid_uuid($mediaId)) {
        tt_abort(422, 'invalid_media_id', 'Media ID must be a UUID.');
    }
    $statement = $pdo->prepare('SELECT id, owner_user_id, scope, original_name, storage_key, mime_type, bytes, status FROM tt_media_assets WHERE id = ? LIMIT 1');
    $statement->execute([$mediaId]);
    $media = $statement->fetch();
    if (!$media || $media['status'] !== 'ready') {
        tt_abort(404, 'media_not_found', 'Media was not found.');
    }
    $isOwner = $user && (int) $media['owner_user_id'] === (int) $user['id'];
    if (!$isOwner && !in_array($media['scope'], ['system', 'shared'], true)) {
        tt_abort(404, 'media_not_found', 'Media was not found.');
    }
    return $media;
}

function tt_media_download_name(array $media): string
{
    $name = trim((string) $media['original_name']);
    return $name !== '' ? $name : 'tile-tools-media';
}
