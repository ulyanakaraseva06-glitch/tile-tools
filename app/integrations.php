<?php
declare(strict_types=1);

function tt_integration_url(string $service): string
{
    $defaults = [
        'visualizer' => 'http://127.0.0.1:8081/index.php',
        'calculator' => '/services/calculator/app/',
        'pdf' => '/services/pdf/app/',
    ];
    $configPath = dirname(__DIR__) . '/config.php';
    if (!is_file($configPath)) {
        return $defaults[$service] ?? '#';
    }
    $config = require $configPath;
    $configured = $config['integrations'][$service] ?? null;
    return is_string($configured) && $configured !== '' ? $configured : ($defaults[$service] ?? '#');
}

function tt_render_integrated_service(string $service, string $heading, string $sourceName): void
{
    $url = tt_integration_url($service);
    ?>
    <section class="service-host-heading">
      <div>
        <p class="eyebrow">Исходный сервис без изменения функций</p>
        <h1><?= tt_escape($heading) ?></h1>
        <p>Внутри загружается оригинальное приложение <?= tt_escape($sourceName) ?>. Tile Tools добавляет только общую оболочку и связи с общими данными.</p>
      </div>
      <a class="button button-secondary" href="<?= tt_escape($url) ?>" target="_blank" rel="noopener">Открыть отдельно ↗</a>
    </section>
    <section class="service-host">
      <iframe class="service-frame" src="<?= tt_escape($url) ?>" title="<?= tt_escape($heading) ?>" loading="eager" allow="clipboard-read; clipboard-write; fullscreen"></iframe>
    </section>
    <?php
}
