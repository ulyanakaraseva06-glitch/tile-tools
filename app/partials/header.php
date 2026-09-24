<?php
/** @var string $page */
/** @var string $title */
$navigation = [
    'visualizer' => ['Сравни плитку', '◩'],
    'calculator' => ['Посчитай плитку', '⊞'],
    'pdf' => ['PDF и документы', '▤'],
    'equipment' => ['Оборудование', '▦'],
    'media' => ['Медиатека', '▣'],
    'projects' => ['Проекты', '⊟'],
    'services' => ['Услуги', '◇'],
];
$headerUser = tt_current_user();
$headerUserName = tt_user_display_name($headerUser);
$headerUserInitials = tt_user_initials($headerUser);
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Tile Tools — единый сервис для работы с плиткой, проектами и документами.">
  <meta name="csrf-token" content="<?= tt_escape(tt_csrf_token()) ?>">
  <meta name="account-user-id" content="<?= $headerUser ? (int) $headerUser['id'] : '' ?>">
  <meta name="login-url" content="/auth/login.php">
  <title><?= tt_escape($title) ?> — Tile Tools</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/shared/css/app.css?v=20260924-7">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="<?= tt_url('home') ?>" aria-label="На главную Tile Tools"><span class="brand-mark" aria-hidden="true">▦</span><span>Tile Tools</span></a>
    <nav class="main-nav" aria-label="Основная навигация">
      <?php foreach ($navigation as $key => [$label, $icon]): ?>
        <a class="nav-link <?= $page === $key ? 'is-active' : '' ?>" href="<?= tt_url($key) ?>"><span aria-hidden="true"><?= $icon ?></span><?= tt_escape($label) ?></a>
      <?php endforeach; ?>
    </nav>
    <nav class="account-nav" aria-label="Личный кабинет">
      <a class="nav-link" href="<?= tt_url('favorites') ?>">♡ <span>Избранное</span></a>
      <button class="icon-button" type="button" aria-label="Уведомления">♧<span class="notification-dot">0</span></button>
      <a class="profile-button <?= $page === 'account' ? 'is-active' : '' ?>" href="<?= tt_url('account') ?>" aria-label="Открыть личный кабинет"><span class="avatar"><?= tt_escape($headerUserInitials) ?></span><span class="profile-name"><?= tt_escape($headerUserName) ?></span><span aria-hidden="true">⌄</span></a>
    </nav>
  </header>
  <main class="app-main <?= in_array($page, ['visualizer', 'calculator', 'pdf'], true) ? 'app-main-service' : '' ?>">
