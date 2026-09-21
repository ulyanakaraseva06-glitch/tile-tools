<?php
require_once __DIR__ . '/functions.php';
$admin = require_admin();

$flash = '';
function back($tab, $msg) { header('Location: admin.php?tab=' . urlencode($tab) . '&msg=' . urlencode($msg)); exit; }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_check($_POST['csrf'] ?? '')) back('users', 'Сессия устарела.');
    $action = $_POST['action'] ?? '';
    $uid    = (int)($_POST['uid'] ?? 0);

    switch ($action) {
        case 'approve':
            db()->prepare('UPDATE users SET status="active", approved_by=?, approved_at=NOW(), downloads_reset_month=IFNULL(downloads_reset_month, ?) WHERE id=? AND status="pending"')
                ->execute([$admin['id'], date('Y-m'), $uid]);
            back('pending', 'Пользователь одобрен.');

        case 'reject':
            db()->prepare('DELETE FROM users WHERE id=? AND status="pending"')->execute([$uid]);
            back('pending', 'Заявка отклонена.');

        case 'ban':
            if ($uid === (int)$admin['id']) back('users', 'Нельзя забанить самого себя.');
            db()->prepare('UPDATE users SET status="banned", restriction_until=NULL WHERE id=?')->execute([$uid]);
            back('users', 'Пользователь заблокирован.');

        case 'unban':
            db()->prepare('UPDATE users SET status="active", restriction_until=NULL WHERE id=?')->execute([$uid]);
            back('users', 'Доступ восстановлен.');

        case 'restrict':
            if ($uid === (int)$admin['id']) back('users', 'Нельзя ограничить самого себя.');
            $n = max(1, (int)($_POST['period'] ?? 1));
            $unit = ($_POST['unit'] ?? 'days') === 'months' ? 'months' : 'days';
            $until = date('Y-m-d H:i:s', strtotime("+$n $unit"));
            db()->prepare('UPDATE users SET status="restricted", restriction_until=? WHERE id=?')->execute([$until, $uid]);
            back('users', 'Доступ ограничен до ' . date('d.m.Y', strtotime($until)) . '.');

        case 'bonus':
            $bonus = (int)($_POST['bonus'] ?? 0);
            db()->prepare('UPDATE users SET downloads_bonus=? WHERE id=?')->execute([$bonus, $uid]);
            back('users', 'Лимит (бонус) обновлён.');

        case 'reset_month':
            db()->prepare('UPDATE users SET downloads_monthly=0, downloads_reset_month=? WHERE id=?')->execute([date('Y-m'), $uid]);
            back('users', 'Месячный счётчик сброшен.');

        case 'delete':
            if ($uid === (int)$admin['id']) back('users', 'Нельзя удалить самого себя.');
            db()->prepare('DELETE FROM users WHERE id=?')->execute([$uid]);
            back('users', 'Пользователь удалён.');

        case 'create':
            $email = trim($_POST['email'] ?? '');
            $first = trim($_POST['first_name'] ?? '');
            $last  = trim($_POST['last_name'] ?? '');
            $comp  = trim($_POST['company'] ?? '');
            $pass  = $_POST['password'] ?? '';
            if (!valid_email($email) || $first === '' || mb_strlen($pass) < 6) {
                back('create', 'Проверьте поля: e-mail, имя и пароль (мин. 6 символов).');
            } elseif (find_user_by_email($email)) {
                back('create', 'Пользователь с таким e-mail уже есть.');
            } else {
                create_user(['email'=>$email,'password'=>$pass,'first_name'=>$first,'last_name'=>$last,'company'=>$comp], 'active', 'user');
                back('users', 'Пользователь создан и активирован.');
            }
            break;
    }
}

$flash = isset($_GET['msg']) ? trim($_GET['msg']) : '';
$tab   = $_GET['tab'] ?? '';
$token = csrf_token();

$pending = db()->query('SELECT * FROM users WHERE status="pending" ORDER BY created_at ASC')->fetchAll();
$users   = db()->query('SELECT * FROM users ORDER BY (role="admin") DESC, created_at DESC')->fetchAll();

if ($tab === '') $tab = count($pending) ? 'pending' : 'users';
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Админ-панель — СравниПлитку</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="auth.css">
</head>
<body>
<div class="topbar">
  <div class="brand"><span class="auth-logo"><span class="mark"><i></i><i></i><i></i><i></i></span></span> Админ-панель</div>
  <nav>
    <a class="btn btn--ghost btn--sm" href="../catalog/admin/tiles.php">Каталог плитки</a>
    <a class="btn btn--ghost btn--sm" href="../analytics/admin/dashboard.php">Аналитика</a>
    <a class="btn btn--ghost btn--sm" href="../index.php">← К визуализатору</a>
    <a class="btn btn--ghost btn--sm" href="cabinet.php">Мой кабинет</a>
    <a class="btn btn--neutral btn--sm" href="logout.php">Выйти</a>
  </nav>
