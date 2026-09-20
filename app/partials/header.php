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
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Tile Tools — единый сервис для работы с плиткой, проектами и документами.">
  <title><?= tt_escape($title) ?> — Tile Tools</title>
  <link rel="stylesheet" href="/shared/css/app.css">
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
      <button class="profile-button" type="button" aria-label="Профиль пользователя"><span class="avatar">Г</span><span class="profile-name">Гость</span><span aria-hidden="true">⌄</span></button>
    </nav>
  </header>
  <main class="app-main">
