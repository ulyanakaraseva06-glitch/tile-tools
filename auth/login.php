<?php
declare(strict_types=1);

require dirname(__DIR__) . '/shared/bootstrap.php';

tt_start_session();
if (tt_current_user()) {
    header('Location: /index.php?page=account');
    exit;
}

$error = '';
$email = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
    $password = (string) ($_POST['password'] ?? '');
    $csrf = (string) ($_POST['csrf'] ?? '');

    if (!hash_equals(tt_csrf_token(), $csrf)) {
        $error = 'Сессия формы устарела. Обновите страницу и попробуйте ещё раз.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
        $error = 'Введите корректную почту и пароль.';
    } else {
        $statement = tt_pdo()->prepare('SELECT id, password_hash, status FROM users WHERE email = ? LIMIT 1');
        $statement->execute([$email]);
        $candidate = $statement->fetch();
        if (!$candidate || !password_verify($password, (string) $candidate['password_hash'])) {
            $error = 'Неверная почта или пароль.';
        } elseif (($candidate['status'] ?? '') !== 'active') {
            $error = 'Аккаунт пока не активен. Обратитесь к администратору.';
        } else {
            session_regenerate_id(true);
            $_SESSION['uid'] = (int) $candidate['id'];
            header('Location: /index.php?page=account');
            exit;
        }
    }
}
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Вход — Tile Tools</title>
  <link rel="stylesheet" href="/shared/css/app.css">
</head>
<body class="auth-body">
  <main class="auth-card panel-card">
    <a class="brand" href="/index.php"><span class="brand-mark" aria-hidden="true">▦</span><span>Tile Tools</span></a>
    <p class="eyebrow">Личный кабинет</p>
    <h1>Войти в аккаунт</h1>
    <p>Используйте почту и пароль зарегистрированного пользователя.</p>
    <?php if ($error !== ''): ?><div class="auth-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></div><?php endif; ?>
    <form method="post">
      <input type="hidden" name="csrf" value="<?= htmlspecialchars(tt_csrf_token(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>">
      <label>Почта<input class="input" type="email" name="email" value="<?= htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" required autocomplete="email"></label>
      <label>Пароль<input class="input" type="password" name="password" required autocomplete="current-password"></label>
      <button class="button button-primary" type="submit">Войти</button>
    </form>
    <a class="auth-back" href="/index.php">← Вернуться в Tile Tools</a>
  </main>
</body>
</html>
