<?php
declare(strict_types=1);

/*
 * CLI import, example:
 * php catalog/import_sravni_catalog.php --source="C:\\path\\to\\sravni-plitku" --copy-images
 *
 * The command never modifies the source project. It reads its tiles.json and,
 * when requested, copies only referenced preview images to Tile Tools storage.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require dirname(__DIR__) . '/shared/projects.php';

$options = getopt('', ['source:', 'copy-images']);
$source = isset($options['source']) ? rtrim((string) $options['source'], '/\\') : '';
$tilesFile = $source . DIRECTORY_SEPARATOR . 'catalog' . DIRECTORY_SEPARATOR . 'tiles.json';
if ($source === '' || !is_file($tilesFile)) {
    fwrite(STDERR, "Source directory must contain catalog/tiles.json.\n");
    exit(1);
}

try {
    $tiles = json_decode((string) file_get_contents($tilesFile), true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException) {
    fwrite(STDERR, "tiles.json is not valid JSON.\n");
    exit(1);
}
if (!is_array($tiles)) {
    fwrite(STDERR, "tiles.json must contain an array.\n");
    exit(1);
}

$pdo = tt_pdo();
$upsert = $pdo->prepare(
    'INSERT INTO tt_catalog_tiles (id, name, short_name, brand, colors, sizes, surfaces, designs, hex_color, source_payload, preview_media_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), short_name=VALUES(short_name), brand=VALUES(brand), colors=VALUES(colors), sizes=VALUES(sizes), surfaces=VALUES(surfaces), designs=VALUES(designs), hex_color=VALUES(hex_color), source_payload=VALUES(source_payload), preview_media_id=COALESCE(VALUES(preview_media_id), preview_media_id)'
);
$insertMedia = $pdo->prepare("INSERT INTO tt_media_assets (id, owner_user_id, scope, kind, original_name, storage_key, mime_type, bytes, width_px, height_px, checksum_sha256, status, published_at) VALUES (?, NULL, 'system', 'image', ?, ?, ?, ?, ?, ?, ?, 'ready', NOW())");
$upsertMedia = $pdo->prepare('UPDATE tt_catalog_tiles SET preview_media_id = ? WHERE id = ?');
$storageRoot = rtrim((string) tt_config()['app']['storage_root'], '/\\');
$copyImages = array_key_exists('copy-images', $options);
$findExistingPreview = $pdo->prepare('SELECT preview_media_id FROM tt_catalog_tiles WHERE id = ? LIMIT 1');
$count = 0;
$copied = 0;

foreach ($tiles as $tile) {
    if (!is_array($tile) || !is_string($tile['id'] ?? null) || trim((string) $tile['id']) === '') {
        continue;
    }
    $id = trim((string) $tile['id']);
    $previewMediaId = null;
    $findExistingPreview->execute([$id]);
    $existingPreviewId = $findExistingPreview->fetchColumn();
    if (is_string($existingPreviewId) && tt_valid_uuid($existingPreviewId)) {
        $previewMediaId = $existingPreviewId;
    }
    if ($copyImages && $previewMediaId === null && is_string($tile['tileImg'] ?? null) && preg_match('#^images/tiles/[a-zA-Z0-9_./-]+\.(jpg|jpeg|png|webp)$#', $tile['tileImg'])) {
        $original = realpath($source . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $tile['tileImg']));
        $sourceReal = realpath($source);
        if ($original && $sourceReal && str_starts_with($original, $sourceReal) && is_file($original)) {
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($original);
            if (is_string($mime) && in_array($mime, tt_config()['app']['allowed_image_mimes'], true)) {
                $previewMediaId = tt_uuid();
                $extension = pathinfo($original, PATHINFO_EXTENSION);
                $key = 'system/catalog/' . $previewMediaId . '.' . $extension;
                $target = $storageRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $key);
                $dir = dirname($target);
                if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
                    throw new RuntimeException('Cannot create system storage.');
                }
                if (!copy($original, $target)) {
                    throw new RuntimeException('Cannot copy source preview image.');
                }
                $size = filesize($target);
                $dimensions = @getimagesize($target) ?: [null, null];
                $insertMedia->execute([$previewMediaId, basename($original), $key, $mime, $size, $dimensions[0], $dimensions[1], hash_file('sha256', $target)]);
                $copied++;
            }
        }
    }
    $upsert->execute([
        $id,
        mb_substr((string) ($tile['name'] ?? $id), 0, 255),
        mb_substr((string) ($tile['shortName'] ?? ''), 0, 255) ?: null,
        mb_substr((string) ($tile['brand'] ?? ''), 0, 160) ?: null,
        json_encode(array_values((array) ($tile['color'] ?? [])), JSON_UNESCAPED_UNICODE),
        json_encode(array_values((array) ($tile['size'] ?? [])), JSON_UNESCAPED_UNICODE),
        json_encode(array_values((array) ($tile['surface'] ?? [])), JSON_UNESCAPED_UNICODE),
        json_encode(array_values((array) ($tile['design'] ?? [])), JSON_UNESCAPED_UNICODE),
        preg_match('/^#[0-9a-f]{6}$/i', (string) ($tile['hex'] ?? '')) ? $tile['hex'] : null,
        json_encode($tile, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        $previewMediaId,
    ]);
    $count++;
}

fwrite(STDOUT, "Imported metadata: {$count}; copied preview images: {$copied}.\n");
