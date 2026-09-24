<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tt_abort(405, 'method_not_allowed', 'Use POST.');
}

tt_require_csrf([]);
$user = tt_require_user();
tt_require_role($user, ['admin']);

$name = trim((string) ($_POST['name'] ?? ''));
$brand = trim((string) ($_POST['brand'] ?? ''));
$article = trim((string) ($_POST['article'] ?? ''));
$color = trim((string) ($_POST['color'] ?? ''));
$size = trim((string) ($_POST['size'] ?? ''));
$surface = trim((string) ($_POST['surface'] ?? ''));
$design = trim((string) ($_POST['design'] ?? ''));
$hex = strtoupper(trim((string) ($_POST['hex'] ?? '#E7E3DE')));

if (mb_strlen($name) < 2 || mb_strlen($name) > 255) {
    tt_abort(422, 'invalid_name', 'Название должно содержать от 2 до 255 символов.');
}
if (mb_strlen($brand) > 160 || mb_strlen($article) > 120) {
    tt_abort(422, 'invalid_metadata', 'Бренд или артикул слишком длинный.');
}
foreach ([$color, $size, $surface, $design] as $value) {
    if (mb_strlen($value) > 120) {
        tt_abort(422, 'invalid_metadata', 'Одна из характеристик слишком длинная.');
    }
}
if (!preg_match('/^#[0-9A-F]{6}$/D', $hex)) {
    tt_abort(422, 'invalid_hex', 'Цвет должен быть указан в формате #RRGGBB.');
}

$file = $_FILES['image'] ?? null;
if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    tt_abort(422, 'image_required', 'Добавьте изображение плитки.');
}

$app = tt_config()['app'];
$bytes = (int) ($file['size'] ?? 0);
if ($bytes < 1 || $bytes > (int) $app['max_upload_bytes']) {
    tt_abort(422, 'file_too_large', 'Изображение превышает допустимый размер.');
}
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file((string) $file['tmp_name']);
if (!is_string($mime) || !in_array($mime, $app['allowed_image_mimes'], true)) {
    tt_abort(422, 'unsupported_file_type', 'Допустимы только JPEG, PNG и WebP.');
}
$dimensions = @getimagesize((string) $file['tmp_name']);
if (!is_array($dimensions) || empty($dimensions[0]) || empty($dimensions[1])) {
    tt_abort(422, 'invalid_image', 'Файл не удалось распознать как корректное изображение.');
}

$tileId = 'admin-' . tt_uuid();
$mediaId = tt_uuid();
$extension = match ($mime) { 'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp' };
$storageKey = sprintf('system/catalog/admin/%s/%s.%s', $tileId, $mediaId, $extension);
$target = rtrim((string) $app['storage_root'], '/\\') . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $storageKey);
$directory = dirname($target);
if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
    tt_abort(500, 'storage_unavailable', 'Не удалось создать папку для изображения.');
}
if (!move_uploaded_file((string) $file['tmp_name'], $target)) {
    tt_abort(500, 'storage_write_failed', 'Не удалось сохранить изображение.');
}

$originalName = mb_substr(basename((string) $file['name']), 0, 255);
$values = static fn(string $value): string => json_encode($value === '' ? [] : [$value], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
$sourcePayload = json_encode([
    'article' => $article !== '' ? $article : null,
    'origin' => 'admin',
    'createdBy' => (int) $user['id'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

$pdo = tt_pdo();
try {
    $pdo->beginTransaction();
    $media = $pdo->prepare(
        "INSERT INTO tt_media_assets
          (id, owner_user_id, scope, kind, original_name, storage_key, mime_type, bytes, width_px, height_px, checksum_sha256, status, published_at)
         VALUES (?, ?, 'system', 'image', ?, ?, ?, ?, ?, ?, ?, 'ready', NOW())"
    );
    $media->execute([$mediaId, (int) $user['id'], $originalName, $storageKey, $mime, $bytes, $dimensions[0], $dimensions[1], hash_file('sha256', $target)]);

    $tile = $pdo->prepare(
        'INSERT INTO tt_catalog_tiles
          (id, name, short_name, brand, colors, sizes, surfaces, designs, hex_color, source_payload, preview_media_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $tile->execute([
        $tileId, $name, $name, $brand !== '' ? $brand : null,
        $values($color), $values($size), $values($surface), $values($design),
        $hex, $sourcePayload, $mediaId,
    ]);
    $pdo->prepare('INSERT INTO tt_catalog_tile_images (tile_id, media_id, sort_order) VALUES (?, ?, 0)')->execute([$tileId, $mediaId]);
    tt_audit($pdo, (int) $user['id'], 'catalog.tile_created', 'tile', $tileId, ['name' => $name, 'mediaId' => $mediaId]);
    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    @unlink($target);
    throw $exception;
}

tt_json(['ok' => true, 'tile' => ['id' => $tileId, 'name' => $name]], 201);
