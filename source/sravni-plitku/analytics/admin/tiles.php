<?php
/* ================================================================
   analytics/admin/tiles.php — аналитика плитки (ЭТАП 08).
   Главная таблица + фильтры + сортировка + топ брендов/цветов/размеров.
   CSV-экспорт — analytics/admin/export.php?type=tiles (те же фильтры).
   Доступ — только админ.
================================================================ */
require_once __DIR__ . '/../functions.php';
$admin = require_admin();

/* --- период --- */
$period = $_GET['period'] ?? '30d';
$allowedPeriods = ['today' => 'Сегодня', '7d' => '7 дней', '30d' => '30 дней', 'all' => 'Всё время'];
if (!isset($allowedPeriods[$period])) $period = '30d';

/* --- параметры фильтров/сортировки --- */
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

/* --- данные --- */
$rows    = analytics_tile_table($f);
$opts    = analytics_tile_filter_options($period);
$brands  = analytics_tile_group($period, 'brand', 20);
$colors  = analytics_tile_group($period, 'color', 20);
$sizes   = analytics_tile_group($period, 'size', 20);
$ready   = analytics_ready();

/* --- хелперы вывода --- */
function t_num($n)  { return number_format((int)$n, 0, '.', ' '); }
function t_dt($s)   { return $s ? date('d.m.Y H:i', strtotime($s)) : '—'; }
function t_conv($c) { return rtrim(rtrim(number_format((float)$c, 1, '.', ''), '0'), '.') . '%'; }

/* строка query c учётом текущих фильтров + переопределений */
function t_qs($f, $over = []) {
    $p = array_merge([
        'period'=>$f['period'],'brand'=>$f['brand'],'color'=>$f['color'],'size'=>$f['size'],
        'surface'=>$f['surface'],'design'=>$f['design'],'q'=>$f['tile_id'],'sort'=>$f['sort'],'dir'=>$f['dir'],
    ], $over);
    $p = array_filter($p, function ($v) { return $v !== '' && $v !== null; });
    return http_build_query($p);
}
/* ссылка-заголовок сортировки */
function t_sort_th($f, $label, $col) {
    $isCur = ($f['sort'] === $col);
    $newDir = ($isCur && $f['dir'] === 'desc') ? 'asc' : 'desc';
    $arrow = $isCur ? ($f['dir'] === 'desc' ? ' ▾' : ' ▴') : '';
    $url = '?' . t_qs($f, ['sort'=>$col, 'dir'=>$newDir]);
    return '<th><a href="' . h($url) . '">' . h($label) . $arrow . '</a></th>';
}
function t_select($name, $cur, $values, $placeholder) {
    $h = '<select name="' . h($name) . '">';
    $h .= '<option value="">' . h($placeholder) . '</option>';
    foreach ($values as $v) {
        $sel = ((string)$v === (string)$cur) ? ' selected' : '';
        $h .= '<option value="' . h($v) . '"' . $sel . '>' . h($v) . '</option>';
    }
    return $h . '</select>';
}

/* --- переключатель периода (сохраняет фильтры) --- */
$range = '<div class="range">';
foreach ($allowedPeriods as $key => $label) {
    $cls = $key === $period ? ' class="active"' : '';
    $range .= '<a href="?' . h(t_qs($f, ['period'=>$key])) . '"' . $cls . '>' . h($label) . '</a>';
}
$range .= '</div>';

ob_start();
?>
<h1>Аналитика плитки</h1>
<p class="muted">
  <a href="<?= h(app_relative_url('analytics/admin/dashboard.php')) ?>">← Дашборд</a> ·
  Что реально выбирают пользователи. Период: <strong><?= h($allowedPeriods[$period]) ?></strong>
</p>

<?php if (!$ready): ?>
<div class="alert alert--info">Таблицы аналитики ещё не созданы — выполните <code>analytics/install.sql</code> в phpMyAdmin.</div>
<?php endif; ?>

<?= $range ?>

