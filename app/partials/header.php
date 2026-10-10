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
$menuIcons = [
    'visualizer' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8.5h16M4 12h16M4 15.5h16" stroke-linecap="round"/><path d="M6 5.5h12" stroke-linecap="round"/></svg>',
    'calculator' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="5" width="14" height="14" rx="1"/><path d="M12 5v14M5 12h14"/></svg>',
    'pdf' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="4.5" width="12" height="15" rx="2"/><path d="M9 9h6M9 12h6M9 15h4" stroke-linecap="round"/></svg>',
    'equipment' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4.5" y="5" width="7" height="7" rx="1"/><rect x="12.5" y="12" width="7" height="7" rx="1"/><path d="M12.5 7h4v4M7.5 13v4h4" stroke-linecap="round"/></svg>',
    'media' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="5" width="12" height="12" rx="2"/><path d="M5 8v10a1 1 0 0 0 1 1h10"/><circle cx="14.5" cy="9.5" r="1"/><path d="m9 15 2.6-2.5 2 1.8 1.5-1.4L18 16" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'projects' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8.5a2 2 0 0 1 2-2h4l1.6 2H18a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" stroke-linejoin="round"/></svg>',
    'favorites' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 19s-6.5-3.8-6.5-8.1A3.5 3.5 0 0 1 12 8.8a3.5 3.5 0 0 1 6.5 2.1C18.5 15.2 12 19 12 19Z" stroke-linejoin="round"/></svg>',
    'services' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8M4 12h16M10 12v2h4v-2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'about' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 10.5v5M12 8h.01" stroke-linecap="round"/></svg>',
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
  <link rel="stylesheet" href="/shared/css/app.css?v=20261010-1">
  <link rel="stylesheet" href="/shared/css/design-system.css?v=20261008-17">
</head>
<body class="page-<?= tt_escape($page) ?>">
  <header class="topbar">
    <details class="header-menu header-brand-menu" data-header-menu>
      <summary class="brand brand-stacked" aria-label="Открыть меню Tile Tools">
        <img class="brand-logo-image" src="/shared/images/tile-tools-logo-final.svg?v=20261008-5" alt="Tile Tools">
        <span class="brand-menu-zone"><small>Меню</small><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></span>
      </summary>
      <div class="header-menu-popover">
        <header class="header-menu-heading"><strong>Инструменты и разделы</strong><button type="button" data-menu-close aria-label="Закрыть меню">×</button></header>
        <nav class="header-menu-grid" aria-label="Все разделы Tile Tools">
          <?php foreach ($navigation as $key => [$label, $icon]): ?><a class="<?= $page === $key ? 'is-active' : '' ?>" href="<?= tt_url($key) ?>"><span class="header-menu-icon" aria-hidden="true"><?= $menuIcons[$key] ?></span><b><?= tt_escape($label) ?></b><small><?= tt_escape(['visualizer'=>'Примерить в интерьере','calculator'=>'Расчёт и раскладка','pdf'=>'Документы и презентации','equipment'=>'Каталог решений','media'=>'Общий каталог плитки','projects'=>'Сохранённые работы','services'=>'Vilray Studio'][$key]) ?></small></a><?php endforeach; ?>
          <a class="<?= $page === 'favorites' ? 'is-active' : '' ?>" href="<?= tt_url('favorites') ?>"><span class="header-menu-icon" aria-hidden="true"><?= $menuIcons['favorites'] ?></span><b>Избранное</b><small>Сохранённые материалы</small></a>
          <a class="<?= $page === 'about' ? 'is-active' : '' ?>" href="<?= tt_url('about') ?>"><span class="header-menu-icon" aria-hidden="true"><?= $menuIcons['about'] ?></span><b>О сервисе</b><small>Возможности платформы</small></a>
        </nav>
        <footer class="header-menu-footer">
          <a class="header-help-link <?= $page === 'help' ? 'is-active' : '' ?>" href="<?= tt_url('help') ?>"><span aria-hidden="true">?</span><b>Помощь</b></a>
          <a class="header-account-link <?= $page === 'account' ? 'is-active' : '' ?>" href="<?= tt_url('account') ?>"><span class="avatar"><?= tt_escape($headerUserInitials) ?></span><b><?= tt_escape($headerUser ? $headerUserName : 'Гость — Войти / Регистрация') ?></b><i>→</i></a>
        </footer>
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
              <img src="/source/sravni-plitku/images/renders/thumbs/<?= tt_escape($roomImage) ?>?v=20261007-2" alt="<?= tt_escape($roomLabel) ?>" width="960" height="720" loading="eager" decoding="async">
              <span><?= tt_escape($roomLabel) ?></span>
            </button>
          <?php endforeach; ?>
        </div>
      </div>
    <?php endif; ?>
    <?php if ($page === 'pdf'): ?>
      <div class="pdf-template-menu" data-pdf-template-menu>
        <button class="pdf-template-trigger" type="button" data-pdf-template-trigger aria-expanded="false">
          <span data-pdf-template-label>Шаблоны страниц</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="pdf-template-popover" data-pdf-template-popover hidden>
          <header class="pdf-template-popover-heading">
            <strong>Шаблоны страниц</strong>
            <span data-pdf-template-count>Загрузка…</span>
          </header>
          <div class="pdf-template-list" data-pdf-template-list>
            <p class="pdf-template-loading">Загружаем шаблоны…</p>
          </div>
        </div>
      </div>
    <?php endif; ?>
    <?php if (in_array($page, ['visualizer', 'calculator', 'pdf'], true)): ?>
      <div class="topbar-context" aria-current="page">
        <?php if ($page !== 'favorites'): ?><span><?= tt_escape($navigation[$page][1] ?? '▦') ?></span><?php endif; ?>
        <strong><?= tt_escape($navigation[$page][0] ?? $title) ?></strong>
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
      </div>
    <?php endif; ?>
    <div class="service-toolbar" data-service-toolbar hidden aria-label="Инструменты текущего сервиса"></div>
    <?php if (in_array($page, ['visualizer', 'calculator', 'pdf'], true)): ?>
      <div class="service-project-actions" data-service-project-actions aria-label="Действия с проектом">
        <div class="service-history-actions" aria-label="История изменений">
          <button type="button" class="service-project-icon" data-service-action="undo" aria-label="Назад">↶</button>
          <button type="button" class="service-project-icon" data-service-action="redo" aria-label="Вперёд">↷</button>
        </div>
        <?php if ($page === 'calculator'): ?>
          <button type="button" class="service-project-button service-project-button--calculate" data-service-action="calculate">Расчёт</button>
        <?php endif; ?>
        <button type="button" class="service-project-button" data-service-action="save">Сохранить</button>
        <details class="service-export-menu" data-service-export-menu>
          <summary class="service-project-button">Выгрузить</summary>
          <div class="service-export-options" role="menu">
            <button type="button" data-service-export="image" role="menuitem">Как картинку</button>
            <button type="button" data-service-export="pdf" role="menuitem">Как PDF</button>
          </div>
        </details>
        <button type="button" class="service-project-button" data-service-action="open">Открыть</button>
      </div>
      <dialog class="service-projects-dialog" data-service-projects-dialog>
        <form method="dialog" class="service-projects-dialog-head">
          <strong>Проекты сервиса</strong><button aria-label="Закрыть">×</button>
        </form>
        <p data-service-projects-empty hidden>Сохранённых проектов пока нет.</p>
        <div class="service-projects-list" data-service-projects-list></div>
        <a class="service-projects-all" href="<?= tt_url('projects') ?>">Все проекты</a>
      </dialog>
    <?php endif; ?>
  </header>
  <main class="app-main <?= in_array($page, ['visualizer', 'calculator', 'pdf'], true) ? 'app-main-service' : '' ?>">
