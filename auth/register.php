<?php
declare(strict_types=1);

require dirname(__DIR__) . '/shared/bootstrap.php';
require dirname(__DIR__) . '/shared/levels.php';

tt_start_session();
if (tt_current_user()) {
    header('Location: /index.php?page=account');
    exit;
}

$error = '';
$nickname = '';
$email = '';
$invitedByFriend = false;
$referrerNickname = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nickname = trim((string) ($_POST['nickname'] ?? ''));
    $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
    $password = (string) ($_POST['password'] ?? '');
    $passwordConfirm = (string) ($_POST['password_confirm'] ?? '');
    $invitedByFriend = (string) ($_POST['invited_by_friend'] ?? '') === '1';
    $referrerNickname = trim((string) ($_POST['referrer_nickname'] ?? ''));
    $csrf = (string) ($_POST['csrf'] ?? '');

    if (!hash_equals(tt_csrf_token(), $csrf)) {
        $error = 'Сессия формы устарела. Обновите страницу и попробуйте ещё раз.';
    } elseif (mb_strlen($nickname) < 2 || mb_strlen($nickname) > 40 || !preg_match('/^[\p{L}\p{N}._-]+$/u', $nickname)) {
        $error = 'Никнейм должен содержать 2–40 букв, цифр, точек, дефисов или подчёркиваний.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 255) {
        $error = 'Введите корректную почту.';
    } elseif (strlen($password) < 8 || strlen($password) > 72) {
        $error = 'Пароль должен содержать от 8 до 72 символов.';
    } elseif ($password !== $passwordConfirm) {
        $error = 'Пароли не совпадают.';
    } elseif ($invitedByFriend && ($referrerNickname === '' || mb_strlen($referrerNickname) > 40)) {
        $error = 'Введите никнейм друга, который вас пригласил.';
    } else {
        $pdo = tt_pdo();
        try {
            $nicknameCheck = $pdo->prepare('SELECT id FROM users WHERE LOWER(nickname) = LOWER(?) LIMIT 1');
            $nicknameCheck->execute([$nickname]);
            if ($nicknameCheck->fetchColumn()) {
                throw new DomainException('Этот никнейм уже занят. Выберите другой.');
            }

            $referrerId = null;
            if ($invitedByFriend) {
                $referrerCheck = $pdo->prepare("SELECT id FROM users WHERE LOWER(nickname) = LOWER(?) AND status = 'active' LIMIT 1");
                $referrerCheck->execute([$referrerNickname]);
                $referrerId = $referrerCheck->fetchColumn();
                if (!$referrerId) {
                    throw new DomainException('Пользователь с таким никнеймом не найден. Проверьте написание.');
                }
            }

            $pdo->beginTransaction();
            $statement = $pdo->prepare(
                'INSERT INTO users
                 (email, nickname, password_hash, first_name, last_name, company, role, status, downloads_reset_month, created_at, approved_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())'
            );
            $statement->execute([
                $email,
                $nickname,
                password_hash($password, PASSWORD_DEFAULT),
                $nickname,
                '',
                '',
                'user',
                'active',
                date('Y-m'),
            ]);
            $userId = (int) $pdo->lastInsertId();
            $pdo->prepare('INSERT INTO tt_user_progress (user_id) VALUES (?)')->execute([$userId]);
            if ($referrerId !== null) {
                $pdo->prepare('INSERT INTO tt_user_referrals (referrer_user_id, referred_user_id) VALUES (?, ?)')
                    ->execute([(int) $referrerId, $userId]);
                tt_sync_user_level_quota($pdo, (int) $referrerId);
            }
            tt_sync_user_level_quota($pdo, $userId);
            $pdo->commit();
            tt_login_user($userId, true);
            header('Location: /index.php?page=account');
            exit;
        } catch (DomainException $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $error = $exception->getMessage();
        } catch (PDOException $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            if ((string) $exception->getCode() === '23000') {
                $error = 'Такая почта или никнейм уже используются.';
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
  <link rel="stylesheet" href="/shared/css/app.css?v=20260927-2">
  <link rel="stylesheet" href="/shared/css/design-system.css?v=20260930-1">
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
      <label>Никнейм<input class="input" type="text" name="nickname" value="<?= htmlspecialchars($nickname, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" required minlength="2" maxlength="40" pattern="[A-Za-zА-Яа-яЁё0-9._-]+" autocomplete="nickname"><small>По нему друзья смогут указать вас при регистрации.</small></label>
      <label>Почта<input class="input" type="email" name="email" value="<?= htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" required maxlength="255" autocomplete="email"></label>
      <label>Пароль<input class="input" type="password" name="password" required minlength="8" maxlength="72" autocomplete="new-password"><small>Минимум 8 символов.</small></label>
      <label>Повторите пароль<input class="input" type="password" name="password_confirm" required minlength="8" maxlength="72" autocomplete="new-password"></label>
      <label class="auth-check auth-referral-check"><input type="checkbox" name="invited_by_friend" value="1" <?= $invitedByFriend ? 'checked' : '' ?> data-referral-toggle><span>Меня пригласил друг</span></label>
      <label class="auth-referrer-field" <?= $invitedByFriend ? '' : 'hidden' ?> data-referrer-field>Никнейм друга<input class="input" type="text" name="referrer_nickname" value="<?= htmlspecialchars($referrerNickname, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" maxlength="40" autocomplete="off" data-referrer-input><small>После регистрации другу начислится одно приглашение.</small></label>
      <button class="button button-primary" type="submit">Создать аккаунт</button>
    </form>
    <p class="auth-switch">Уже есть аккаунт? <a href="/auth/login.php">Войти</a></p>
    <a class="auth-back" href="/index.php">← Вернуться в Tile Tools</a>
  </main>
  <script>
    (() => {
      const toggle = document.querySelector('[data-referral-toggle]');
      const field = document.querySelector('[data-referrer-field]');
      const input = document.querySelector('[data-referrer-input]');
      if (!toggle || !field || !input) return;
      const sync = () => { field.hidden = !toggle.checked; input.required = toggle.checked; };
      toggle.addEventListener('change', sync);
      sync();
    })();
  </script>
</body>
</html>