</div>

<div class="page">
  <h1>Управление пользователями</h1>
  <p class="muted">Вы вошли как <?= h($admin['email']) ?> · лимит по умолчанию: <?= (int)DEFAULT_MONTHLY_LIMIT ?>/мес</p>

  <?php if ($flash): ?><div class="alert alert--info"><?= h($flash) ?></div><?php endif; ?>

  <div class="tabs">
    <div class="tab <?= $tab==='pending'?'active':'' ?>" data-tab="pending">Заявки <?= count($pending) ? '('.count($pending).')' : '' ?></div>
    <div class="tab <?= $tab==='users'?'active':'' ?>" data-tab="users">Пользователи (<?= count($users) ?>)</div>
    <div class="tab <?= $tab==='create'?'active':'' ?>" data-tab="create">Создать пользователя</div>
  </div>

  <!-- ЗАЯВКИ -->
  <section data-pane="pending" style="<?= $tab==='pending'?'':'display:none' ?>">
    <?php if (!$pending): ?>
      <div class="panel empty">Новых заявок нет.</div>
    <?php else: ?>
      <table>
        <tr><th>Имя</th><th>E-mail</th><th>Компания</th><th>Дата</th><th>Действия</th></tr>
        <?php foreach ($pending as $u): ?>
          <tr>
            <td><?= h($u['first_name'].' '.$u['last_name']) ?></td>
            <td><?= h($u['email']) ?></td>
            <td><?= h($u['company'] ?: '—') ?></td>
            <td><?= h(date('d.m.Y', strtotime($u['created_at']))) ?></td>
            <td><div class="actions">
              <form method="post"><input type="hidden" name="csrf" value="<?= h($token) ?>"><input type="hidden" name="action" value="approve"><input type="hidden" name="uid" value="<?= (int)$u['id'] ?>"><button class="btn btn--ok btn--sm">Одобрить</button></form>
              <form method="post" onsubmit="return confirm('Отклонить и удалить заявку?')"><input type="hidden" name="csrf" value="<?= h($token) ?>"><input type="hidden" name="action" value="reject"><input type="hidden" name="uid" value="<?= (int)$u['id'] ?>"><button class="btn btn--danger btn--sm">Отклонить</button></form>
            </div></td>
          </tr>
        <?php endforeach; ?>
      </table>
    <?php endif; ?>
  </section>

  <!-- ПОЛЬЗОВАТЕЛИ -->
  <section data-pane="users" style="<?= $tab==='users'?'':'display:none' ?>">
    <table>
      <tr><th>Пользователь</th><th>Статус</th><th>Скачано (мес / лимит · всего)</th><th>Лимит±</th><th>Действия</th></tr>
      <?php foreach ($users as $u):
        list($l,$c) = status_label($u['status']);
        $lim = effective_limit($u);
        $isSelf = ((int)$u['id'] === (int)$admin['id']);
      ?>
        <tr>
          <td>
            <strong><a href="../analytics/admin/user.php?id=<?= (int)$u['id'] ?>"><?= h($u['first_name'].' '.$u['last_name']) ?></a></strong><?= $u['role']==='admin' ? ' <span class="badge" style="background:#5C4B8A">админ</span>' : '' ?><br>
            <span style="color:var(--text-sec)"><?= h($u['email']) ?></span><?= $u['company'] ? '<br><span style="color:var(--text-sec);font-size:12px">'.h($u['company']).'</span>' : '' ?>
          </td>
          <td>
            <span class="badge" style="background:<?= $c ?>"><?= h($l) ?></span>
            <?php if ($u['status']==='restricted' && $u['restriction_until']): ?><br><span style="font-size:11px;color:var(--text-sec)">до <?= h(date('d.m.Y', strtotime($u['restriction_until']))) ?></span><?php endif; ?>
          </td>
          <td><?= (int)$u['downloads_monthly'] ?> / <?= $lim ?> · <?= (int)$u['downloads_total'] ?>
            <form method="post" style="margin-top:4px"><input type="hidden" name="csrf" value="<?= h($token) ?>"><input type="hidden" name="action" value="reset_month"><input type="hidden" name="uid" value="<?= (int)$u['id'] ?>"><button class="btn btn--neutral btn--sm" title="Обнулить счётчик за месяц">сброс мес.</button></form>
          </td>
          <td>
            <form method="post" class="dl-edit"><input type="hidden" name="csrf" value="<?= h($token) ?>"><input type="hidden" name="action" value="bonus"><input type="hidden" name="uid" value="<?= (int)$u['id'] ?>">
              <input type="number" name="bonus" value="<?= (int)$u['downloads_bonus'] ?>" title="Прибавка к лимиту (можно отрицательную)">
              <button class="btn btn--ghost btn--sm">OK</button>
            </form>
          </td>
          <td><div class="actions">
            <?php if (!$isSelf): ?>
              <?php if ($u['status']==='banned'): ?>
                <form method="post"><input type="hidden" name="csrf" value="<?= h($token) ?>"><input type="hidden" name="action" value="unban"><input type="hidden" name="uid" value="<?= (int)$u['id'] ?>"><button class="btn btn--ok btn--sm">Разбанить</button></form>
              <?php else: ?>
                <form method="post" onsubmit="return confirm('Заблокировать пользователя?')"><input type="hidden" name="csrf" value="<?= h($token) ?>"><input type="hidden" name="action" value="ban"><input type="hidden" name="uid" value="<?= (int)$u['id'] ?>"><button class="btn btn--danger btn--sm">Бан</button></form>
              <?php endif; ?>
              <?php if ($u['status']==='restricted'): ?>
                <form method="post"><input type="hidden" name="csrf" value="<?= h($token) ?>"><input type="hidden" name="action" value="unban"><input type="hidden" name="uid" value="<?= (int)$u['id'] ?>"><button class="btn btn--ok btn--sm">Снять огранич.</button></form>
              <?php else: ?>
                <button class="btn btn--warn btn--sm" type="button" onclick="openRestrict(<?= (int)$u['id'] ?>,'<?= h(addslashes($u['first_name'].' '.$u['last_name'])) ?>')">Ограничить</button>
              <?php endif; ?>
              <form method="post" onsubmit="return confirm('Удалить пользователя безвозвратно?')"><input type="hidden" name="csrf" value="<?= h($token) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="uid" value="<?= (int)$u['id'] ?>"><button class="btn btn--neutral btn--sm">Удалить</button></form>
            <?php else: ?>
              <span style="color:var(--text-sec);font-size:12px">это вы</span>
            <?php endif; ?>
          </div></td>
        </tr>
      <?php endforeach; ?>
    </table>
  </section>

  <!-- СОЗДАТЬ -->
  <section data-pane="create" style="<?= $tab==='create'?'':'display:none' ?>">
    <div class="panel" style="max-width:480px">
      <h2>Новый пользователь (сразу активный)</h2>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= h($token) ?>">
        <input type="hidden" name="action" value="create">
        <div class="row2">
          <div class="field"><label>Имя</label><input name="first_name" required></div>
          <div class="field"><label>Фамилия</label><input name="last_name"></div>
        </div>
        <div class="field"><label>Компания</label><input name="company"></div>
        <div class="field"><label>E-mail</label><input type="email" name="email" required></div>
        <div class="field"><label>Временный пароль</label><input name="password" required></div>
        <button class="btn btn--primary" type="submit">Создать</button>
      </form>
    </div>
  </section>
