<?php
declare(strict_types=1);

require __DIR__ . '/../../_analytics_bootstrap.php';

analytics_require_method('GET');
analytics_require_admin();

try {
  [$fromDateTime, $toDateTime] = analytics_date_range();
  $pdo = analytics_pdo();

  $stmt = $pdo->prepare(
    'SELECT
       JSON_UNQUOTE(JSON_EXTRACT(properties_json, "$.templateId")) AS templateId,
       JSON_UNQUOTE(JSON_EXTRACT(properties_json, "$.templateCategory")) AS category,
       SUM(event_name = "page_template_added") AS addedCount,
       SUM(event_name = "pdf_export_success") AS exportedCount
     FROM analytics_events
     WHERE occurred_at BETWEEN :from_date AND :to_date
       AND JSON_UNQUOTE(JSON_EXTRACT(properties_json, "$.templateId")) IS NOT NULL
     GROUP BY templateId, category
     ORDER BY addedCount DESC, exportedCount DESC
     LIMIT 50'
  );
  $stmt->execute([':from_date' => $fromDateTime, ':to_date' => $toDateTime]);

  analytics_json_response(['ok' => true, 'items' => $stmt->fetchAll()]);
} catch (Throwable $error) {
  error_log('[admin/templates] ' . $error->getMessage());
  analytics_json_response(['ok' => false, 'error' => 'server_error'], 500);
}

