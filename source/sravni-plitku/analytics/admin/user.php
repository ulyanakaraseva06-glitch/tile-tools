<?php
/* ================================================================
   analytics/admin/user.php?id=USER_ID — подробная карточка пользователя (ЭТАП 07).
   Профиль, лимиты, активность, поведение, история событий/скачиваний, заметки.
   Доступ — только админ. id приводится к int. Вывод — через h() (htmlspecialchars).
================================================================ */
require_once __DIR__ . '/../functions.php';
$admin = require_admin();

$uid = isset($_GET['id']) ? (int)$_GET['id'] : 0;

/* --- период --- */
$period = $_GET['period'] ?? '30d';
$allowedPeriods = ['today' => 'Сегодня', '7d' => '7 дней', '30d' => '30 дней', 'all' => 'Всё время'];
if (!isset($allowedPeriods[$period])) $period = '30d';

/* --- добавление заметки (POST, защита CSRF, схема PRG) --- */
$flash = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'add_note') {
    if (csrf_check($_POST['csrf'] ?? '')) {
        if (admin_notes_add($uid, $admin['id'], $_POST['note'] ?? '')) {
            $flash = 'ok';
        } else {
            $flash = 'empty';
        }
    } else {
        $flash = 'csrf';
    }
    header('Location: user.php?id=' . $uid . '&period=' . urlencode($period) . '&saved=' . $flash);
    exit;
}
$saved = $_GET['saved'] ?? '';

$user = admin_get_user($uid);

/* --- хелперы вывода --- */
function u_dt($s) { return $s ? date('d.m.Y H:i', strtotime($s)) : '—'; }
function u_date($s) { return $s ? date('d.m.Y', strtotime($s)) : '—'; }
function u_num($n) { return number_format((int)$n, 0, '.', ' '); }

/* Краткие метаданные строки события (без сырого JSON). */
function u_event_meta($r) {
    if ($r['event_name'] === 'search')      return $r['search_query'] ?: '';
    $bits = [];
    if (!empty($r['tile_color'])) $bits[] = $r['tile_color'];
    if (!empty($r['tile_size']))  $bits[] = $r['tile_size'];
    return implode(' · ', $bits);
}
/* Краткая запись выбора плиток для строки скачивания. */
function u_selection_short($json) {
    $sel = json_decode((string)$json, true);
    if (!is_array($sel) || !$sel) return '—';
    $parts = [];
    foreach ($sel as $zone => $tid) { $parts[] = $zone . ':' . $tid; if (count($parts) >= 6) break; }
    return implode(', ', $parts);
}

/* --- переключатель периода --- */
function u_range($uid, $period, $allowed) {
    $r = '<div class="range">';
    foreach ($allowed as $key => $label) {
        $cls = $key === $period ? ' class="active"' : '';
        $r .= '<a href="?id=' . (int)$uid . '&period=' . h($key) . '"' . $cls . '>' . h($label) . '</a>';
    }
    return $r . '</div>';
}

/* ================= ВЫВОД ================= */
ob_start();

if (!$user) {
    echo '<h1>Пользователь не найден</h1>';
    echo '<p class="muted">ID ' . (int)$uid . ' отсутствует в базе.</p>';
    echo '<p><a class="btn btn--ghost btn--sm" href="' . h(app_relative_url('auth/admin.php')) . '">← К списку пользователей</a></p>';
    analytics_admin_page('Карточка пользователя', ob_get_clean());
    exit;
}

/* данные */
$k         = analytics_user_kpis($uid, $period);
$topTiles  = analytics_user_top_tiles($uid, $period, 15);
$topFilt   = analytics_user_top_filters($uid, $period, 6);
$searches  = analytics_user_recent_searches($uid, 15);
$events    = analytics_user_events($uid, 100);
$downloads = analytics_user_downloads($uid, 100);
$notes     = admin_notes_list($uid);

$tmpUser = $user;
ensure_month_reset($tmpUser);                       // актуализируем месячный счётчик для показа
$limit    = effective_limit($tmpUser);
$used     = (int)$tmpUser['downloads_monthly'];
$approver = admin_get_approver_name($user['approved_by'] ?? null);
list($stLabel, $stColor) = status_label($user['status']);
$fullName = trim($user['first_name'] . ' ' . $user['last_name']);
if ($fullName === '') $fullName = $user['email'];

$devStr = '—';
if (!empty($k['devices'])) {
    $devStr = implode(', ', array_map(function ($d) { return $d['d'] . ' (' . (int)$d['c'] . ')'; }, $k['devices']));
}
?>
<h1><?= h($fullName) ?> <span class="badge" style="background:<?= h($stColor) ?>;color:#fff"><?= h($stLabel) ?></span></h1>
<p class="muted">
  <a href="<?= h(app_relative_url('analytics/admin/dashboard.php')) ?>">← Дашборд</a> ·
  <a href="<?= h(app_relative_url('auth/admin.php')) ?>">Список пользователей</a>
