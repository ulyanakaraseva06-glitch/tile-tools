<?php
declare(strict_types=1);

$analyticsConfig = [];
$configPath = __DIR__ . '/_analytics_config.php';
if (is_file($configPath)) {
  require $configPath;
}

const ANALYTICS_MAX_BODY_BYTES = 262144;

function analytics_config(string $key, string $default = ''): string {
  global $analyticsConfig;
  if (isset($analyticsConfig[$key]) && is_string($analyticsConfig[$key])) {
    return $analyticsConfig[$key];
  }

  $envKey = 'ANALYTICS_' . strtoupper($key);
  $envValue = getenv($envKey);
  return is_string($envValue) && $envValue !== '' ? $envValue : $default;
}

function analytics_json_response(array $data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  header('Pragma: no-cache');
  header('X-Robots-Tag: noindex, nofollow', true);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function analytics_require_method(string $method): void {
  if ($_SERVER['REQUEST_METHOD'] !== $method) {
    analytics_json_response(['ok' => false, 'error' => 'method_not_allowed'], 405);
  }
}

function analytics_read_json(): array {
  $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
  if ($contentLength > ANALYTICS_MAX_BODY_BYTES) {
    analytics_json_response(['ok' => false, 'error' => 'payload_too_large'], 413);
  }

  $raw = file_get_contents('php://input');
  if (!is_string($raw) || trim($raw) === '') {
    return [];
  }

  if (strlen($raw) > ANALYTICS_MAX_BODY_BYTES) {
    analytics_json_response(['ok' => false, 'error' => 'payload_too_large'], 413);
  }

  $data = json_decode($raw, true);
  if (!is_array($data)) {
    analytics_json_response(['ok' => false, 'error' => 'invalid_json'], 400);
  }

  return $data;
}

function analytics_pdo(): PDO {
  $host = analytics_config('db_host', 'localhost');
  $dbName = analytics_config('db_name');
  $user = analytics_config('db_user');
  $pass = analytics_config('db_pass');

  if ($dbName === '' || $user === '') {
    analytics_json_response(['ok' => false, 'error' => 'analytics_db_not_configured'], 500);
  }

  $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $host, $dbName);
  return new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false
  ]);
}

function analytics_require_admin(): void {
  $expected = analytics_config('admin_token');
  $actual = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';

  if ($expected === '' || !hash_equals($expected, $actual)) {
    analytics_json_response(['ok' => false, 'error' => 'unauthorized'], 401);
  }
}

function analytics_date_range(): array {
  $today = new DateTimeImmutable('today');
  $defaultFrom = $today->modify('-29 days')->format('Y-m-d');
  $defaultTo = $today->format('Y-m-d');

  $from = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from'] ?? '') ? $_GET['from'] : $defaultFrom;
  $to = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to'] ?? '') ? $_GET['to'] : $defaultTo;

  return [$from . ' 00:00:00', $to . ' 23:59:59', $from, $to];
}

function analytics_substr(string $value, int $length): string {
  return function_exists('mb_substr') ? mb_substr($value, 0, $length, 'UTF-8') : substr($value, 0, $length);
}

function analytics_clean_string(mixed $value, int $maxLength = 180): ?string {
  if (!is_string($value)) return null;
  $value = trim($value);
  if ($value === '') return null;
  return analytics_substr($value, $maxLength);
}

function analytics_clean_properties(mixed $value): array {
  if (!is_array($value)) return [];

  $blockedFragments = ['text', 'value', 'html', 'src', 'base64', 'dataurl', 'rows', 'email', 'phone', 'name'];
  $blockedExact = ['image', 'imagefile', 'file', 'company', 'manager'];
  $result = [];

  foreach ($value as $key => $item) {
    if (!is_string($key)) continue;
    $lowerKey = strtolower($key);
    if (in_array($lowerKey, $blockedExact, true)) continue;

    $blocked = false;
    foreach ($blockedFragments as $fragment) {
      if (str_contains($lowerKey, $fragment)) {
        $blocked = true;
        break;
      }
    }
    if ($blocked) continue;

    if (is_string($item)) {
      if (str_starts_with($item, 'data:')) continue;
      $result[$key] = analytics_substr($item, 180);
      continue;
    }

    if (is_int($item) || is_float($item) || is_bool($item) || $item === null) {
      $result[$key] = $item;
    }
  }

  return $result;
}

