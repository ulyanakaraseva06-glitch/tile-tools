<?php
require_once __DIR__ . '/functions.php';
app_session_start();

$error = '';
$done  = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_check($_POST['csrf'] ?? '')) {
        $error = 'Сессия устарела, попробуйте ещё раз.';
    } elseif (!captcha_check($_POST['captcha'] ?? '')) {
        $error = 'Неверный ответ на проверочный вопрос.';
    } else {
        $first = trim($_POST['first_name'] ?? '');
        $last  = trim($_POST['last_name'] ?? '');
        $comp  = trim($_POST['company'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $pass  = $_POST['password'] ?? '';
        $pass2 = $_POST['password2'] ?? '';

        if ($first === '' || $last === '') {
            $error = 'Укажите имя и фамилию.';
        } elseif (!valid_email($email)) {
            $error = 'Некорректный e-mail.';
        } elseif (mb_strlen($pass) < 6) {
            $error = 'Пароль должен быть не короче 6 символов.';
        } elseif ($pass !== $pass2) {
            $error = 'Пароли не совпадают.';
        } elseif (find_user_by_email($email)) {
            $error = 'Пользователь с таким e-mail уже зарегистрирован.';
        } else {
            create_user([
                'email' => $email, 'password' => $pass,
                'first_name' => $first, 'last_name' => $last, 'company' => $comp,
            ], 'pending', 'user');
            $done = true;
        }
    }
}
$token   = csrf_token();
$captcha = captcha_new();
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Регистрация — СравниПлитку</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="auth.css">
</head>
<body>
<div class="auth-wrap">
  <div class="auth-card">
    <div class="auth-logo"><span class="mark"><i></i><i></i><i></i><i></i></span><b>Сравни&nbsp;Плитку</b></div>

    <?php if ($done): ?>
      <div class="auth-title">Заявка отправлена</div>
      <div class="auth-sub">Ваш аккаунт ожидает одобрения администратором. После одобрения вы сможете войти.</div>
      <a class="btn btn--primary" href="login.php">Перейти ко входу</a>
    <?php else: ?>
      <div class="auth-title">Регистрация</div>
      <div class="auth-sub">Заполните данные. Доступ открывается после одобрения.</div>

      <?php if ($error): ?><div class="alert alert--err"><?= h($error) ?></div><?php endif; ?>

      <form method="post" autocomplete="on">
        <input type="hidden" name="csrf" value="<?= h($token) ?>">
        <div class="row2">
          <div class="field"><label>Имя</label><input name="first_name" required value="<?= h($_POST['first_name'] ?? '') ?>"></div>
          <div class="field"><label>Фамилия</label><input name="last_name" required value="<?= h($_POST['last_name'] ?? '') ?>"></div>
        </div>
        <div class="field"><label>Компания</label><input name="company" value="<?= h($_POST['company'] ?? '') ?>"></div>
        <div class="field"><label>E-mail</label><input type="email" name="email" required value="<?= h($_POST['email'] ?? '') ?>"></div>
        <div class="row2">
          <div class="field"><label>Пароль</label><input type="password" name="password" required></div>
          <div class="field"><label>Повторите пароль</label><input type="password" name="password2" required></div>
        </div>
        <div class="field">
          <label>Сколько будет <?= h($captcha) ?> ?</label>
          <div class="captcha">
            <span class="q"><?= h($captcha) ?> =</span>
            <input type="text" name="captcha" inputmode="numeric" required autocomplete="off">
          </div>
        </div>
        <button class="btn btn--primary" type="submit">Зарегистрироваться</button>
      </form>

      <div class="auth-foot">Уже есть аккаунт? <a href="login.php">Войти</a></div>
    <?php endif; ?>
  </div>
</div>
</body>
</html>
