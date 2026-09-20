<?php
declare(strict_types=1);

require __DIR__ . '/../../_analytics_bootstrap.php';

analytics_require_method('GET');
analytics_require_admin();

try {
  [$fromDateTime, $toDateTime] = analytics_date_range();
  $pdo = analytics_pdo();
  $steps = [
    'landing_view',
    'landing_cta_open_app_click',
    'editor_open',
    'document_created',
    'zone_text_edited',
    'zone_image_uploaded',
    'pdf_check_opened',
    'pdf_export_success'
  ];

  $stmt = $pdo->prepare(
    'SELECT COUNT(DISTINCT anonymous_id)
     FROM analytics_events
     WHERE event_name = :event_name
       AND occurred_at BETWEEN :from_date AND :to_date'
  );

  $previous = null;
  $items = [];
  foreach ($steps as $step) {
    $stmt->execute([':event_name' => $step, ':from_date' => $fromDateTime, ':to_date' => $toDateTime]);
    $count = (int) $stmt->fetchColumn();
    $items[] = [
      'name' => $step,
      'count' => $count,
      'conversionFromPrevious' => $previous === null ? 1 : analytics_ratio($count, $previous),
      'dropFromPrevious' => $previous === null ? 0 : max(0, 1 - analytics_ratio($count, $previous))
    ];
    $previous = $count;
  }

  analytics_json_response(['ok' => true, 'steps' => $items]);
} catch (Throwable $error) {
  error_log('[admin/funnel] ' . $error->getMessage());
  analytics_json_response(['ok' => false, 'error' => 'server_error'], 500);
}