function analytics_normalize_event(array $input): array {
  $eventId = analytics_clean_string($input['eventId'] ?? null, 80) ?: analytics_clean_string($input['id'] ?? null, 80);
  $eventName = analytics_clean_string($input['eventName'] ?? null, 80);
  $anonymousId = analytics_clean_string($input['anonymousId'] ?? null, 120);
  $sessionId = analytics_clean_string($input['sessionId'] ?? null, 120);

  if (!$eventId || !$eventName || !$anonymousId || !$sessionId) {
    analytics_json_response(['ok' => false, 'error' => 'invalid_event'], 400);
  }

  $timestampRaw = analytics_clean_string($input['timestamp'] ?? null, 40);
  $timestamp = $timestampRaw ? strtotime($timestampRaw) : false;
  $occurredAt = $timestamp ? date('Y-m-d H:i:s', $timestamp) : gmdate('Y-m-d H:i:s');

  return [
    'event_id' => $eventId,
    'event_name' => $eventName,
    'occurred_at' => $occurredAt,
    'anonymous_id' => $anonymousId,
    'session_id' => $sessionId,
    'project_id' => analytics_clean_string($input['projectId'] ?? null, 120),
    'document_id' => analytics_clean_string($input['documentId'] ?? null, 120),
    'properties' => analytics_clean_properties($input['properties'] ?? [])
  ];
}

function analytics_save_event(PDO $pdo, array $event): void {
  $propertiesJson = json_encode($event['properties'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

  $stmt = $pdo->prepare(
    'INSERT IGNORE INTO analytics_events
      (event_id, event_name, occurred_at, anonymous_id, user_id, session_id, project_id, document_id, properties_json, user_agent, ip_address)
     VALUES
      (:event_id, :event_name, :occurred_at, :anonymous_id, NULL, :session_id, :project_id, :document_id, :properties_json, :user_agent, NULL)'
  );
  $stmt->execute([
    ':event_id' => $event['event_id'],
    ':event_name' => $event['event_name'],
    ':occurred_at' => $event['occurred_at'],
    ':anonymous_id' => $event['anonymous_id'],
    ':session_id' => $event['session_id'],
    ':project_id' => $event['project_id'],
    ':document_id' => $event['document_id'],
    ':properties_json' => $propertiesJson,
    ':user_agent' => analytics_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 255)
  ]);

  $source = $event['properties']['source'] ?? null;
  $referrer = $event['properties']['referrer'] ?? ($_SERVER['HTTP_REFERER'] ?? null);

  $visitorStmt = $pdo->prepare(
    'INSERT INTO analytics_visitors
      (anonymous_id, first_seen_at, last_seen_at, visit_count, user_id, email, phone, company, referrer, utm_source, utm_medium, utm_campaign)
     VALUES
      (:anonymous_id, :first_seen_at, :last_seen_at, 1, NULL, NULL, NULL, NULL, :referrer, :utm_source, :utm_medium, :utm_campaign)
     ON DUPLICATE KEY UPDATE
      last_seen_at = VALUES(last_seen_at),
      visit_count = visit_count + IF(TIMESTAMPDIFF(MINUTE, last_seen_at, VALUES(last_seen_at)) >= 30, 1, 0)'
  );
  $visitorStmt->execute([
    ':anonymous_id' => $event['anonymous_id'],
    ':first_seen_at' => $event['occurred_at'],
    ':last_seen_at' => $event['occurred_at'],
    ':referrer' => analytics_clean_string($referrer, 255),
    ':utm_source' => analytics_clean_string($event['properties']['utmSource'] ?? $source, 120),
    ':utm_medium' => analytics_clean_string($event['properties']['utmMedium'] ?? null, 120),
    ':utm_campaign' => analytics_clean_string($event['properties']['utmCampaign'] ?? null, 160)
  ]);

  $sessionStmt = $pdo->prepare(
    'INSERT INTO analytics_sessions
      (session_id, anonymous_id, user_id, started_at, last_seen_at, entry_path, referrer, utm_source, utm_medium, utm_campaign)
     VALUES
      (:session_id, :anonymous_id, NULL, :started_at, :last_seen_at, :entry_path, :referrer, :utm_source, :utm_medium, :utm_campaign)
     ON DUPLICATE KEY UPDATE
      last_seen_at = VALUES(last_seen_at)'
  );
  $sessionStmt->execute([
    ':session_id' => $event['session_id'],
    ':anonymous_id' => $event['anonymous_id'],
    ':started_at' => $event['occurred_at'],
    ':last_seen_at' => $event['occurred_at'],
    ':entry_path' => analytics_clean_string($event['properties']['path'] ?? '/', 255),
    ':referrer' => analytics_clean_string($referrer, 255),
    ':utm_source' => analytics_clean_string($event['properties']['utmSource'] ?? $source, 120),
    ':utm_medium' => analytics_clean_string($event['properties']['utmMedium'] ?? null, 120),
    ':utm_campaign' => analytics_clean_string($event['properties']['utmCampaign'] ?? null, 160)
  ]);
}

function analytics_count_event(PDO $pdo, string $eventName, string $from, string $to): int {
  $stmt = $pdo->prepare('SELECT COUNT(*) FROM analytics_events WHERE event_name = :event_name AND occurred_at BETWEEN :from_date AND :to_date');
  $stmt->execute([':event_name' => $eventName, ':from_date' => $from, ':to_date' => $to]);
  return (int) $stmt->fetchColumn();
}

function analytics_ratio(int $part, int $total): float {
  return $total > 0 ? round($part / $total, 4) : 0.0;
}
