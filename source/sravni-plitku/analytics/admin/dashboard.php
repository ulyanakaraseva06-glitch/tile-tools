<?php
/* ================================================================
   analytics/admin/dashboard.php — главный дашборд администратора (ЭТАП 06).
   Сводка по пользователям, сессиям, событиям, плиткам, устройствам.
   Доступ — только админ (через analytics_admin_page → require_admin).
================================================================ */
require_once __DIR__ . '/../functions.php';
$admin = require_admin();

/* --- период --- */
$period = $_GET['period'] ?? '7d';
$allowedPeriods = ['today' => 'Сегодня', '7d' => '7 дней', '30d' => '30 дней', 'all' => 'Всё время'];
if (!isset($allowedPeriods[$period])) $period = '7d';

/* --- данные --- */
$k        = analytics_dashboard_kpis($period);
$topTiles = analytics_top_tiles($period, 15);
$topBrand = analytics_top_brands($period, 15);
$devices  = analytics_device_breakdown($period);
$recent   = analytics_recent_active_users($period, 15);
$ready    = analytics_ready();

/* --- хелперы вывода --- */
function dash_num($n)   { return number_format((int)$n, 0, '.', ' '); }
function dash_dt($s)    { return $s ? date('d.m.Y H:i', strtotime($s)) : '—'; }

/* --- переключатель периода --- */
$range = '<div class="range">';
foreach ($allowedPeriods as $key => $label) {
    $cls = $key === $period ? ' class="active"' : '';
    $range .= '<a href="?period=' . h($key) . '"' . $cls . '>' . h($label) . '</a>';
}
$range .= '</div>';

/* --- карточки --- */
$cards = [
    ['Пользователей всего',   dash_num($k['users_total'])],
    ['Новых за период',       dash_num($k['users_new'])],
    ['Ожидают одобрения',     dash_num($k['users_pending'])],
    ['Активных за период',    dash_num($k['users_active'])],
    ['Сессий',                dash_num($k['sessions'])],
    ['Событий',               dash_num($k['events'])],
    ['Применений плитки',     dash_num($k['tile_applies'])],
    ['В избранное',           dash_num($k['favorites'])],
    ['Скачано (успешно)',     dash_num($k['downloads_success'])],
    ['Заблокировано лимитом', dash_num($k['downloads_blocked'])],
];
$metrics = '<div class="metrics">';
foreach ($cards as $c) {
    $metrics .= '<div class="metric"><div class="n">' . $c[1] . '</div><div class="l">' . h($c[0]) . '</div></div>';
}
$metrics .= '</div>';

/* --- таблицы --- */
function dash_tbl_tiles($rows) {
    if (!$rows) return '<p class="muted">Нет данных за период.</p>';
    $h = '<div class="table-wrap"><table><thead><tr><th>tile_id</th><th>Применений</th><th>Избранное</th><th>Скачиваний</th></tr></thead><tbody>';
    foreach ($rows as $r) {
        $h .= '<tr><td>' . h($r['tile_id']) . '</td><td>' . dash_num($r['applies']) . '</td><td>' . dash_num($r['favorites']) . '</td><td>' . dash_num($r['downloads']) . '</td></tr>';
    }
    return $h . '</tbody></table></div>';
}
function dash_tbl_brands($rows) {
    if (!$rows) return '<p class="muted">Нет данных за период.</p>';
    $h = '<div class="table-wrap"><table><thead><tr><th>Бренд</th><th>Применений</th><th>Скачиваний</th></tr></thead><tbody>';
    foreach ($rows as $r) {
        $h .= '<tr><td>' . h($r['brand']) . '</td><td>' . dash_num($r['applies']) . '</td><td>' . dash_num($r['downloads']) . '</td></tr>';
    }
    return $h . '</tbody></table></div>';
}
function dash_tbl_devices($rows) {
    if (!$rows) return '<p class="muted">Нет данных за период.</p>';
    $h = '<div class="table-wrap"><table><thead><tr><th>Устройство</th><th>Сессий</th><th>Доля</th></tr></thead><tbody>';
    foreach ($rows as $r) {
        $share = (int)$r['share'];
        $h .= '<tr><td>' . h($r['device']) . '</td><td>' . dash_num($r['sessions']) . '</td>'
            . '<td><div class="bar"><span style="width:' . $share . '%"></span></div>' . $share . '%</td></tr>';
    }
    return $h . '</tbody></table></div>';
}
function dash_tbl_recent($rows) {
    if (!$rows) return '<p class="muted">Нет активных пользователей за период.</p>';
    $h = '<div class="table-wrap"><table><thead><tr><th>Пользователь</th><th>Компания</th><th>Последняя активность</th><th>Событий</th><th>Скачиваний</th></tr></thead><tbody>';
    foreach ($rows as $r) {
        $name = trim($r['first_name'] . ' ' . $r['last_name']);
        if ($name === '') $name = $r['email'];
        $userLink = 'user.php?id=' . (int)$r['id'];
        $h .= '<tr>'
            . '<td><a href="' . h($userLink) . '">' . h($name) . '</a><div class="muted" style="font-size:11px">' . h($r['email']) . '</div></td>'
            . '<td>' . h($r['company'] ?: '—') . '</td>'
            . '<td>' . dash_dt($r['last_activity']) . '</td>'
            . '<td>' . dash_num($r['events']) . '</td>'
            . '<td>' . dash_num($r['downloads']) . '</td>'
            . '</tr>';
    }
    return $h . '</tbody></table></div>';
}

/* --- сборка тела --- */
ob_start();
?>
<h1>Дашборд аналитики</h1>
<p class="muted">Сводка состояния сервиса. Период: <strong><?= h($allowedPeriods[$period]) ?></strong></p>

<?php if (!$ready): ?>
<div class="alert alert--info">Таблицы аналитики ещё не созданы — выполните <code>analytics/install.sql</code> в phpMyAdmin. Пока показаны только данные по пользователям.</div>
<?php endif; ?>

<?= $range ?>
<?= $metrics ?>

<div class="panel">
  <h2>Топ плиток</h2>
  <?= dash_tbl_tiles($topTiles) ?>
</div>

<div class="panel">
  <h2>Топ брендов</h2>
  <?= dash_tbl_brands($topBrand) ?>
</div>

<div class="panel">
  <h2>Устройства</h2>
  <?= dash_tbl_devices($devices) ?>
</div>

<div class="panel">
  <h2>Последние активные пользователи</h2>
  <?= dash_tbl_recent($recent) ?>
</div>
<?php
$body = ob_get_clean();

analytics_admin_page('Дашборд аналитики', $body);
