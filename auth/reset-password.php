<?php
declare(strict_types=1);

require dirname(__DIR__) . '/shared/bootstrap.php';
require dirname(__DIR__) . '/shared/password-reset.php';

tt_start_session();
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
$tokenValue = trim((string) ($_POST['token'] ?? $_GET['token'] ?? ''));
$tokenParts = tt_password_reset_token($tokenValue);
$error = '';
$complete = false;
$valid = false;

if ($tokenParts !== null) {
    $statement = tt_pdo()->prepare(
        "SELECT id, user_id, validator_hash FROM tt_password_reset_tokens
         WHERE selector = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1"
    );
    $statement->execute([$tokenParts['selector']]);
    $stored = $statement->fetch();
    $valid = $stored && hash_equals((string) $stored['validator_hash'], hash('sha256', $tokenParts['validator']));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $valid) {
    $password = (string) ($_POST['password'] ?? '');
    $passwordConfirm = (string) ($_POST['password_confirm'] ?? '');
    $csrf = (string) ($_POST['csrf'] ?? '');
    if (!hash_equals(tt_csrf_token(), $csrf)) {
        $error = 'Сессия формы устарела. Обновите страницу и попробуйте ещё раз.';
    } elseif (strlen($password) < 8 || strlen($password) > 72) {
        $error = 'Пароль должен содержать от 8 до 72 символов.';
    } elseif ($password !== $passwordConfirm) {
        $error = 'Пароли не совпадают.';
    } else {
        $pdo = tt_pdo();
        $pdo->beginTransaction();
        try {
            $lock = $pdo->prepare(
                'SELECT id, user_id, validator_hash FROM tt_password_reset_tokens
                 WHERE selector = ? AND used_at IS NULL AND expires_at > NOW() FOR UPDATE'
            );
            $lock->execute([$tokenParts['selector']]);
            $locked = $lock->fetch();
            if (!$locked || !hash_equals((string) $locked['validator_hash'], hash('sha256', $tokenParts['validator']))) {
                throw new RuntimeException('Ссылка уже использована или устарела.');
            }
            $userId = (int) $locked['user_id'];
            $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $userId]);
            $pdo->prepare('UPDATE tt_password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL')->execute([$userId]);
            $pdo->prepare('UPDATE tt_auth_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ?')->execute([$userId]);
            tt_audit($pdo, $userId, 'password_reset_completed', 'user', (string) $userId);
            $pdo->commit();
            tt_clear_auth_cookie();
            unset($_SESSION['uid']);
            session_regenerate_id(true);
            $complete = true;
            $valid = false;
        } catch (Throwable $exception) {
            $pdo->rollBack();
            $error = $exception instanceof RuntimeException ? $exception->getMessage() : 'Не удалось изменить пароль. Попробуйте запросить новую ссылку.';
        }
    }
}
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Новый пароль — Tile Tools</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/shared/css/app.css?v=20260927-3">
  <link rel="stylesheet" href="/shared/css/design-system.css?v=20260930-1">
</head>
<body class="auth-body">
  <main class="auth-card panel-card">
    <a class="brand" href="/index.php"><span class="brand-mark" aria-hidden="true">▦</span><span>Tile Tools</span></a>
    <?php if ($complete): ?>
      <div class="auth-success-icon" aria-hidden="true">✓</div>
      <h1>Пароль изменён</h1>
      <p>Теперь можно войти с новым паролем. На остальных устройствах потребуется авторизоваться заново.</p>
      <a class="button button-primary auth-wide-button" href="/auth/login.php">Войти в аккаунт</a>
    <?php elseif (!$valid): ?>
      <div class="auth-expired-icon" aria-hidden="true">!</div>
      <h1>Ссылка недействительна</h1>
      <p>Она могла устареть или уже была использована. Запросите новую ссылку восстановления.</p>
      <a class="button button-primary auth-wide-button" href="/auth/forgot-password.php">Запросить новую ссылку</a>
    <?php else: ?>
      <p class="eyebrow">Восстановление доступа</p>
      <h1>Создайте новый пароль</h1>
      <p>После сохранения старый пароль и активные входы на других устройствах перестанут действовать.</p>
      <?php if ($error !== ''): ?><div class="auth-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></div><?php endif; ?>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars(tt_csrf_token(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>">
        <input type="hidden" name="token" value="<?= htmlspecialchars($tokenValue, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>">
        <label>Новый пароль<input class="input" type="password" name="password" required minlength="8" maxlength="72" autocomplete="new-password"><small>Минимум 8 символов.</small></label>
        <label>Повторите пароль<input class="input" type="password" name="password_confirm" required minlength="8" maxlength="72" autocomplete="new-password"></label>
        <button class="button button-primary" type="submit">Сохранить новый пароль</button>
      </form>
    <?php endif; ?>
  </main>
</body>
</html>
