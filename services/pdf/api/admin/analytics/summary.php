<?php
declare(strict_types=1);

require __DIR__ . '/../../_analytics_bootstrap.php';

analytics_require_method('GET');
analytics_require_admin();

try {
  [$fromDateTime, $toDateTime, $from, $to] = analytics_date_range();
  $pdo = analytics_pdo();

  $stmt = $pdo->prepare(
    'SELECT
      COUNT(DISTINCT anonymous_id) AS visitors,
      COUNT(DISTINCT session_id) AS sessions
     FROM analytics_events
     WHERE occurred_at BETWEEN :from_date AND :to_date'
  );
  $stmt->execute([':from_date' => $fromDateTime, ':to_date' => $toDateTime]);
  $base = $stmt->fetch() ?: [];

  $landingViews = analytics_count_event($pdo, 'landing_view', $fromDateTime, $toDateTime);
  $editorOpens = analytics_count_event($pdo, 'editor_open', $fromDateTime, $toDateTime);
  $documentsCreated = analytics_count_event($pdo, 'document_created', $fromDateTime, $toDateTime);
  $pdfExports = analytics_count_event($pdo, 'pdf_export_success', $fromDateTime, $toDateTime);
  $vilrayCtaClicks =
    analytics_count_event($pdo, 'vilray_cta_clicked', $fromDateTime, $toDateTime) +
    analytics_count_event($pdo, 'landing_vilray_cta_click', $fromDateTime, $toDateTime);
  $vilrayRequests = analytics_count_event($pdo, 'vilray_request_submitted', $fromDateTime, $toDateTime);

  $errorStmt = $pdo->prepare(
    'SELECT COUNT(*) FROM analytics_events
     WHERE occurred_at BETWEEN :from_date AND :to_date
       AND (event_name LIKE "error_%" OR event_name IN ("pdf_export_failed", "error_pdf_export"))'
  );
  $errorStmt->execute([':from_date' => $fromDateTime, ':to_date' => $toDateTime]);
  $errors = (int) $errorStmt->fetchColumn();

  $dailyStmt = $pdo->prepare(
    'SELECT
      DATE(occurred_at) AS date,
      COUNT(DISTINCT anonymous_id) AS visitors,
      COUNT(DISTINCT session_id) AS sessions,
      SUM(event_name = "pdf_export_success") AS pdfExports,
      SUM(event_name LIKE "error_%" OR event_name IN ("pdf_export_failed", "error_pdf_export")) AS errors
     FROM analytics_events
     WHERE occurred_at BETWEEN :from_date AND :to_date
     GROUP BY DATE(occurred_at)
     ORDER BY date ASC'
  );
  $dailyStmt->execute([':from_date' => $fromDateTime, ':to_date' => $toDateTime]);

  $documentsStmt = $pdo->prepare(
    'SELECT
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(properties_json, "$.documentType")), "unknown") AS documentType,
      SUM(event_name = "document_created") AS createdCount,
      SUM(event_name = "pdf_export_success") AS exportedCount,
      AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(properties_json, "$.pageCount")) AS UNSIGNED)) AS avgPageCount,
      AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(properties_json, "$.imageCount")) AS UNSIGNED)) AS avgImageCount
     FROM analytics_events
     WHERE occurred_at BETWEEN :from_date AND :to_date
       AND event_name IN ("document_created", "pdf_export_success")
     GROUP BY documentType
     ORDER BY exportedCount DESC, createdCount DESC
     LIMIT 30'
  );
  $documentsStmt->execute([':from_date' => $fromDateTime, ':to_date' => $toDateTime]);

  analytics_json_response([
    'ok' => true,
    'range' => ['from' => $from, 'to' => $to],
    'visitors' => (int) ($base['visitors'] ?? 0),
    'sessions' => (int) ($base['sessions'] ?? 0),
    'landingViews' => $landingViews,
    'editorOpens' => $editorOpens,
    'documentsCreated' => $documentsCreated,
    'pdfExports' => $pdfExports,
    'vilrayCtaClicks' => $vilrayCtaClicks,
    'vilrayRequests' => $vilrayRequests,
    'errors' => $errors,
    'conversionLandingToEditor' => analytics_ratio($editorOpens, $landingViews),
    'conversionEditorToExport' => analytics_ratio($pdfExports, $editorOpens),
    'daily' => $dailyStmt->fetchAll(),
    'documentTypes' => $documentsStmt->fetchAll()
  ]);
} catch (Throwable $error) {
  error_log('[admin/summary] ' . $error->getMessage());
  analytics_json_response(['ok' => false, 'error' => 'server_error'], 500);
}
