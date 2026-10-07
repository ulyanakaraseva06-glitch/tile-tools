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
  <link rel="stylesheet" href="/shared/css/app.css?v=20261007-6">
  <link rel="stylesheet" href="/shared/css/design-system.css?v=20261006-3">
</head>
<body class="page-<?= tt_escape($page) ?>">
  <header class="topbar">
    <details class="header-menu header-brand-menu" data-header-menu>
      <summary class="brand brand-stacked" aria-label="Открыть меню Tile Tools"><img class="brand-logo-image" src="/shared/images/tile-tools-logo-final.svg?v=20261004-2" alt="Tile Tools"></summary>
      <div class="header-menu-popover">
        <nav class="header-menu-grid" aria-label="Все разделы Tile Tools">
          <?php foreach ($navigation as $key => [$label, $icon]): ?><a class="<?= $page === $key ? 'is-active' : '' ?>" href="<?= tt_url($key) ?>"><span aria-hidden="true"><?= $icon ?></span><b><?= tt_escape($label) ?></b><small><?= tt_escape(['visualizer'=>'Примерить в интерьере','calculator'=>'Расчёт и раскладка','pdf'=>'Документы и презентации','equipment'=>'Каталог решений','media'=>'Общий каталог плитки','projects'=>'Сохранённые работы','services'=>'Vilray Studio'][$key]) ?></small></a><?php endforeach; ?>
          <a class="<?= $page === 'favorites' ? 'is-active' : '' ?>" href="<?= tt_url('favorites') ?>"><span aria-hidden="true">♡</span><b>Избранное</b><small>Сохранённые материалы</small></a>
          <a class="<?= $page === 'about' ? 'is-active' : '' ?>" href="<?= tt_url('about') ?>"><span aria-hidden="true">ⓘ</span><b>О сервисе</b><small>Возможности платформы</small></a>
          <a class="<?= $page === 'help' ? 'is-active' : '' ?>" href="<?= tt_url('help') ?>"><span aria-hidden="true">?</span><b>Помощь</b><small>Подсказки по работе</small></a>
        </nav>
        <a class="header-account-link <?= $page === 'account' ? 'is-active' : '' ?>" href="<?= tt_url('account') ?>"><span class="avatar"><?= tt_escape($headerUserInitials) ?></span><span><b><?= tt_escape($headerUserName) ?></b><small><?= $headerUser ? 'Открыть личный кабинет' : 'Войти или зарегистрироваться' ?></small></span><i>→</i></a>
      </div>
    </details>
    <?php if ($page === 'visualizer'): ?>
      <div class="visualizer-room-menu" data-visualizer-room-menu>
        <button class="visualizer-room-trigger" type="button" data-visualizer-room-trigger aria-expanded="false">
          <span data-visualizer-room-label>Выберите помещение</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="visualizer-room-popover" data-visualizer-room-popover hidden>
          <?php foreach ([
              ['bathroom_m', 'Ванная M', 'r1.jpg'],
              ['bathroom_xl', 'Ванная XL', 'r2.jpg'],
              ['bathroom_s', 'Ванная S', 'r3.jpg'],
              ['hall', 'Зал', 'r4.jpg'],
              ['kitchen', 'Кухня-гостиная', 'r5.jpg'],
          ] as [$roomId, $roomLabel, $roomImage]): ?>
            <button class="visualizer-room-card <?= $roomId === 'bathroom_m' ? 'is-active' : '' ?>" type="button" data-room-id="<?= tt_escape($roomId) ?>">
              <img src="/source/sravni-plitku/images/renders/<?= tt_escape($roomImage) ?>" alt="<?= tt_escape($roomLabel) ?>">
              <span><?= tt_escape($roomLabel) ?></span>
            </button>
          <?php endforeach; ?>
        </div>
      </div>
    <?php endif; ?>
    <div class="topbar-context" aria-current="page">
      <?php if ($page !== 'favorites'): ?><span><?= tt_escape($navigation[$page][1] ?? '▦') ?></span><?php endif; ?>
      <strong><?= tt_escape($navigation[$page][0] ?? $title) ?></strong>
    </div>
    <?php if ($page === 'media'): ?>
      <div class="media-topbar-tools" aria-label="Фильтры медиатеки">
        <label class="media-topbar-search"><span aria-hidden="true">⌕</span><input id="media-search" type="search" placeholder="Поиск по названию, бренду или коллекции"></label>
        <select class="input" id="media-brand"><option value="">Все бренды</option></select>
        <select class="input" id="media-color"><option value="">Все цвета</option></select>
        <select class="input" id="media-size"><option value="">Все размеры</option></select>
        <select class="input" id="media-surface"><option value="">Все поверхности</option></select>
        <select class="input" id="media-design"><option value="">Все дизайны</option></select>
        <button class="media-topbar-reset" id="media-reset" type="button">↻</button>
        <span class="badge" id="media-total">Загрузка…</span>
        <?php if ($page === 'media' && ($headerUser['role'] ?? '') === 'admin'): ?><button class="button button-primary media-topbar-add" id="media-admin-add" type="button">＋ Добавить</button><?php endif; ?>
        <button class="media-topbar-search-button" id="media-search-button" type="button" hidden>Найти</button>
      </div>
    <?php endif; ?>
    <?php if ($page === 'projects'): ?>
      <div class="projects-topbar-tools" aria-label="Фильтры проектов">
        <label class="projects-topbar-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Поиск по названию проекта…" data-project-search></label>
        <select class="input" data-project-status><option value="">Все статусы</option><option value="draft">Черновик</option><option value="active">В работе</option><option value="done">Завершён</option><option value="archived">Архив</option></select>
        <select class="input" data-project-type><option value="">Все типы</option><option value="visualization">Сравни плитку</option><option value="calculation">Посчитай плитку</option><option value="pdf">PDF и документы</option></select>
        <select class="input" data-project-sort><option value="updated-desc">Сначала новые</option><option value="updated-asc">Сначала старые</option><option value="title">По названию</option></select>
        <button class="button button-primary projects-topbar-new" type="button" data-new-project>＋ Новый проект</button>
      </div>
    <?php endif; ?>
    <?php if ($page === 'equipment'): ?>
      <div class="equipment-topbar-tools" aria-label="Поиск и оглавление оборудования">
        <form class="equipment-topbar-search" data-equipment-search>
          <label class="sr-only" for="equipment-query">Поиск оборудования</label>
          <span aria-hidden="true">⌕</span>
          <input id="equipment-query" name="q" data-equipment-control type="search" placeholder="Поиск оборудования, брендов, категорий...">
          <button class="button button-primary" type="submit">Найти</button>
        </form>
        <label class="equipment-topbar-outline">
          <span>Оглавление</span>
          <select class="input" name="category" data-equipment-control aria-label="Оглавление оборудования">
            <option value="">Все категории</option>
          </select>
        </label>
      </div>
    <?php endif; ?>
    <?php if ($page === 'services'): ?>
      <div class="services-topbar-title" aria-label="Описание раздела услуг">
        <strong>Профессиональный контент для ваших продаж</strong>
        <span>Визуализация, каталоги, инфографика, видео и digital</span>
      </div>
    <?php endif; ?>
    <?php if ($page === 'about'): ?>
      <div class="about-topbar-title" aria-label="О сервисе">
        <strong>О сервисе</strong>
        <span>Как Tile Tools помогает пройти путь от выбора плитки до готового проекта</span>
      </div>
    <?php endif; ?>
    <?php if ($page === 'help'): ?>
      <div class="help-topbar-title" aria-label="Как начать работу">
        <strong>Как начать работу</strong>
        <span>Пошаговые ответы по проектам и всем сервисам Tile Tools</span>
      </div>
    <?php endif; ?>
    <div class="service-toolbar" data-service-toolbar hidden aria-label="Инструменты текущего сервиса"></div>
  </header>
  <main class="app-main <?= in_array($page, ['visualizer', 'calculator', 'pdf'], true) ? 'app-main-service' : '' ?>">
