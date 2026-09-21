<?php
declare(strict_types=1);

require __DIR__ . '/../../_analytics_bootstrap.php';

analytics_require_method('GET');
analytics_require_admin();

try {
  [$fromDateTime, $toDateTime] = analytics_date_range();
  $pdo = analytics_pdo();
  $limit = min(200, max(20, (int) ($_GET['limit'] ?? 100)));
  $eventName = analytics_clean_string($_GET['eventName'] ?? null, 80);
  $anonymousId = analytics_clean_string($_GET['anonymousId'] ?? null, 120);

  $where = ['occurred_at BETWEEN :from_date AND :to_date'];
  $params = [':from_date' => $fromDateTime, ':to_date' => $toDateTime];

  if ($eventName) {
    $where[] = 'event_name = :event_name';
    $params[':event_name'] = $eventName;
  }

  if ($anonymousId) {
    $where[] = 'anonymous_id = :anonymous_id';
    $params[':anonymous_id'] = $anonymousId;
  }

  $sql =
    'SELECT event_id AS eventId, event_name AS eventName, occurred_at AS timestamp,
            anonymous_id AS anonymousId, session_id AS sessionId,
            project_id AS projectId, document_id AS documentId, properties_json AS propertiesJson
     FROM analytics_events
     WHERE ' . implode(' AND ', $where) . '
     ORDER BY occurred_at DESC
     LIMIT ' . $limit;

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);

  $items = [];
  foreach ($stmt->fetchAll() as $row) {
    $row['properties'] = json_decode((string) ($row['propertiesJson'] ?? '{}'), true) ?: [];
    unset($row['propertiesJson']);
    $items[] = $row;
  }

  analytics_json_response(['ok' => true, 'items' => $items]);
} catch (Throwable $error) {
  error_log('[admin/events] ' . $error->getMessage());
  analytics_json_response(['ok' => false, 'error' => 'server_error'], 500);
}
