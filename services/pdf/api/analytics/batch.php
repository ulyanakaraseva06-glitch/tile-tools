<?php
declare(strict_types=1);

require __DIR__ . '/../_analytics_bootstrap.php';

analytics_require_method('POST');

try {
  $payload = analytics_read_json();
  $items = $payload['events'] ?? null;

  if (!is_array($items)) {
    analytics_json_response(['ok' => false, 'error' => 'invalid_batch'], 400);
  }

  $items = array_slice($items, 0, 50);
  $events = array_map('analytics_normalize_event', $items);
  $pdo = analytics_pdo();
  $pdo->beginTransaction();

  foreach ($events as $event) {
    analytics_save_event($pdo, $event);
  }

  $pdo->commit();
  analytics_json_response(['ok' => true, 'accepted' => count($events)]);
} catch (Throwable $error) {
  if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
    $pdo->rollBack();
  }
  error_log('[analytics/batch] ' . $error->getMessage());
  analytics_json_response(['ok' => false, 'error' => 'server_error'], 500);
}

