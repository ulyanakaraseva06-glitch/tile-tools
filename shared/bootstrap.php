<?php
declare(strict_types=1);

const TT_ROOT = __DIR__ . '/..';

function tt_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $path = TT_ROOT . '/config.php';
    if (!is_file($path)) {
        throw new RuntimeException('Tile Tools is not configured. Copy config.example.php to config.php.');
    }
    $config = require $path;
    return $config;
}

function tt_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $db = tt_config()['db'];
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $db['host'], $db['port'], $db['database'], $db['charset']);
    $pdo = new PDO($dsn, $db['username'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function tt_start_session(): void
{
    if (session_status() !== PHP_SESSION_NONE) {
        return;
    }
    $app = tt_config()['app'];
    $sessionPath = (string) ($app['session_save_path'] ?? '');
    if ($sessionPath !== '') {
        if (!is_dir($sessionPath) && !mkdir($sessionPath, 0750, true) && !is_dir($sessionPath)) {
            throw new RuntimeException('Tile Tools session directory could not be created.');
        }
        if (!is_writable($sessionPath)) {
            throw new RuntimeException('Tile Tools session directory is not writable.');
        }
        session_save_path($sessionPath);
    }
    session_name($app['session_name']);
    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Lax',
    ]);
    session_start();
}

function tt_csrf_token(): string
{
    tt_start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['csrf'];
}

function tt_require_csrf(array $body): void
{
    tt_start_session();
    $token = $body['csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($token) || empty($_SESSION['csrf']) || !hash_equals((string) $_SESSION['csrf'], $token)) {
        tt_abort(419, 'csrf_invalid', 'CSRF token is invalid.');
    }
}

function tt_current_user(): ?array
{
    tt_start_session();
    $userId = $_SESSION['uid'] ?? null;
    if (!is_int($userId) && !ctype_digit((string) $userId)) {
        return null;
    }
    $statement = tt_pdo()->prepare('SELECT id, email, first_name, last_name, role, status FROM users WHERE id = ? LIMIT 1');
    $statement->execute([(int) $userId]);
    $user = $statement->fetch();
    return $user ?: null;
}

function tt_user_display_name(?array $user): string
{
    if (!$user) {
        return 'Гость';
    }
    $fullName = trim((string) ($user['first_name'] ?? '') . ' ' . (string) ($user['last_name'] ?? ''));
    if ($fullName !== '') {
        return $fullName;
    }
    $email = trim((string) ($user['email'] ?? ''));
    $at = strpos($email, '@');
    return $at === false ? ($email !== '' ? $email : 'Пользователь') : substr($email, 0, $at);
}

function tt_user_initials(?array $user): string
{
    $name = tt_user_display_name($user);
    $parts = preg_split('/\s+/u', $name, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $first = isset($parts[0]) ? mb_substr($parts[0], 0, 1) : 'Г';
    $second = isset($parts[1]) ? mb_substr($parts[1], 0, 1) : '';
    return mb_strtoupper($first . $second);
}

function tt_require_user(): array
{
    $user = tt_current_user();
    if (!$user) {
        tt_abort(401, 'auth_required', 'Authentication required.');
    }
    if (($user['status'] ?? '') !== 'active') {
        tt_abort(403, 'account_inactive', 'Account is not active.');
    }
    return $user;
}

function tt_require_role(array $user, array $roles): void
{
    if (!in_array($user['role'] ?? '', $roles, true)) {
        tt_abort(403, 'role_forbidden', 'This role cannot perform the action.');
    }
}

function tt_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    try {
        $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        tt_abort(400, 'invalid_json', 'Request body must be valid JSON.');
    }
    if (!is_array($body)) {
        tt_abort(400, 'invalid_json', 'Request body must be an object.');
    }
    return $body;
}

function tt_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

function tt_abort(int $status, string $code, string $message): never
{
    tt_json(['ok' => false, 'error' => ['code' => $code, 'message' => $message]], $status);
}

function tt_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return sprintf('%s-%s-%s-%s-%s', substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 12, 4), substr($hex, 16, 4), substr($hex, 20));
}

function tt_audit(PDO $pdo, ?int $actorUserId, string $eventType, string $targetType, string $targetId, array $details = []): void
{
    $statement = $pdo->prepare('INSERT INTO tt_audit_events (actor_user_id, event_type, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)');
    $statement->execute([
        $actorUserId,
        mb_substr($eventType, 0, 100),
        mb_substr($targetType, 0, 80),
        mb_substr($targetId, 0, 255),
        $details === [] ? null : json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
    ]);
}
