<?php
declare(strict_types=1);

require __DIR__ . '/../_analytics_bootstrap.php';

analytics_require_method('POST');

try {
  $payload = analytics_read_json();
  $event = analytics_normalize_event($payload);
  $pdo = analytics_pdo();
  analytics_save_event($pdo, $event);
  analytics_json_response(['ok' => true]);
} catch (Throwable $error) {
  error_log('[analytics/event] ' . $error->getMessage());
  analytics_json_response(['ok' => false, 'error' => 'server_error'], 500);
}

