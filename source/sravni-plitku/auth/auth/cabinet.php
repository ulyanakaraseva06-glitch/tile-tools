<?php
require_once __DIR__ . '/functions.php';
$user = require_login();
ensure_month_reset($user);

/* модуль аналитики подключаем мягко (если установлен) */
$analyticsFns = __DIR__ . '/../analytics/functions.php';
$hasAnalytics = false;
if (is_file($analyticsFns)) { require_once $analyticsFns; $hasAnalytics = function_exists('analytics_ready') && analytics_ready(); }

$msg = ''; $msgType = 'ok';

/* --- смена пароля --- */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['form'] ?? '') === 'pwd') {
    if (!csrf_check($_POST['csrf'] ?? '')) {
        $msg = 'Сессия устарела.'; $msgType = 'err';
    } else {
        $cur = $_POST['current'] ?? ''; $new = $_POST['new'] ?? ''; $new2 = $_POST['new2'] ?? '';
        if (!password_verify($cur, $user['password_hash'])) {
            $msg = 'Текущий пароль неверен.'; $msgType = 'err';
        } elseif (mb_strlen($new) < 6) {
            $msg = 'Новый пароль слишком короткий (мин. 6).'; $msgType = 'err';
        } elseif ($new !== $new2) {
            $msg = 'Новые пароли не совпадают.'; $msgType = 'err';
        } else {
            db()->prepare('UPDATE users SET password_hash=? WHERE id=?')
                ->execute([password_hash($new, PASSWORD_DEFAULT), $user['id']]);
            $msg = 'Пароль изменён.'; $msgType = 'ok';
        }
    }
}

$limit    = effective_limit($user);
$used     = (int)$user['downloads_monthly'];
$remain   = max(0, $limit - $used);
$favCount = count(get_favorites($user));
$token    = csrf_token();

/* данные истории (если модуль аналитики есть) */
$downloads = $hasAnalytics ? analytics_user_downloads($user['id'], 10) : [];
$lastVisit = null;
if ($hasAnalytics && function_exists('analytics_user_kpis')) {
    $k = analytics_user_kpis($user['id'], 'all');
    $lastVisit = $k['last_visit'] ?? null;
}

