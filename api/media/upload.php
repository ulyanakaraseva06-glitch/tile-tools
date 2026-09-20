<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tt_abort(405, 'method_not_allowed', 'Use POST.');
}

tt_require_csrf([]);
$user = tt_require_user();
$file = $_FILES['file'] ?? null;
if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    tt_abort(422, 'upload_missing', 'A successfully uploaded file is required.');
}

$app = tt_config()['app'];
$size = (int) ($file['size'] ?? 0);
if ($size < 1 || $size > (int) $app['max_upload_bytes']) {
    tt_abort(422, 'file_too_large', 'The file exceeds the allowed upload size.');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file((string) $file['tmp_name']);
if (!is_string($mime) || !in_array($mime, $app['allowed_image_mimes'], true)) {
    tt_abort(422, 'unsupported_file_type', 'Only JPEG, PNG and WebP images are supported.');
}

$scope = (string) ($_POST['scope'] ?? 'personal');
if (!in_array($scope, ['personal', 'shared'], true)) {
    tt_abort(422, 'invalid_scope', 'Unsupported media scope.');
}
if ($scope === 'shared') {
    tt_require_role($user, ['supplier', 'admin']);
}

$pdo = tt_pdo();
$quota = $pdo->prepare('SELECT limit_bytes FROM tt_user_storage_quotas WHERE user_id = ?');
$quota->execute([(int) $user['id']]);
$limit = (int) ($quota->fetchColumn() ?: 104857600);
$usedStatement = $pdo->prepare("SELECT COALESCE(SUM(bytes), 0) FROM tt_media_assets WHERE owner_user_id = ? AND status IN ('ready', 'processing')");
$usedStatement->execute([(int) $user['id']]);
$used = (int) $usedStatement->fetchColumn();
if ($size > $limit - $used) {
    tt_abort(422, 'storage_quota_exceeded', 'The personal storage quota would be exceeded.');
}

$id = tt_uuid();
$extension = match ($mime) { 'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp' };
$storageKey = sprintf('users/%d/%s.%s', (int) $user['id'], $id, $extension);
$target = rtrim((string) $app['storage_root'], '/\\') . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $storageKey);
$directory = dirname($target);
if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
    tt_abort(500, 'storage_unavailable', 'The storage directory could not be created.');
}
if (!move_uploaded_file((string) $file['tmp_name'], $target)) {
    tt_abort(500, 'storage_write_failed', 'The uploaded file could not be saved.');
}

$dimensions = @getimagesize($target) ?: [null, null];
$originalName = mb_substr(basename((string) $file['name']), 0, 255);
$checksum = hash_file('sha256', $target);
try {
    $pdo->beginTransaction();
    $statement = $pdo->prepare('INSERT INTO tt_media_assets (id, owner_user_id, scope, kind, original_name, storage_key, mime_type, bytes, width_px, height_px, checksum_sha256, status, published_at) VALUES (?, ?, ?, \'image\', ?, ?, ?, ?, ?, ?, ?, \'ready\', ?)');
    $statement->execute([$id, (int) $user['id'], $scope, $originalName, $storageKey, $mime, $size, $dimensions[0], $dimensions[1], $checksum, $scope === 'shared' ? date('Y-m-d H:i:s') : null]);
    if ($scope === 'shared') {
        tt_audit($pdo, (int) $user['id'], 'media.shared_published', 'media', $id, ['bytes' => $size, 'mimeType' => $mime]);
    }
    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    @unlink($target);
    throw $exception;
}

tt_json(['ok' => true, 'media' => ['id' => $id, 'scope' => $scope, 'originalName' => $originalName, 'bytes' => $size, 'mimeType' => $mime]], 201);
