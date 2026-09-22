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
?>
<section class="account-page">
  <?php if (!$user): ?>
    <div class="account-guest panel-card">
      <span class="account-guest-icon" aria-hidden="true">♙</span>
      <h1>Личный кабинет</h1>
      <p>В этой сессии пользователь не авторизован. После входа здесь появятся почта, имя аккаунта и отправленные заявки.</p>
      <a class="button button-primary" href="/auth/login.php">Войти в аккаунт</a>
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
</section>