</p>

<?php if ($saved === 'ok'): ?><div class="alert alert--ok">Заметка добавлена.</div>
<?php elseif ($saved === 'empty'): ?><div class="alert alert--err">Заметка пустая — не сохранена.</div>
<?php elseif ($saved === 'csrf'): ?><div class="alert alert--err">Сессия истекла, повторите.</div>
<?php endif; ?>

<div class="panel">
  <h2>Профиль</h2>
  <div class="kv">
    <div>ID</div><div><?= (int)$user['id'] ?></div>
    <div>Имя</div><div><?= h($user['first_name'] ?: '—') ?></div>
    <div>Фамилия</div><div><?= h($user['last_name'] ?: '—') ?></div>
    <div>Email</div><div><?= h($user['email']) ?></div>
    <div>Компания</div><div><?= h($user['company'] ?: '—') ?></div>
    <div>Регистрация</div><div><?= u_dt($user['created_at']) ?></div>
    <div>Одобрен</div><div><?= u_dt($user['approved_at'] ?? null) ?></div>
    <div>Кто одобрил</div><div><?= h($approver ?: '—') ?></div>
    <div>Роль</div><div><?= h($user['role']) ?></div>
    <div>Статус</div><div><?= h($stLabel) ?></div>
  </div>
</div>

<div class="panel">
  <h2>Доступ и лимиты</h2>
  <div class="kv">
    <div>Статус аккаунта</div><div><?= h($stLabel) ?></div>
    <div>Месячный лимит</div><div><?= u_num($limit) ?></div>
    <div>Использовано в этом месяце</div><div><?= u_num($used) ?></div>
    <div>Всего скачиваний</div><div><?= u_num($user['downloads_total']) ?></div>
    <div>Бонус к лимиту</div><div><?= (int)$user['downloads_bonus'] ?></div>
    <div>Ограничение до</div><div><?= !empty($user['restriction_until']) ? u_dt($user['restriction_until']) : '—' ?></div>
    <div>Тариф</div><div><span class="muted">будет доступно после этапа 09</span></div>
  </div>
</div>

<?= u_range($uid, $period, $allowedPeriods) ?>

<div class="panel">
  <h2>Активность за период</h2>
  <div class="metrics">
    <div class="metric"><div class="n"><?= u_num($k['sessions']) ?></div><div class="l">Сессий</div></div>
    <div class="metric"><div class="n"><?= u_num($k['events']) ?></div><div class="l">Событий</div></div>
    <div class="metric"><div class="n"><?= u_num($k['tile_applies']) ?></div><div class="l">Применений</div></div>
    <div class="metric"><div class="n"><?= u_num($k['favorites']) ?></div><div class="l">В избранное</div></div>
    <div class="metric"><div class="n"><?= u_num($k['downloads']) ?></div><div class="l">Скачиваний</div></div>
  </div>
  <div class="kv">
    <div>Последний визит</div><div><?= u_dt($k['last_visit']) ?></div>
    <div>Основные устройства</div><div><?= h($devStr) ?></div>
  </div>
</div>

<div class="panel">
  <h2>Топ плиток пользователя</h2>
  <?php if (!$topTiles): ?><p class="muted">Нет данных за период.</p><?php else: ?>
  <div class="table-wrap"><table><thead><tr><th>tile_id</th><th>Применений</th><th>Избранное</th><th>Скачиваний</th></tr></thead><tbody>
    <?php foreach ($topTiles as $r): ?>
    <tr><td><?= h($r['tile_id']) ?></td><td><?= u_num($r['applies']) ?></td><td><?= u_num($r['favorites']) ?></td><td><?= u_num($r['downloads']) ?></td></tr>
    <?php endforeach; ?>
  </tbody></table></div>
  <?php endif; ?>
</div>

<div class="panel">
  <h2>Топ фильтров</h2>
  <?php
    $filtLabels = ['color'=>'Цвет','size'=>'Размер','surface'=>'Поверхность','design'=>'Дизайн'];
    $hasFilt = false; foreach ($topFilt as $arr) { if ($arr) { $hasFilt = true; break; } }
  ?>
  <?php if (!$hasFilt): ?><p class="muted">Нет данных за период.</p><?php else: ?>
  <div class="metrics">
    <?php foreach ($filtLabels as $key => $lbl): ?>
    <div class="metric">
      <div class="l" style="font-weight:700;margin-bottom:6px"><?= h($lbl) ?></div>
      <?php if (empty($topFilt[$key])): ?><div class="muted" style="font-size:12px">—</div>
      <?php else: foreach ($topFilt[$key] as $f): ?>
        <div style="font-size:12px;display:flex;justify-content:space-between"><span><?= h($f['v']) ?></span><span class="muted"><?= u_num($f['c']) ?></span></div>
      <?php endforeach; endif; ?>
    </div>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>
