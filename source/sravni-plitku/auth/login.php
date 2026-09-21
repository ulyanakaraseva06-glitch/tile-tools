<?php
require_once __DIR__ . '/functions.php';
app_session_start();

// Уже вошёл и активен — на главную
$cu = current_user();
if ($cu) { list($ok) = access_gate($cu); if ($ok) { header('Location: ../index.php'); exit; } }

$error = '';
$notice = isset($_GET['msg']) ? trim($_GET['msg']) : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_check($_POST['csrf'] ?? '')) {
        $error = 'Сессия устарела, попробуйте ещё раз.';
    } else {
        $email = $_POST['email'] ?? '';
        $pass  = $_POST['password'] ?? '';
        $user  = find_user_by_email($email);
        if (!$user || !password_verify($pass, $user['password_hash'])) {
            $error = 'Неверный e-mail или пароль.';
        } else {
            list($ok, $msg) = access_gate($user);
            if (!$ok) {
                $error = $msg;
            } else {
                session_regenerate_id(true);
                $_SESSION['uid'] = (int)$user['id'];
                csrf_token();
                header('Location: ../index.php');
                exit;
            }
        }
    }
}
$token = csrf_token();
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Вход — СравниПлитку</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="auth.css">
</head>
<body>
<div class="auth-wrap">
  <div class="auth-card">
    <div class="auth-logo"><span class="mark"><i></i><i></i><i></i><i></i></span><b>Сравни&nbsp;Плитку</b></div>
    <div class="auth-title">Вход в кабинет</div>
    <div class="auth-sub">Введите данные вашего аккаунта</div>

    <?php if ($error): ?><div class="alert alert--err"><?= h($error) ?></div><?php endif; ?>
    <?php if ($notice && !$error): ?><div class="alert alert--info"><?= h($notice) ?></div><?php endif; ?>

    <form method="post" autocomplete="on">
      <input type="hidden" name="csrf" value="<?= h($token) ?>">
      <div class="field">
        <label>E-mail</label>
        <input type="email" name="email" required value="<?= h($_POST['email'] ?? '') ?>">
      </div>
      <div class="field">
        <label>Пароль</label>
        <input type="password" name="password" required>
      </div>
      <button class="btn btn--primary" type="submit">Войти</button>
    </form>

    <div class="auth-foot">Нет аккаунта? <a href="register.php">Зарегистрироваться</a></div>
  </div>
</div>
</body>
</html>
