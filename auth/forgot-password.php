<?php
declare(strict_types=1);

require dirname(__DIR__) . '/shared/bootstrap.php';
require dirname(__DIR__) . '/shared/password-reset.php';

tt_start_session();
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
$email = '';
$error = '';
$submitted = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
    $csrf = (string) ($_POST['csrf'] ?? '');
    if (!hash_equals(tt_csrf_token(), $csrf)) {
        $error = 'Сессия формы устарела. Обновите страницу и попробуйте ещё раз.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 255) {
        $error = 'Введите корректную почту.';
    } else {
        $pdo = tt_pdo();
        $pdo->prepare('DELETE FROM tt_password_reset_tokens WHERE expires_at <= NOW() OR used_at IS NOT NULL')->execute();
        $statement = $pdo->prepare("SELECT id, nickname FROM users WHERE email = ? AND status = 'active' LIMIT 1");
        $statement->execute([$email]);
        $account = $statement->fetch();

        if ($account) {
            $ip = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
            $ipHash = $ip === '' ? null : hash('sha256', $ip);
            $rate = $pdo->prepare('SELECT COUNT(*) FROM tt_password_reset_tokens WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)');
            $rate->execute([(int) $account['id']]);
            $ipAllowed = true;
            if ($ipHash !== null) {
                $ipRate = $pdo->prepare('SELECT COUNT(*) FROM tt_password_reset_tokens WHERE requested_ip_hash = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)');
                $ipRate->execute([$ipHash]);
                $ipAllowed = (int) $ipRate->fetchColumn() < 10;
            }
            if ((int) $rate->fetchColumn() < 3 && $ipAllowed) {
                $selector = bin2hex(random_bytes(12));
                $validator = bin2hex(random_bytes(32));
                $pdo->prepare('UPDATE tt_password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL')->execute([(int) $account['id']]);
                $insert = $pdo->prepare(
                    'INSERT INTO tt_password_reset_tokens (user_id, selector, validator_hash, requested_ip_hash, expires_at)
                     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 60 MINUTE))'
                );
                $insert->execute([
                    (int) $account['id'],
                    $selector,
                    hash('sha256', $validator),
                    $ipHash,
                ]);
                $tokenId = (int) $pdo->lastInsertId();
                $resetUrl = tt_password_reset_base_url() . '/auth/reset-password.php?token=' . rawurlencode($selector . '.' . $validator);
                $sent = tt_send_password_reset_email($email, (string) $account['nickname'], $resetUrl);
                if (!$sent) {
                    $pdo->prepare('UPDATE tt_password_reset_tokens SET used_at = NOW() WHERE id = ?')->execute([$tokenId]);
                }
                tt_audit($pdo, (int) $account['id'], $sent ? 'password_reset_requested' : 'password_reset_delivery_failed', 'user', (string) $account['id']);
            }
        }
        $submitted = true;
    }
}
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Восстановление пароля — Tile Tools</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/shared/css/app.css?v=20260927-3">
  <link rel="stylesheet" href="/shared/css/design-system.css?v=20260930-1">
</head>
<body class="auth-body">
  <main class="auth-card panel-card">
    <a class="brand" href="/index.php"><span class="brand-mark" aria-hidden="true">▦</span><span>Tile Tools</span></a>
    <?php if ($submitted): ?>
      <div class="auth-success-icon" aria-hidden="true">✓</div>
      <h1>Проверьте почту</h1>
      <p>Если аккаунт с такой почтой существует, мы отправили ссылку для создания нового пароля. Она действует 60 минут.</p>
      <a class="button button-primary auth-wide-button" href="/auth/login.php">Вернуться ко входу</a>
    <?php else: ?>
      <p class="eyebrow">Восстановление доступа</p>
      <h1>Забыли пароль?</h1>
      <p>Введите почту аккаунта — мы пришлём одноразовую ссылку для создания нового пароля.</p>
      <?php if ($error !== ''): ?><div class="auth-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></div><?php endif; ?>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars(tt_csrf_token(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>">
        <label>Почта<input class="input" type="email" name="email" value="<?= htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" required maxlength="255" autocomplete="email"></label>
        <button class="button button-primary" type="submit">Получить ссылку</button>
      </form>
      <a class="auth-back" href="/auth/login.php">← Вернуться ко входу</a>
    <?php endif; ?>
  </main>
</body>
</html>