</div>

<div class="panel">
  <h2>Последние поисковые запросы</h2>
  <?php if (!$searches): ?><p class="muted">Поисков пока нет.</p><?php else: ?>
  <div class="table-wrap"><table><thead><tr><th>Дата</th><th>Запрос</th><th>Фильтры</th></tr></thead><tbody>
    <?php foreach ($searches as $s):
      $f = json_decode((string)($s['filters_json'] ?? ''), true);
      $fStr = '';
      if (is_array($f)) {
        $parts = [];
        foreach ($f as $kk => $vv) { if (is_array($vv) && $vv) $parts[] = $kk . ': ' . implode('/', $vv); }
        $fStr = implode('; ', $parts);
      }
    ?>
    <tr><td><?= u_dt($s['created_at']) ?></td><td><?= h($s['search_query']) ?></td><td class="muted"><?= h($fStr ?: '—') ?></td></tr>
    <?php endforeach; ?>
  </tbody></table></div>
  <?php endif; ?>
</div>

<div class="panel">
  <h2>История событий <span class="muted" style="font-size:12px">(последние 100)</span></h2>
  <?php if (!$events): ?><p class="muted">Событий пока нет.</p><?php else: ?>
  <div class="table-wrap"><table><thead><tr><th>Дата</th><th>Событие</th><th>Сцена</th><th>Зона</th><th>Плитка</th><th>Кратко</th></tr></thead><tbody>
    <?php foreach ($events as $r): ?>
    <tr>
      <td><?= u_dt($r['created_at']) ?></td>
      <td><?= h($r['event_name']) ?></td>
      <td><?= h($r['scene_id'] ?: '—') ?></td>
      <td><?= h($r['zone_id'] ?: '—') ?></td>
      <td><?= h($r['tile_id'] ?: '—') ?></td>
      <td class="muted"><?= h(u_event_meta($r) ?: '—') ?></td>
    </tr>
    <?php endforeach; ?>
  </tbody></table></div>
  <?php endif; ?>
</div>

<div class="panel">
  <h2>История скачиваний</h2>
  <?php if (!$downloads): ?><p class="muted">Скачиваний пока нет.</p><?php else: ?>
  <div class="table-wrap"><table><thead><tr><th>Дата</th><th>Сцена</th><th>Выбор плиток</th><th>Статус</th><th>Лимит до</th><th>Лимит после</th><th>Ошибка</th></tr></thead><tbody>
    <?php foreach ($downloads as $r): ?>
    <tr>
      <td><?= u_dt($r['created_at']) ?></td>
      <td><?= h($r['scene_id'] ?: '—') ?></td>
      <td class="muted"><?= h(u_selection_short($r['selection_json'])) ?></td>
      <td><?= h($r['status']) ?></td>
      <td><?= $r['used_before'] === null ? '—' : u_num($r['used_before']) ?></td>
      <td><?= $r['used_after'] === null ? '—' : u_num($r['used_after']) ?></td>
      <td class="muted"><?= h($r['error_message'] ?: '—') ?></td>
    </tr>
    <?php endforeach; ?>
  </tbody></table></div>
  <?php endif; ?>
</div>

<div class="panel">
  <h2>Заметки администратора</h2>
  <form method="post" style="margin-bottom:14px">
    <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
    <input type="hidden" name="action" value="add_note">
    <textarea name="note" rows="3" placeholder="Комментарий администратора" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--border,#e4e4ea);border-radius:8px;font:inherit"></textarea>
    <div style="margin-top:8px"><button class="btn btn--primary btn--sm" type="submit">Добавить заметку</button></div>
  </form>
  <?php if (!$notes): ?><p class="muted">Заметок пока нет.</p><?php else: ?>
    <?php foreach ($notes as $n):
      $an = trim(($n['first_name'] ?? '') . ' ' . ($n['last_name'] ?? ''));
      if ($an === '') $an = $n['email'] ?? 'админ';
    ?>
    <div style="border-top:1px solid var(--border,#e4e4ea);padding:10px 0">
      <div style="font-size:12px" class="muted"><?= u_dt($n['created_at']) ?> · <?= h($an) ?></div>
      <div style="white-space:pre-wrap"><?= h($n['note']) ?></div>
    </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>
<?php
analytics_admin_page('Карточка пользователя — ' . $fullName, ob_get_clean());