function cab_dt($s) { return $s ? date('d.m.Y H:i', strtotime($s)) : '—'; }
function cab_sel_short($json) {
    $sel = json_decode((string)$json, true);
    if (!is_array($sel) || !$sel) return '—';
    $p = []; foreach ($sel as $z => $t) { $p[] = $z . ':' . $t; if (count($p) >= 5) break; }
    return implode(', ', $p);
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<script>(function(){try{var t=localStorage.getItem('sp_theme')||'light';if(['light','beige','dark'].indexOf(t)<0)t='light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Личный кабинет — СравниПлитку</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="auth.css">
</head>
<body>
<div class="topbar">
  <div class="brand"><span class="auth-logo"><span class="mark"><i></i><i></i><i></i><i></i></span></span> Личный кабинет</div>
  <nav>
    <a class="btn btn--ghost btn--sm" href="../index.php">← К визуализатору</a>
    <?php if ($user['role'] === 'admin'): ?><a class="btn btn--ghost btn--sm" href="admin.php">Админ-панель</a><a class="btn btn--ghost btn--sm" href="../catalog/admin/tiles.php">Каталог плитки</a><?php endif; ?>
    <a class="btn btn--neutral btn--sm" href="logout.php">Выйти</a>
  </nav>
</div>

<div class="page">
  <h1>Здравствуйте, <?= h($user['first_name'] ?: 'пользователь') ?>!</h1>
  <p class="muted">Ваши данные и статистика</p>

  <?php if ($msg): ?><div class="alert alert--<?= $msgType==='ok'?'ok':'err' ?>"><?= h($msg) ?></div><?php endif; ?>

  <div class="panel">
    <h2>Тема оформления</h2>
    <p class="muted">Тема интерфейса. Применяется к кабинету и к визуализатору. Сохраняется в этом браузере.</p>
    <div class="theme-switch" id="themeSwitch">
      <button type="button" class="theme-btn" data-set-theme="light" title="Светлая тема"><span class="theme-dot theme-dot--light"></span>Светлая</button>
      <button type="button" class="theme-btn" data-set-theme="beige" title="Бежевая тема"><span class="theme-dot theme-dot--beige"></span>Бежевая</button>
      <button type="button" class="theme-btn" data-set-theme="dark"  title="Тёмная тема"><span class="theme-dot theme-dot--dark"></span>Тёмная</button>
    </div>
  </div>

  <div class="panel">
    <h2>Аккаунт</h2>
    <div class="kv">
      <div>Имя</div><div><?= h($user['first_name'] ?: '—') ?></div>
      <div>Фамилия</div><div><?= h($user['last_name'] ?: '—') ?></div>
      <div>Компания</div><div><?= h($user['company'] ?: '—') ?></div>
      <div>E-mail</div><div><?= h($user['email']) ?></div>
      <div>Статус</div><div><?php list($l,$c)=status_label($user['status']); ?><span class="badge" style="background:<?= $c ?>"><?= h($l) ?></span></div>
      <div>Дата регистрации</div><div><?= h(date('d.m.Y', strtotime($user['created_at']))) ?></div>
    </div>
  </div>

  <div class="panel">
    <h2>Доступ и лимит</h2>
    <div class="kv">
      <div>Месячный лимит</div><div><?= (int)$limit ?></div>
      <div>Использовано в этом месяце</div><div><?= (int)$used ?></div>
      <div>Осталось</div><div><strong><?= (int)$remain ?></strong></div>
    </div>
  </div>

  <div class="panel">
    <h2>Использование сервиса</h2>
    <div class="stat">
      <div class="box"><div class="n"><?= (int)$used ?> / <?= (int)$limit ?></div><div class="l">за текущий месяц</div></div>
      <div class="box"><div class="n"><?= (int)$user['downloads_total'] ?></div><div class="l">всего за всё время</div></div>
      <div class="box"><div class="n"><?= (int)$favCount ?></div><div class="l">в избранном</div></div>
      <?php if ($lastVisit): ?><div class="box"><div class="n" style="font-size:16px"><?= h(date('d.m.Y', strtotime($lastVisit))) ?></div><div class="l">последний визит</div></div><?php endif; ?>
    </div>
    <p class="muted" style="margin-top:12px;margin-bottom:0">Месячный лимит обновляется автоматически 1-го числа.</p>
  </div>

  <?php if ($hasAnalytics): ?>
  <div class="panel">
    <h2>История скачиваний</h2>
    <?php if (!$downloads): ?><p class="muted">Скачиваний пока нет.</p><?php else: ?>
    <div style="overflow-x:auto"><table><thead><tr><th>Дата</th><th>Сцена</th><th>Выбор плиток</th><th>Статус</th></tr></thead><tbody>
      <?php foreach ($downloads as $d): ?>
      <tr><td><?= cab_dt($d['created_at']) ?></td><td><?= h($d['scene_id'] ?: '—') ?></td><td class="muted"><?= h(cab_sel_short($d['selection_json'])) ?></td><td><?= h($d['status']) ?></td></tr>
      <?php endforeach; ?>
    </tbody></table></div>
    <?php endif; ?>
  </div>
  <?php endif; ?>

  <div class="panel">
    <h2>Сменить пароль</h2>
    <form method="post" style="max-width:380px">
      <input type="hidden" name="csrf" value="<?= h($token) ?>">
      <input type="hidden" name="form" value="pwd">
      <div class="field"><label>Текущий пароль</label><input type="password" name="current" required></div>
      <div class="field"><label>Новый пароль</label><input type="password" name="new" required></div>
      <div class="field"><label>Повторите новый</label><input type="password" name="new2" required></div>
      <button class="btn btn--primary" type="submit">Сохранить</button>
    </form>
  </div>
</div>
<script>
(function () {
  var THEMES = ['light', 'beige', 'dark'];
  function getTheme() { try { return localStorage.getItem('sp_theme') || 'light'; } catch (e) { return 'light'; } }
  function applyTheme(t) {
    if (THEMES.indexOf(t) < 0) t = 'light';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('sp_theme', t); } catch (e) {}
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.setTheme === t);
    });
  }
  applyTheme(getTheme());
  document.querySelectorAll('.theme-btn').forEach(function (b) {
    b.addEventListener('click', function () { applyTheme(b.dataset.setTheme); });
  });
})();
</script>
</body>
</html>
