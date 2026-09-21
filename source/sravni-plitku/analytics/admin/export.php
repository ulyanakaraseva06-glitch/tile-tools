<?php
/* ================================================================
   analytics/admin/export.php — CSV-экспорт отчётов (ЭТАП 08).
   Поддержка: ?type=tiles (+ те же фильтры, что в tiles.php).
   Доступ — только админ. Отдаёт CSV (UTF-8 с BOM для Excel).
================================================================ */
require_once __DIR__ . '/../functions.php';
$admin = require_admin();

$type = $_GET['type'] ?? '';

if ($type === 'tiles') {
    $period = $_GET['period'] ?? '30d';
    $allowed = ['today','7d','30d','all'];
    if (!in_array($period, $allowed, true)) $period = '30d';

    $f = [
        'period'  => $period,
        'brand'   => trim((string)($_GET['brand']   ?? '')),
        'color'   => trim((string)($_GET['color']   ?? '')),
        'size'    => trim((string)($_GET['size']    ?? '')),
        'surface' => trim((string)($_GET['surface'] ?? '')),
        'design'  => trim((string)($_GET['design']  ?? '')),
        'tile_id' => trim((string)($_GET['q']       ?? '')),
        'sort'    => $_GET['sort'] ?? 'applies',
        'dir'     => (($_GET['dir'] ?? 'desc') === 'asc') ? 'asc' : 'desc',
    ];
    $rows = analytics_tile_table($f);

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="tiles_' . $period . '_' . date('Ymd_His') . '.csv"');

    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF"); // BOM
    fputcsv($out, [
        'tile_id','Бренд','Коллекция','Цвет','Размер','Поверхность','Дизайн',
        'Применений','Применений ко всем','Избранное','Скачиваний','Конверсия %','Последняя активность',
    ]);
    foreach ($rows as $r) {
        fputcsv($out, [
            $r['tile_id'],
            $r['brand'] ?? '', $r['collection'] ?? '', $r['color'] ?? '',
            $r['size'] ?? '', $r['surface'] ?? '', $r['design'] ?? '',
            (int)$r['applies'], (int)$r['applies_all'], (int)$r['favorites'], (int)$r['downloads'],
            $r['conversion'],
            $r['last_activity'] ? date('Y-m-d H:i', strtotime($r['last_activity'])) : '',
        ]);
    }
    fclose($out);
    exit;
}

/* неизвестный тип — простая страница-подсказка */
analytics_admin_page('Экспорт данных',
    '<h1>Экспорт данных</h1><p class="muted">Доступен экспорт аналитики плитки: '
    . '<a href="tiles.php">откройте «Аналитика плитки»</a> и нажмите «Экспорт CSV». '
    . 'Другие выгрузки появятся на следующих этапах.</p>');
