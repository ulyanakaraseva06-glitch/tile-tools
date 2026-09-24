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

function tt_render_integrated_service(string $service, string $heading): void
{
    $url = tt_integration_url($service);
    $user = tt_current_user();
    if ($user) {
        $url .= (str_contains($url, '?') ? '&' : '?') . 'account=' . rawurlencode((string) $user['id']);
    }
    ?>
    <section class="service-host">
      <iframe class="service-frame" src="<?= tt_escape($url) ?>" title="<?= tt_escape($heading) ?>" loading="eager" allow="clipboard-read; clipboard-write; fullscreen"></iframe>
    </section>
    <?php
}
