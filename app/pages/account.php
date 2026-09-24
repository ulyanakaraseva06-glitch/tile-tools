<?php
require_once dirname(__DIR__, 2) . '/shared/services.php';

$user = tt_current_user();
$serviceRequests = [];
$serviceNames = [];
foreach (tt_services_catalog() as $service) {
    $serviceNames[$service['id']] = $service['title'];
}

if ($user) {
    $statement = tt_pdo()->prepare(
        'SELECT id, source_entity_id, phone_or_email, message, status, created_at
         FROM tt_lead_requests
         WHERE user_id = ? AND source_type = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 100'
    );
    $statement->execute([(int) $user['id'], 'service']);
    $serviceRequests = $statement->fetchAll();
}

$roleLabels = ['user' => 'Пользователь', 'supplier' => 'Поставщик', 'admin' => 'Администратор'];
$statusLabels = ['new' => 'Новая', 'sent' => 'Передана', 'in_progress' => 'В работе', 'closed' => 'Завершена', 'failed' => 'Ошибка'];
$accountName = tt_user_display_name($user);
$accountInitials = tt_user_initials($user);
$isAdmin = ($user['role'] ?? '') === 'admin';
$adminStats = ['visitors' => 0, 'visitorsToday' => 0, 'users' => 0, 'projects' => 0, 'leads' => 0];
$projectStats = ['visualization' => 0, 'calculation' => 0, 'pdf' => 0];
$projectLabels = ['visualization' => 'Сравни плитку', 'calculation' => 'Посчитай плитку', 'pdf' => 'Плитка PDF'];
if ($isAdmin) {
    $pdo = tt_pdo();
    $adminStats['users'] = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE status = 'active' AND role <> 'admin'")->fetchColumn();
    $adminStats['projects'] = (int) $pdo->query("SELECT COUNT(*) FROM tt_projects WHERE deleted_at IS NULL")->fetchColumn();
    $adminStats['leads'] = (int) $pdo->query('SELECT COUNT(*) FROM tt_lead_requests')->fetchColumn();
    foreach ($pdo->query("SELECT project_type, COUNT(*) AS total FROM tt_projects WHERE deleted_at IS NULL GROUP BY project_type")->fetchAll() as $row) {
        if (array_key_exists((string) $row['project_type'], $projectStats)) {
            $projectStats[(string) $row['project_type']] = (int) $row['total'];
        }
    }
    try {
        $adminStats['visitors'] = (int) $pdo->query("SELECT COUNT(DISTINCT IF(user_id IS NULL, CONCAT('v:', visitor_key), CONCAT('u:', user_id))) FROM tt_site_visitors")->fetchColumn();
        $adminStats['visitorsToday'] = (int) $pdo->query("SELECT COUNT(DISTINCT IF(user_id IS NULL, CONCAT('v:', visitor_key), CONCAT('u:', user_id))) FROM tt_site_visitors WHERE last_seen_at >= CURDATE()")->fetchColumn();
    } catch (Throwable) {
        // Дашборд остаётся доступным до применения миграции аналитики.
    }
}
$popularProjectType = array_search(max($projectStats), $projectStats, true);
$popularProjectLabel = max($projectStats) > 0 && is_string($popularProjectType) ? $projectLabels[$popularProjectType] : 'Пока нет данных';
$maxProjectCount = max(1, ...array_values($projectStats));
?>
<section class="account-page">
  <?php if (!$user): ?>
    <div class="account-guest panel-card">
      <span class="account-guest-icon" aria-hidden="true">♙</span>
      <h1>Личный кабинет</h1>
      <p>В этой сессии пользователь не авторизован. После входа здесь появятся почта, имя аккаунта и отправленные заявки.</p>
      <div class="account-guest-actions"><a class="button button-primary" href="/auth/login.php">Войти</a><a class="button button-secondary" href="/auth/register.php">Зарегистрироваться</a></div>
    </div>
  <?php else: ?>
    <aside class="account-summary panel-card">
      <div class="account-avatar"><?= tt_escape($accountInitials) ?></div>
      <h1><?= tt_escape($accountName) ?></h1>
      <span class="account-role"><?= tt_escape($roleLabels[$user['role']] ?? 'Пользователь') ?></span>
      <dl class="account-facts">
        <div><dt>Никнейм</dt><dd><?= tt_escape($accountName) ?></dd></div>
        <div><dt>Почта</dt><dd><?= tt_escape((string) $user['email']) ?></dd></div>
      </dl>
      <p class="account-note">Никнейм формируется из имени и фамилии аккаунта. Если они не заполнены — из части почты до символа @.</p>
      <form class="account-logout" method="post" action="/auth/logout.php"><input type="hidden" name="csrf" value="<?= tt_escape(tt_csrf_token()) ?>"><button type="submit">Выйти из аккаунта</button></form>
    </aside>

    <?php if ($isAdmin): ?>
    <main class="admin-dashboard">
      <section class="panel-card admin-dashboard-heading">
        <div><p class="eyebrow">Панель администратора</p><h2>Статистика Tile Tools</h2><p>Сводные показатели считаются по данным сервера и общей базе проекта.</p></div>
        <a class="button button-primary" href="<?= tt_url('media') ?>">＋ Добавить плитку</a>
      </section>
      <section class="admin-stat-grid">
        <article class="panel-card"><span>Посетители</span><strong><?= $adminStats['visitors'] ?></strong><small><?= $adminStats['visitorsToday'] ?> сегодня</small></article>
        <article class="panel-card"><span>Регистрации</span><strong><?= $adminStats['users'] ?></strong><small>пользователей и поставщиков</small></article>
        <article class="panel-card"><span>Проекты</span><strong><?= $adminStats['projects'] ?></strong><small>во всех сервисах</small></article>
        <article class="panel-card"><span>Заявки</span><strong><?= $adminStats['leads'] ?></strong><small>услуги и оборудование</small></article>
      </section>
      <section class="panel-card admin-project-stats">
        <header><div><p class="eyebrow">Использование сервисов</p><h3>Где чаще создают проекты</h3></div><span>Лидер: <b><?= tt_escape($popularProjectLabel) ?></b></span></header>
        <div class="admin-service-bars">
          <?php foreach ($projectStats as $type => $count): $width = max(3, (int) round($count / $maxProjectCount * 100)); ?>
            <div class="admin-service-row"><div><strong><?= tt_escape($projectLabels[$type]) ?></strong><span><?= $count ?> проектов</span></div><i><b style="width:<?= $width ?>%"></b></i></div>
          <?php endforeach; ?>
        </div>
      </section>
      <section class="panel-card admin-dashboard-note"><strong>Как считается посещаемость</strong><p>Один посетитель — один браузер до регистрации. После входа визиты объединяются по аккаунту. Поисковые роботы не учитываются.</p></section>
    </main>
    <?php else: ?>
    <main class="account-requests panel-card">
      <header class="account-requests-heading">
        <div><p class="eyebrow">История обращений</p><h2>Мои заявки на услуги</h2><p>Здесь отображаются только заявки, отправленные из этого аккаунта.</p></div>
        <span><?= count($serviceRequests) ?></span>
      </header>

      <?php if ($serviceRequests === []): ?>
        <div class="account-empty">
          <span aria-hidden="true">◇</span>
          <h3>Заявок пока нет</h3>
          <p>Выберите услугу Vilray Studio и опишите задачу — заявка появится здесь сразу после сохранения.</p>
          <a class="button button-secondary" href="<?= tt_url('services') ?>">Перейти к услугам</a>
        </div>
      <?php else: ?>
        <div class="account-request-list">
          <?php foreach ($serviceRequests as $request):
              $serviceId = (string) ($request['source_entity_id'] ?? '');
              $serviceTitle = $serviceNames[$serviceId] ?? 'Услуга Vilray Studio';
              $rawMessage = trim((string) ($request['message'] ?? ''));
              $message = preg_replace('/^Услуга:\s*[^\r\n]+(?:\r?\n){0,2}/u', '', $rawMessage) ?? $rawMessage;
              $createdAt = new DateTimeImmutable((string) $request['created_at']);
              $requestStatus = (string) $request['status'];
          ?>
            <article class="account-request-card">
              <div class="account-request-icon" aria-hidden="true">◇</div>
              <div class="account-request-copy">
                <div class="account-request-title"><h3><?= tt_escape($serviceTitle) ?></h3><span class="request-status request-status-<?= tt_escape($requestStatus) ?>"><?= tt_escape($statusLabels[$requestStatus] ?? $requestStatus) ?></span></div>
                <?php if ($message !== ''): ?><p><?= nl2br(tt_escape($message)) ?></p><?php else: ?><p class="account-request-muted">Описание задачи не указано.</p><?php endif; ?>
                <footer><time datetime="<?= tt_escape($createdAt->format(DATE_ATOM)) ?>"><?= tt_escape($createdAt->format('d.m.Y в H:i')) ?></time><span><?= tt_escape((string) $request['phone_or_email']) ?></span></footer>
              </div>
            </article>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </main>
    <?php endif; ?>
  <?php endif; ?>
</section>
