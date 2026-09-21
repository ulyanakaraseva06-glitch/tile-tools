<?php
declare(strict_types=1);

/*
 * Integration-only router for the original sravni-plitku application.
 * It bypasses the marketing landing for / and /index.php, but serves all
 * original HTML, CSS, JS, catalogue data and images from the unified source folder.
 */

$sourceRoot = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'source' . DIRECTORY_SEPARATOR . 'sravni-plitku';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . 'shared' . DIRECTORY_SEPARATOR . 'bootstrap.php';

if ($path === '/auth/api/favorites.php') {
    tt_start_session();
    $user = tt_current_user();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = tt_json_body(); tt_require_csrf($body);
        $ids = array_values(array_unique(array_filter((array) ($body['favorites'] ?? []), static fn($id): bool => is_string($id) && $id !== '' && strlen($id) <= 120)));
        if ($user) {
            $pdo = tt_pdo(); $pdo->beginTransaction();
            $delete = $pdo->prepare("DELETE FROM tt_favorite_items WHERE user_id = ? AND entity_type = 'tile'"); $delete->execute([(int) $user['id']]);
            $insert = $pdo->prepare("INSERT IGNORE INTO tt_favorite_items (user_id, entity_type, entity_id) VALUES (?, 'tile', ?)"); foreach ($ids as $id) $insert->execute([(int) $user['id'], $id]);
            $pdo->commit();
        } else { $_SESSION['guest_tile_favorites'] = array_slice($ids, 0, 500); }
        tt_json(['ok' => true, 'favorites' => $ids]);
    }
    tt_abort(405, 'method_not_allowed', 'Use POST.');
}

if ($path === '/landing.php') {
    header('Location: /index.php', true, 302);
    exit;
}

if ($path !== '/' && $path !== '/index.php') {
    return false;
}

$html = file_get_contents($sourceRoot . DIRECTORY_SEPARATOR . 'index.html');
if ($html === false) {
    http_response_code(500);
    exit('Visualizer template was not found.');
}

$tilesJson = @file_get_contents($sourceRoot . DIRECTORY_SEPARATOR . 'catalog' . DIRECTORY_SEPARATOR . 'tiles.json');
$filtersJson = @file_get_contents($sourceRoot . DIRECTORY_SEPARATOR . 'catalog' . DIRECTORY_SEPARATOR . 'filters.json');
if ($tilesJson === false || json_decode($tilesJson) === null) {
    $tilesJson = '[]';
}
if ($filtersJson === false || json_decode($filtersJson) === null) {
    $filtersJson = 'null';
}

$demoFile = $sourceRoot . DIRECTORY_SEPARATOR . 'catalog' . DIRECTORY_SEPARATOR . 'tiles.demo.json';
if (is_file($demoFile)) {
    $realTiles = json_decode($tilesJson, true);
    $demoTiles = json_decode((string) file_get_contents($demoFile), true);
    if (is_array($realTiles) && is_array($demoTiles)) {
        $merged = json_encode(array_merge($realTiles, $demoTiles), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($merged !== false) {
            $tilesJson = $merged;
        }
    }
}

$tilesJson = str_replace(['</', "\xE2\x80\xA8", "\xE2\x80\xA9"], ['<\\/', '\\u2028', '\\u2029'], $tilesJson);
$filtersJson = str_replace(['</', "\xE2\x80\xA8", "\xE2\x80\xA9"], ['<\\/', '\\u2028', '\\u2029'], $filtersJson);

$user = tt_current_user();
if ($user) { $fav = tt_pdo()->prepare("SELECT entity_id FROM tt_favorite_items WHERE user_id = ? AND entity_type = 'tile'"); $fav->execute([(int) $user['id']]); $favoriteIds = array_column($fav->fetchAll(), 'entity_id'); $userId = (string) $user['id']; }
else { tt_start_session(); $favoriteIds = array_values((array) ($_SESSION['guest_tile_favorites'] ?? [])); $userId = 'guest'; }
$spUser = json_encode(['id' => $userId, 'favorites' => $favoriteIds, 'csrf' => tt_csrf_token()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$inject = '<script>window.SP_USER = ' . $spUser . '; window.SP_INTEGRATED = true;</script>' . "\n";
$inject .= '<script>window.SP_TILES = ' . $tilesJson . '; window.SP_FILTERS = ' . $filtersJson . ';</script>' . "\n";
$inject .= '<script src="analytics/track.js"></script>' . "\n";
$html = str_replace('<script src="export-image.js"></script>', $inject . '<script src="export-image.js"></script>', $html);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
echo $html;