</div>

<!-- модалка ограничения -->
<div class="modal-bg" id="restrictModal">
  <div class="modal">
    <h3>Ограничить доступ</h3>
    <p class="muted" id="restrictName" style="margin-bottom:14px"></p>
    <form method="post">
      <input type="hidden" name="csrf" value="<?= h($token) ?>">
      <input type="hidden" name="action" value="restrict">
      <input type="hidden" name="uid" id="restrictUid">
      <div class="row2">
        <div class="field"><label>На срок</label><input type="number" name="period" value="7" min="1" required></div>
        <div class="field"><label>Единица</label>
          <select name="unit" style="width:100%;padding:11px 13px;border:1.5px solid var(--border);border-radius:9px;font-family:inherit">
            <option value="days">дней</option>
            <option value="months">месяцев</option>
          </select>
        </div>
      </div>
      <div class="row">
        <button class="btn btn--neutral btn--sm" type="button" onclick="closeRestrict()">Отмена</button>
        <button class="btn btn--warn btn--sm" type="submit">Ограничить</button>
      </div>
    </form>
  </div>
</div>

<script>
  document.querySelectorAll('.tab').forEach(function(t){
    t.addEventListener('click', function(){
      var name = t.dataset.tab;
      document.querySelectorAll('.tab').forEach(function(x){ x.classList.toggle('active', x===t); });
      document.querySelectorAll('[data-pane]').forEach(function(p){ p.style.display = (p.dataset.pane===name)?'':'none'; });
      history.replaceState(null,'','admin.php?tab='+name);
    });
  });
  function openRestrict(id, name){
    document.getElementById('restrictUid').value = id;
    document.getElementById('restrictName').textContent = name;
    document.getElementById('restrictModal').classList.add('open');
  }
  function closeRestrict(){ document.getElementById('restrictModal').classList.remove('open'); }
  document.getElementById('restrictModal').addEventListener('click', function(e){ if(e.target===this) closeRestrict(); });
</script>
</body>
</html>
