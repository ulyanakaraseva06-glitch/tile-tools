<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/projects.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tt_abort(405, 'method_not_allowed', 'Use POST.');
}
tt_require_csrf([]);
$user = tt_require_user();
if (!class_exists('ZipArchive')) {
    tt_abort(501, 'zip_extension_required', 'Project import requires the PHP ZipArchive extension.');
}
$file = $_FILES['file'] ?? null;
if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || (int) $file['size'] < 1) {
    tt_abort(422, 'import_file_required', 'A project package is required.');
}
if ((int) $file['size'] > 104857600) {
    tt_abort(422, 'import_file_too_large', 'Project package exceeds the 100 MB limit.');
}

$archive = new ZipArchive();
if ($archive->open((string) $file['tmp_name']) !== true) {
    tt_abort(422, 'invalid_project_package', 'The uploaded file is not a valid project package.');
}
try {
    $manifestRaw = $archive->getFromName('manifest.json');
    if (!is_string($manifestRaw)) {
        tt_abort(422, 'invalid_project_package', 'The package does not contain manifest.json.');
    }
    $manifest = json_decode($manifestRaw, true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($manifest) || ($manifest['format'] ?? '') !== TT_TRANSFER_FORMAT || (int) ($manifest['formatVersion'] ?? 0) !== TT_TRANSFER_VERSION) {
        tt_abort(422, 'unsupported_project_format', 'The project package format is unsupported.');
    }
    [$type, $title, $payload] = tt_validate_project_input((array) ($manifest['project'] ?? []));
    $sourceProject = (array) $manifest['project'];
    $items = $manifest['items'] ?? [];
    $media = $manifest['media'] ?? [];
    if (!is_array($items) || !is_array($media)) {
        tt_abort(422, 'invalid_project_package', 'Project items or media are invalid.');
    }
    if (count($items) > 5000 || count($media) > 200) {
        tt_abort(422, 'project_package_too_complex', 'Project package contains too many objects.');
    }

    $pdo = tt_pdo();
    $quotaStatement = $pdo->prepare('SELECT limit_bytes FROM tt_user_storage_quotas WHERE user_id = ?');
    $quotaStatement->execute([(int) $user['id']]);
    $limit = (int) ($quotaStatement->fetchColumn() ?: 104857600);
    $usedStatement = $pdo->prepare("SELECT COALESCE(SUM(bytes), 0) FROM tt_media_assets WHERE owner_user_id = ? AND status IN ('ready', 'processing')");
    $usedStatement->execute([(int) $user['id']]);
    $used = (int) $usedStatement->fetchColumn();
    $incomingBytes = 0;
    foreach ($media as $entry) {
        if (!is_array($entry)) {
            tt_abort(422, 'invalid_media_entry', 'Media entry is invalid.');
        }
        $incomingBytes += max(0, (int) ($entry['bytes'] ?? 0));
    }
    if ($incomingBytes > $limit - $used) {
        tt_abort(422, 'storage_quota_exceeded', 'Imported media would exceed the personal storage quota.');
    }

    $storageRoot = rtrim((string) tt_config()['app']['storage_root'], '/\\');
    if (!is_dir($storageRoot) && !mkdir($storageRoot, 0750, true) && !is_dir($storageRoot)) {
        tt_abort(500, 'storage_unavailable', 'Storage root could not be created.');
    }
    $mediaIdMap = [];
    $createdFiles = [];
    $pdo->beginTransaction();
    try {
        foreach ($media as $entry) {
            $sourceId = (string) ($entry['sourceId'] ?? '');
            $packagePath = (string) ($entry['packagePath'] ?? '');
            $mime = (string) ($entry['mimeType'] ?? '');
            if (!tt_valid_uuid($sourceId) || !preg_match('#^media/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$#i', $packagePath) || !in_array($mime, tt_config()['app']['allowed_image_mimes'], true)) {
                tt_abort(422, 'invalid_media_entry', 'Media entry contains unsupported values.');
            }
            $content = $archive->getFromName($packagePath);
            if (!is_string($content) || strlen($content) !== (int) $entry['bytes']) {
                tt_abort(422, 'invalid_media_entry', 'Media file is missing or has an invalid size.');
            }
            $checksum = hash('sha256', $content);
            if (!hash_equals((string) ($entry['checksumSha256'] ?? ''), $checksum)) {
                tt_abort(422, 'invalid_media_entry', 'Media file checksum does not match.');
            }
            $newId = tt_uuid();
            $extension = pathinfo($packagePath, PATHINFO_EXTENSION);
            $storageKey = 'users/' . (int) $user['id'] . '/' . $newId . '.' . $extension;
            $target = $storageRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $storageKey);
            $directory = dirname($target);
            if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
                tt_abort(500, 'storage_unavailable', 'User storage could not be created.');
            }
            if (file_put_contents($target, $content, LOCK_EX) === false) {
                tt_abort(500, 'storage_write_failed', 'Imported media could not be saved.');
            }
            $createdFiles[] = $target;
            $dimensions = @getimagesize($target) ?: [null, null];
            $insertMedia = $pdo->prepare("INSERT INTO tt_media_assets (id, owner_user_id, scope, kind, original_name, storage_key, mime_type, bytes, width_px, height_px, checksum_sha256, status) VALUES (?, ?, 'personal', 'image', ?, ?, ?, ?, ?, ?, ?, 'ready')");
            $insertMedia->execute([$newId, (int) $user['id'], mb_substr((string) ($entry['originalName'] ?? 'image'), 0, 255), $storageKey, $mime, strlen($content), $dimensions[0], $dimensions[1], $checksum]);
            $mediaIdMap[$sourceId] = $newId;
        }

        $newProjectId = tt_uuid();
        $payload = tt_replace_media_ids($payload, $mediaIdMap);
        $payloadJson = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $insertProject = $pdo->prepare("INSERT INTO tt_projects (id, owner_user_id, project_type, schema_version, title, status, payload) VALUES (?, ?, ?, ?, ?, 'draft', ?)");
        $insertProject->execute([$newProjectId, (int) $user['id'], $type, max(1, (int) ($sourceProject['schemaVersion'] ?? 1)), $title, $payloadJson]);
        $insertItem = $pdo->prepare('INSERT IGNORE INTO tt_project_items (project_id, entity_type, entity_id, role_name, sort_order) VALUES (?, ?, ?, ?, ?)');
        foreach ($items as $item) {
            if (!is_array($item) || !in_array($item['entity_type'] ?? '', ['tile', 'media', 'equipment'], true)) {
                continue;
            }
            $entityId = (string) ($item['entity_id'] ?? '');
            if (($item['entity_type'] ?? '') === 'media') {
                $entityId = $mediaIdMap[$entityId] ?? $entityId;
            }
            if ($entityId === '' || mb_strlen($entityId) > 255) {
                continue;
            }
            $insertItem->execute([$newProjectId, $item['entity_type'], $entityId, mb_substr((string) ($item['role_name'] ?? 'reference'), 0, 80), (int) ($item['sort_order'] ?? 0)]);
        }
        $audit = $pdo->prepare("INSERT INTO tt_import_audit (user_id, source_filename, project_type, result, details) VALUES (?, ?, ?, 'success', ?)");
        $audit->execute([(int) $user['id'], mb_substr(basename((string) $file['name']), 0, 255), $type, json_encode(['sourceProjectId' => $sourceProject['sourceId'] ?? null, 'mediaImported' => count($mediaIdMap)])]);
        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        foreach ($createdFiles as $created) {
            @unlink($created);
        }
        throw $exception;
    }
} catch (JsonException) {
    tt_abort(422, 'invalid_project_package', 'Project package contains invalid JSON.');
} finally {
    $archive->close();
}

tt_json(['ok' => true, 'project' => ['id' => $newProjectId, 'projectType' => $type, 'title' => $title], 'mediaImported' => count($mediaIdMap)], 201);
