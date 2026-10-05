<?php
/* index.php — точка входа непосредственно в визуализатор.
   Общая оболочка Tile Tools отвечает за лендинг и личный кабинет. */
require_once __DIR__ . '/auth/functions.php';
app_session_start();
$user = current_user();
if ($user) {
    [$allowed] = access_gate($user);
    if ($allowed) {
        ensure_month_reset($user);
    } else {
        $user = null;
    }
}

$sp = $user ? [
    'id'        => (int)$user['id'],
    'name'      => trim($user['first_name'] . ' ' . $user['last_name']),
    'email'     => $user['email'],
    'role'      => $user['role'],
    'favorites' => get_favorites($user),
    'monthly'   => (int)$user['downloads_monthly'],
    'limit'     => effective_limit($user),
    'csrf'      => csrf_token(),
] : null;

$html = file_get_contents(__DIR__ . '/index.html');
$inject  = '<script>window.SP_USER = ' . json_encode($sp, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';</script>' . "\n";

// Каталог плитки и списки фильтров — из catalog/*.json (источник истины, редактируется админкой).
$tilesJson   = @file_get_contents(__DIR__ . '/catalog/tiles.json');
$filtersJson = @file_get_contents(__DIR__ . '/catalog/filters.json');
if ($tilesJson === false   || json_decode($tilesJson) === null)   $tilesJson   = '[]';
if ($filtersJson === false || json_decode($filtersJson) === null) $filtersJson = 'null';

// ===== DEMO TILES (временные фейковые плитки для теста UI/пагинации) =====
// Чтобы убрать — удалите файл catalog/tiles.demo.json (этот блок станет no-op) либо удалите сам блок.
$spDemoFile = __DIR__ . '/catalog/tiles.demo.json';
if (is_file($spDemoFile)) {
    $spReal = json_decode($tilesJson, true);
    $spDemo = json_decode((string)@file_get_contents($spDemoFile), true);
    if (is_array($spReal) && is_array($spDemo)) {
        $spMerged = json_encode(array_merge($spReal, $spDemo), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($spMerged !== false) $tilesJson = $spMerged;
    }
}
// ===== /DEMO TILES =====

// Безопасное встраивание в <script>: не дать данным «разорвать» тег.
$tilesJson   = str_replace(['</', "\xE2\x80\xA8", "\xE2\x80\xA9"], ['<\/', '\u2028', '\u2029'], $tilesJson);
$filtersJson = str_replace(['</', "\xE2\x80\xA8", "\xE2\x80\xA9"], ['<\/', '\u2028', '\u2029'], $filtersJson);
$inject .= '<script>window.SP_TILES = ' . $tilesJson . '; window.SP_FILTERS = ' . $filtersJson . ';</script>' . "\n";

// ЭТАП 04: трекинг — подключаем ДО betavis.js, чтобы он мог звать window.SP_ANALYTICS
$inject .= '<script src="analytics/track.js"></script>' . "\n";

// внедряем до подключения скриптов визуализатора
$html = str_replace('<script src="export-image.js"></script>', $inject . '<script src="export-image.js"></script>', $html);

echo $html;