<div class="panel">
  <h2>Фильтры</h2>
  <form method="get" class="tile-filters">
    <input type="hidden" name="period" value="<?= h($period) ?>">
    <input type="hidden" name="sort" value="<?= h($f['sort']) ?>">
    <input type="hidden" name="dir" value="<?= h($f['dir']) ?>">
    <?= t_select('brand',   $f['brand'],   $opts['brand'],   'Бренд: все') ?>
    <?= t_select('color',   $f['color'],   $opts['color'],   'Цвет: все') ?>
    <?= t_select('size',    $f['size'],    $opts['size'],    'Размер: все') ?>
    <?= t_select('surface', $f['surface'], $opts['surface'], 'Поверхность: все') ?>
    <?= t_select('design',  $f['design'],  $opts['design'],  'Дизайн: все') ?>
    <input type="text" name="q" value="<?= h($f['tile_id']) ?>" placeholder="Поиск по tile_id">
    <button class="btn btn--primary btn--sm" type="submit">Применить</button>
    <a class="btn btn--ghost btn--sm" href="?period=<?= h($period) ?>">Сбросить</a>
  </form>
  <p style="margin-top:10px"><a class="btn btn--neutral btn--sm" href="export.php?type=tiles&amp;<?= h(t_qs($f)) ?>">⬇ Экспорт CSV</a></p>
</div>

<div class="panel">
  <h2>Плитки <span class="muted" style="font-size:12px">(найдено: <?= t_num(count($rows)) ?>)</span></h2>
  <?php if (!$rows): ?><p class="muted">Нет данных за период / по фильтрам.</p><?php else: ?>
  <div class="table-wrap"><table><thead><tr>
    <?= t_sort_th($f, 'tile_id', 'tile_id') ?>
    <th>Бренд</th><th>Коллекция</th><th>Цвет</th><th>Размер</th><th>Поверхн.</th><th>Дизайн</th>
    <?= t_sort_th($f, 'Примен.', 'applies') ?>
    <?= t_sort_th($f, 'Ко всем', 'applies_all') ?>
    <?= t_sort_th($f, 'Избр.', 'favorites') ?>
    <?= t_sort_th($f, 'Скач.', 'downloads') ?>
    <?= t_sort_th($f, 'Конв.', 'conversion') ?>
    <?= t_sort_th($f, 'Активность', 'last_activity') ?>
  </tr></thead><tbody>
    <?php foreach ($rows as $r): ?>
    <tr>
      <td><?= h($r['tile_id']) ?></td>
      <td><?= h($r['brand'] ?: '—') ?></td>
      <td><?= h($r['collection'] ?: '—') ?></td>
      <td><?= h($r['color'] ?: '—') ?></td>
      <td><?= h($r['size'] ?: '—') ?></td>
      <td><?= h($r['surface'] ?: '—') ?></td>
      <td><?= h($r['design'] ?: '—') ?></td>
      <td><?= t_num($r['applies']) ?></td>
      <td><?= t_num($r['applies_all']) ?></td>
      <td><?= t_num($r['favorites']) ?></td>
      <td><?= t_num($r['downloads']) ?></td>
      <td><?= t_conv($r['conversion']) ?></td>
      <td><?= t_dt($r['last_activity']) ?></td>
    </tr>
    <?php endforeach; ?>
  </tbody></table></div>
  <?php endif; ?>
</div>

<?php
$groupTable = function ($title, $rows, $valLabel, $withFav) {
    $h = '<div class="panel"><h2>' . h($title) . '</h2>';
    if (!$rows) return $h . '<p class="muted">Нет данных за период.</p></div>';
    $h .= '<div class="table-wrap"><table><thead><tr><th>' . h($valLabel) . '</th><th>Применений</th>';
    if ($withFav) $h .= '<th>Избранное</th>';
    $h .= '<th>Скачиваний</th></tr></thead><tbody>';
    foreach ($rows as $r) {
        $h .= '<tr><td>' . h($r['value'] ?: '—') . '</td><td>' . t_num($r['applies']) . '</td>';
        if ($withFav) $h .= '<td>' . t_num($r['favorites']) . '</td>';
        $h .= '<td>' . t_num($r['downloads']) . '</td></tr>';
    }
    return $h . '</tbody></table></div></div>';
};
echo $groupTable('Топ брендов', $brands, 'Бренд', true);
echo $groupTable('Топ цветов', $colors, 'Цвет', false);
echo $groupTable('Топ размеров', $sizes, 'Размер', false);

analytics_admin_page('Аналитика плитки', ob_get_clean());
