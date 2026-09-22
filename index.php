<?php
declare(strict_types=1);

require __DIR__ . '/app/page.php';

$allowedPages = [
    'home', 'visualizer', 'calculator', 'pdf', 'equipment', 'media',
    'projects', 'services', 'partners', 'favorites', 'account'
];
$page = (string) ($_GET['page'] ?? 'home');
if (!in_array($page, $allowedPages, true)) {
    http_response_code(404);
    $page = 'home';
}

tt_render_page($page);
