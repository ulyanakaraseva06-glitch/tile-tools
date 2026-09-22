<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/shared/bootstrap.php';

function tt_escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function tt_url(string $page): string
{
    return '/index.php?page=' . rawurlencode($page);
}

function tt_render_page(string $page): void
{
    $titles = [
        'home' => 'Tile Tools',
        'visualizer' => 'Сравни плитку',
        'calculator' => 'Посчитай плитку',
        'pdf' => 'PDF и документы',
        'equipment' => 'Оборудование',
        'media' => 'Медиатека',
        'projects' => 'Проекты',
        'services' => 'Услуги',
        'partners' => 'Для партнёров',
        'favorites' => 'Избранное',
        'account' => 'Личный кабинет',
    ];
    $title = $titles[$page] ?? 'Tile Tools';

    require __DIR__ . '/partials/header.php';
    $pageFile = __DIR__ . '/pages/' . $page . '.php';
    if (is_file($pageFile)) {
        require $pageFile;
    }
    require __DIR__ . '/partials/footer.php';
}
