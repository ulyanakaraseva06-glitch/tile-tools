<?php
declare(strict_types=1);

/*
 * Integration-only router for the original sravni-plitku application.
 * It bypasses the marketing landing for / and /index.php, but serves all
 * original HTML, CSS, JS, catalogue data and images from the unified source folder.
 */

$sourceRoot = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'source' . DIRECTORY_SEPARATOR . 'sravni-plitku';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

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

$inject = '<script>window.SP_USER = null; window.SP_INTEGRATED = true;</script>' . "\n";
$inject .= '<script>window.SP_TILES = ' . $tilesJson . '; window.SP_FILTERS = ' . $filtersJson . ';</script>' . "\n";
$inject .= '<script src="analytics/track.js"></script>' . "\n";
$html = str_replace('<script src="export-image.js"></script>', $inject . '<script src="export-image.js"></script>', $html);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
echo $html;
