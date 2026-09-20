<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/projects.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    tt_abort(405, 'method_not_allowed', 'Use GET.');
}

$user = tt_require_user();
$pdo = tt_pdo();
$project = tt_find_owned_project($pdo, (int) $user['id'], (string) ($_GET['id'] ?? ''));
$items = tt_project_items($pdo, (string) $project['id']);
$media = tt_project_media_for_export($pdo, (string) $project['id'], (int) $user['id']);
$manifest = [
    'format' => TT_TRANSFER_FORMAT,
    'formatVersion' => TT_TRANSFER_VERSION,
    'exportedAt' => gmdate('c'),
    'project' => [
        'sourceId' => $project['id'],
        'projectType' => $project['project_type'],
        'schemaVersion' => (int) $project['schema_version'],
        'title' => $project['title'],
        'payload' => $project['payload'],
    ],
    'items' => $items,
    'media' => [],
];

$safeTitle = preg_replace('/[^a-z0-9_-]+/iu', '-', (string) $project['title']) ?: 'tile-tools-project';
$safeTitle = trim($safeTitle, '-');
if (!class_exists('ZipArchive')) {
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $safeTitle . '.tiletools-project.json"');
    echo json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
    exit;
}

$temp = tempnam(sys_get_temp_dir(), 'tile-tools-export-');
if ($temp === false) {
    tt_abort(500, 'export_unavailable', 'Export package could not be created.');
}
$archive = new ZipArchive();
if ($archive->open($temp, ZipArchive::OVERWRITE) !== true) {
    @unlink($temp);
    tt_abort(500, 'export_unavailable', 'Export package could not be opened.');
}
foreach ($media as $asset) {
    $path = tt_safe_storage_path((string) $asset['storage_key']);
    if ($path === null || !is_file($path)) {
        continue;
    }
    $extension = pathinfo($path, PATHINFO_EXTENSION);
    $entry = 'media/' . $asset['id'] . '.' . $extension;
    if (!$archive->addFile($path, $entry)) {
        continue;
    }
    $manifest['media'][] = [
        'sourceId' => $asset['id'],
        'packagePath' => $entry,
        'originalName' => $asset['original_name'],
        'mimeType' => $asset['mime_type'],
        'bytes' => (int) $asset['bytes'],
        'checksumSha256' => $asset['checksum_sha256'],
    ];
}
$archive->addFromString('manifest.json', json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
$archive->close();

header('Content-Type: application/zip');
header('Content-Length: ' . (string) filesize($temp));
header('Content-Disposition: attachment; filename="' . $safeTitle . '.tiletools-project.zip"');
header('Cache-Control: no-store');
readfile($temp);
@unlink($temp);
exit;
