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

function tt_auth_cookie_name(): string
{
    return (string) (tt_config()['app']['auth_token_cookie'] ?? 'tile_tools_auth');
}

function tt_auth_token_ttl(): int
{
    $days = (int) (tt_config()['app']['auth_token_ttl_days'] ?? 30);
    return max(1, min($days, 365)) * 86400;
}

function tt_auth_cookie_options(int $expires): array
{
    return [
        'expires' => $expires,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ];
}

function tt_clear_auth_cookie(): void
{
    setcookie(tt_auth_cookie_name(), '', tt_auth_cookie_options(time() - 3600));
    unset($_COOKIE[tt_auth_cookie_name()]);
}

function tt_auth_cookie_parts(): ?array
{
    $value = (string) ($_COOKIE[tt_auth_cookie_name()] ?? '');
    if (!preg_match('/^([a-f0-9]{24})\.([a-f0-9]{64})$/D', $value, $matches)) {
        return null;
    }
    return ['selector' => $matches[1], 'validator' => $matches[2]];
}

function tt_revoke_current_auth_token(): void
{
    $parts = tt_auth_cookie_parts();
    if ($parts !== null) {
        try {
            $statement = tt_pdo()->prepare('UPDATE tt_auth_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE selector = ?');
            $statement->execute([$parts['selector']]);
        } catch (Throwable) {
            // Выход должен оставаться доступным даже до применения новой миграции.
        }
    }
    tt_clear_auth_cookie();
}

function tt_issue_auth_token(int $userId): bool
{
    $selector = bin2hex(random_bytes(12));
    $validator = bin2hex(random_bytes(32));
    $expiresAt = time() + tt_auth_token_ttl();
    $userAgent = mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 1000);

    try {
        $pdo = tt_pdo();
        $pdo->prepare('DELETE FROM tt_auth_tokens WHERE expires_at <= NOW() OR revoked_at IS NOT NULL')->execute();
        $statement = $pdo->prepare(
            'INSERT INTO tt_auth_tokens (user_id, selector, validator_hash, user_agent_hash, expires_at)
             VALUES (?, ?, ?, ?, FROM_UNIXTIME(?))'
        );
        $statement->execute([
            $userId,
            $selector,
            hash('sha256', $validator),
            $userAgent === '' ? null : hash('sha256', $userAgent),
            $expiresAt,
        ]);
    } catch (Throwable) {
        return false;
    }

    $cookieValue = $selector . '.' . $validator;
    setcookie(tt_auth_cookie_name(), $cookieValue, tt_auth_cookie_options($expiresAt));
    $_COOKIE[tt_auth_cookie_name()] = $cookieValue;
    return true;
}

function tt_restore_user_from_auth_token(): ?int
{
    $parts = tt_auth_cookie_parts();
    if ($parts === null) {
        if (isset($_COOKIE[tt_auth_cookie_name()])) {
            tt_clear_auth_cookie();
        }
        return null;
    }

    try {
        $statement = tt_pdo()->prepare(
            'SELECT t.id, t.user_id, t.validator_hash, u.status
             FROM tt_auth_tokens t
             INNER JOIN users u ON u.id = t.user_id
             WHERE t.selector = ? AND t.revoked_at IS NULL AND t.expires_at > NOW()
             LIMIT 1'
        );
        $statement->execute([$parts['selector']]);
        $token = $statement->fetch();
    } catch (Throwable) {
        return null;
    }

    if (!$token || ($token['status'] ?? '') !== 'active' || !hash_equals((string) $token['validator_hash'], hash('sha256', $parts['validator']))) {
        if ($token) {
            tt_pdo()->prepare('UPDATE tt_auth_tokens SET revoked_at = NOW() WHERE id = ?')->execute([(int) $token['id']]);
        }
        tt_clear_auth_cookie();
        return null;
    }

    $newValidator = bin2hex(random_bytes(32));
    $expiresAt = time() + tt_auth_token_ttl();
    $update = tt_pdo()->prepare(
        'UPDATE tt_auth_tokens
         SET validator_hash = ?, last_used_at = NOW(), expires_at = FROM_UNIXTIME(?)
         WHERE id = ?'
    );
    $update->execute([hash('sha256', $newValidator), $expiresAt, (int) $token['id']]);
    $cookieValue = $parts['selector'] . '.' . $newValidator;
    setcookie(tt_auth_cookie_name(), $cookieValue, tt_auth_cookie_options($expiresAt));
    $_COOKIE[tt_auth_cookie_name()] = $cookieValue;

    return (int) $token['user_id'];
}

function tt_login_user(int $userId, bool $remember = true): void
{
    tt_start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = $userId;
    tt_revoke_current_auth_token();
    if ($remember) {
        tt_issue_auth_token($userId);
    }
}

function tt_current_user(): ?array
{
    tt_start_session();
    $userId = $_SESSION['uid'] ?? null;
    if (!is_int($userId) && !ctype_digit((string) $userId)) {
        $userId = tt_restore_user_from_auth_token();
        if ($userId === null) {
            return null;
        }
        session_regenerate_id(true);
        $_SESSION['uid'] = $userId;
    }
    $statement = tt_pdo()->prepare('SELECT id, email, first_name, last_name, role, status FROM users WHERE id = ? LIMIT 1');
    $statement->execute([(int) $userId]);
    $user = $statement->fetch();
    if (!$user || ($user['status'] ?? '') !== 'active') {
        unset($_SESSION['uid']);
        tt_revoke_current_auth_token();
        return null;
    }
    return $user;
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

function tt_track_visit(string $page): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        return;
    }
    $userAgent = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    if ($userAgent !== '' && preg_match('/bot|crawler|spider|slurp|preview/i', $userAgent)) {
        return;
    }

    $cookieName = 'tt_visitor';
    $visitorId = (string) ($_COOKIE[$cookieName] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/D', $visitorId)) {
        $visitorId = bin2hex(random_bytes(32));
        setcookie($cookieName, $visitorId, [
            'expires' => time() + 63072000,
            'path' => '/',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        $_COOKIE[$cookieName] = $visitorId;
    }

    try {
        $user = tt_current_user();
        $statement = tt_pdo()->prepare(
            'INSERT INTO tt_site_visitors (visitor_key, user_id, first_seen_at, last_seen_at, page_views, last_page)
             VALUES (?, ?, NOW(), NOW(), 1, ?)
             ON DUPLICATE KEY UPDATE
               user_id = COALESCE(VALUES(user_id), user_id),
               last_seen_at = NOW(),
               page_views = page_views + 1,
               last_page = VALUES(last_page)'
        );
        $statement->execute([
            hash('sha256', $visitorId),
            $user ? (int) $user['id'] : null,
            mb_substr($page, 0, 80),
        ]);
    } catch (Throwable) {
        // До применения миграции 010 сайт продолжает работать без аналитики.
    }
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
