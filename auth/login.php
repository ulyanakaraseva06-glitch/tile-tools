<?php
declare(strict_types=1);

require dirname(__DIR__) . '/shared/bootstrap.php';

tt_start_session();
if (tt_current_user()) {
    header('Location: /index.php?page=account');
    exit;
}

$error = '';
$login = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $login = mb_strtolower(trim((string) ($_POST['login'] ?? $_POST['email'] ?? '')));
    $password = (string) ($_POST['password'] ?? '');
    $remember = isset($_POST['remember']) && $_POST['remember'] === '1';
    $csrf = (string) ($_POST['csrf'] ?? '');

    if (!hash_equals(tt_csrf_token(), $csrf)) {
        $error = 'Сессия формы устарела. Обновите страницу и попробуйте ещё раз.';
    } elseif ($login === '' || $password === '') {
        $error = 'Введите почту или логин и пароль.';
    } else {
        $statement = tt_pdo()->prepare(
            'SELECT id, password_hash, status FROM users
             WHERE email = ? OR (role = \'admin\' AND LOWER(first_name) = ?)
             ORDER BY (email = ?) DESC LIMIT 1'
        );
        $statement->execute([$login, $login, $login]);
        $candidate = $statement->fetch();
        if (!$candidate || !password_verify($password, (string) $candidate['password_hash'])) {
            $error = 'Неверный логин или пароль.';
        } elseif (($candidate['status'] ?? '') !== 'active') {
            $error = 'Аккаунт пока не активен. Обратитесь к администратору.';
        } else {
            if (password_needs_rehash((string) $candidate['password_hash'], PASSWORD_DEFAULT)) {
                tt_pdo()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([
                    password_hash($password, PASSWORD_DEFAULT),
                    (int) $candidate['id'],
                ]);
            }
            tt_login_user((int) $candidate['id'], $remember);
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/shared/css/app.css">
</head>
<body class="auth-body">
  <main class="auth-card panel-card">
    <a class="brand" href="/index.php"><span class="brand-mark" aria-hidden="true">▦</span><span>Tile Tools</span></a>
    <p class="eyebrow">Личный кабинет</p>
    <h1>Войти в аккаунт</h1>
    <p>Используйте почту или логин администратора и пароль.</p>
    <?php if ($error !== ''): ?><div class="auth-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></div><?php endif; ?>
    <form method="post">
      <input type="hidden" name="csrf" value="<?= htmlspecialchars(tt_csrf_token(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>">
      <label>Почта или логин<input class="input" type="text" name="login" value="<?= htmlspecialchars($login, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" required autocomplete="username"></label>
      <label>Пароль<input class="input" type="password" name="password" required autocomplete="current-password"></label>
      <label class="auth-check"><input type="checkbox" name="remember" value="1" checked><span>Оставаться в системе на этом устройстве</span></label>
      <button class="button button-primary" type="submit">Войти</button>
    </form>
    <p class="auth-switch">Нет аккаунта? <a href="/auth/register.php">Зарегистрироваться</a></p>
    <a class="auth-back" href="/index.php">← Вернуться в Tile Tools</a>
  </main>
</body>
</html>
