<?php
/* analytics/admin/selftest.php — проверка записи событий аналитики (только админ).
   Тестовое событие пишется только по нажатию кнопки. Можно удалить после проверки. */
require_once __DIR__ . '/../functions.php';
$admin = require_admin();

$ran = false; $okIns = null;
if (($_GET['run'] ?? '') === '1' && csrf_check($_GET['csrf'] ?? '')) {
    $okIns = analytics_track_event(
        $admin['id'],
        'selftest_' . bin2hex(random_bytes(4)),
        'selftest',
        ['metadata' => ['note' => 'ручная самопроверка', 'ts' => date('c')]]
    );
    $ran = true;
}

$ready = analytics_ready();
$rows = [];
if ($ready) {
    $st = db()->query('SELECT id, created_at, user_id, event_name, session_key FROM analytics_events ORDER BY id DESC LIMIT 10');
    $rows = $st->fetchAll();
}

$token = csrf_token();
$runUrl = 'selftest.php?run=1&csrf=' . urlencode($token);

ob_start();
?>
<h1>Самопроверка аналитики</h1>
<?php if (!$ready): ?>
  <div class="alert alert--err">Таблицы аналитики не найдены. Выполните <code>analytics/install.sql</code> в phpMyAdmin.</div>
<?php else: ?>
  <?php if ($ran): ?>
    <div class="alert alert--<?= $okIns ? 'ok' : 'err' ?>">
      <?= $okIns ? 'Тестовое событие записано. Оно должно появиться первым в списке ниже.' : 'Не удалось записать событие.' ?>
    </div>
  <?php endif; ?>
  <div class="panel">
    <p class="muted" style="margin-bottom:14px">Кнопка вызывает <code>analytics_track_event()</code> и пишет одно событие <code>selftest</code>.</p>
    <a class="btn btn--primary" href="<?= h($runUrl) ?>">Записать тестовое событие</a>
  </div>
  <div class="panel">
    <h2>Последние 10 событий (analytics_events)</h2>
    <?php if (!$rows): ?>
      <p class="muted">Событий пока нет.</p>
    <?php else: ?>
      <table>
        <tr><th>ID</th><th>Время</th><th>user_id</th><th>Событие</th><th>session_key</th></tr>
        <?php foreach ($rows as $r): ?>
          <tr>
            <td><?= (int)$r['id'] ?></td>
            <td><?= h($r['created_at']) ?></td>
            <td><?= $r['user_id'] === null ? '—' : (int)$r['user_id'] ?></td>
            <td><?= h($r['event_name']) ?></td>
            <td style="font-family:monospace;font-size:12px"><?= h($r['session_key']) ?></td>
          </tr>
        <?php endforeach; ?>
      </table>
    <?php endif; ?>
  </div>
<?php endif; ?>
<?php
$body = ob_get_clean();
analytics_admin_page('Самопроверка аналитики', $body);
