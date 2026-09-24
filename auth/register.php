<?php
declare(strict_types=1);

require dirname(__DIR__) . '/shared/bootstrap.php';

tt_start_session();
if (tt_current_user()) {
    header('Location: /index.php?page=account');
    exit;
}

$error = '';
$nickname = '';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nickname = trim((string) ($_POST['nickname'] ?? ''));
    $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
    $password = (string) ($_POST['password'] ?? '');
    $passwordConfirm = (string) ($_POST['password_confirm'] ?? '');
    $csrf = (string) ($_POST['csrf'] ?? '');

    if (!hash_equals(tt_csrf_token(), $csrf)) {
        $error = 'Сессия формы устарела. Обновите страницу и попробуйте ещё раз.';
    } elseif (mb_strlen($nickname) < 2 || mb_strlen($nickname) > 100) {
        $error = 'Никнейм должен содержать от 2 до 100 символов.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 255) {
        $error = 'Введите корректную почту.';
    } elseif (strlen($password) < 8 || strlen($password) > 72) {
        $error = 'Пароль должен содержать от 8 до 72 символов.';
    } elseif ($password !== $passwordConfirm) {
        $error = 'Пароли не совпадают.';
    } else {
        try {
            $statement = tt_pdo()->prepare(
                'INSERT INTO users
                 (email, password_hash, first_name, last_name, company, role, status, downloads_reset_month, created_at, approved_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())'
            );
            $statement->execute([
                $email,
                password_hash($password, PASSWORD_DEFAULT),
                $nickname,
                '',
                '',
                'user',
                'active',
                date('Y-m'),
            ]);
            $userId = (int) tt_pdo()->lastInsertId();
            tt_login_user($userId, true);
            header('Location: /index.php?page=account');
            exit;
        } catch (PDOException $exception) {
            if ((string) $exception->getCode() === '23000') {
                $error = 'Аккаунт с такой почтой уже существует.';
            } else {
                throw $exception;
            }
        }
    }
}
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Регистрация — Tile Tools</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/shared/css/app.css">
</head>
<body class="auth-body">
  <main class="auth-card auth-card-register panel-card">
    <a class="brand" href="/index.php"><span class="brand-mark" aria-hidden="true">▦</span><span>Tile Tools</span></a>
    <p class="eyebrow">Новый аккаунт</p>
    <h1>Регистрация</h1>
    <p>Создайте единый аккаунт для всех сервисов Tile Tools.</p>
    <?php if ($error !== ''): ?><div class="auth-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></div><?php endif; ?>
    <form method="post" autocomplete="on">
      <input type="hidden" name="csrf" value="<?= htmlspecialchars(tt_csrf_token(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>">
      <label>Никнейм<input class="input" type="text" name="nickname" value="<?= htmlspecialchars($nickname, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" required minlength="2" maxlength="100" autocomplete="nickname"></label>
      <label>Почта<input class="input" type="email" name="email" value="<?= htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" required maxlength="255" autocomplete="email"></label>
      <label>Пароль<input class="input" type="password" name="password" required minlength="8" maxlength="72" autocomplete="new-password"><small>Минимум 8 символов.</small></label>
      <label>Повторите пароль<input class="input" type="password" name="password_confirm" required minlength="8" maxlength="72" autocomplete="new-password"></label>
      <button class="button button-primary" type="submit">Создать аккаунт</button>
    </form>
    <p class="auth-switch">Уже есть аккаунт? <a href="/auth/login.php">Войти</a></p>
    <a class="auth-back" href="/index.php">← Вернуться в Tile Tools</a>
  </main>
</body>
</html>
