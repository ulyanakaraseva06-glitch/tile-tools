<?php
/* ================================================================
   functions.php — функции авторизации и управления пользователями
================================================================ */
require_once __DIR__ . '/db.php';

/* ---------- Сессия ---------- */
function app_session_start() {
    if (session_status() === PHP_SESSION_NONE) {
        session_name(SESSION_NAME);
        session_start();
    }
}

/* ---------- CSRF ---------- */
function csrf_token() {
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['csrf'];
}
function csrf_check($token) {
    return !empty($_SESSION['csrf']) && is_string($token) && hash_equals($_SESSION['csrf'], $token);
}

/* ---------- Текущий пользователь ---------- */
function current_user() {
    static $cached = false;
    if ($cached !== false) return $cached;
    if (empty($_SESSION['uid'])) { $cached = null; return null; }
    $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['uid']]);
    $u = $stmt->fetch();
    $cached = $u ?: null;
    return $cached;
}

/* ---------- Проверка доступа (общая для входа и для гейта) ----------
   Возвращает [bool допущен, string сообщение].
   Также автоматически снимает истёкшее временное ограничение. */
function access_gate(&$user) {
    if (!$user) return [false, 'Пользователь не найден.'];

    // Снять истёкшее временное ограничение
    if ($user['status'] === 'restricted' && !empty($user['restriction_until'])) {
        if (strtotime($user['restriction_until']) <= time()) {
            db()->prepare('UPDATE users SET status="active", restriction_until=NULL WHERE id=?')
                ->execute([$user['id']]);
            $user['status'] = 'active';
            $user['restriction_until'] = null;
        }
    }

    switch ($user['status']) {
        case 'active':
            return [true, ''];
        case 'pending':
            return [false, 'Ваша заявка ещё не одобрена администратором.'];
        case 'banned':
            return [false, 'Ваш аккаунт заблокирован.'];
        case 'restricted':
            $until = $user['restriction_until'] ? date('d.m.Y', strtotime($user['restriction_until'])) : '';
            return [false, 'Доступ временно ограничен' . ($until ? ' до ' . $until : '') . '.'];
        default:
            return [false, 'Доступ запрещён.'];
    }
}

/* ---------- Гейт для страниц, требующих входа ---------- */
function require_login() {
    app_session_start();
    $u = current_user();
    if (!$u) { redirect_to_login(); }
    list($ok, $msg) = access_gate($u);
    if (!$ok) {
        // выкинуть из системы и показать причину
        $_SESSION = [];
        session_destroy();
        redirect_to_login($msg);
    }
    return $u;
}
function require_admin() {
    $u = require_login();
    if ($u['role'] !== 'admin') {
        http_response_code(403);
        die('Доступ только для администраторов.');
    }
    return $u;
}
/* Возвращает путь к ресурсу относительно корня приложения (где лежит папка auth/),
   корректный из любой вложенности: /index.php, /auth/*, /analytics/admin/*, /catalog/admin/* и т.д.
   Работает и когда сайт установлен в подпапку. */
function app_relative_url($target) {
    $root   = str_replace('\\', '/', dirname(__DIR__));               // .../<корень> (родитель папки auth)
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_FILENAME'] ?? '');
    $rel = '';
    if ($script !== '' && strpos($script, $root) === 0) {
        $rel = ltrim(substr($script, strlen($root)), '/');            // напр. analytics/admin/dashboard.php
    }
    $depth = substr_count($rel, '/');                                  // сколько папок ниже корня
    return str_repeat('../', $depth) . ltrim($target, '/');
}

function redirect_to_login($msg = '') {
    $login = app_relative_url('auth/login.php');
    $q = $msg ? ('?msg=' . urlencode($msg)) : '';
    header('Location: ' . $login . $q);
    exit;
}

/* ---------- Лимиты скачиваний ---------- */
function effective_limit($user) {
    // Лимит = базовый месячный лимит + индивидуальный бонус пользователя.
    // (Модуль оплаты убран; если появится — считать лимит здесь же.)
    $limit = (int)DEFAULT_MONTHLY_LIMIT + (int)$user['downloads_bonus'];
    return $limit < 0 ? 0 : $limit;
}
// Ленивый сброс месячного счётчика (без cron). Возвращает обновлённого пользователя.
function ensure_month_reset(&$user) {
    $cur = date('Y-m');
    if (($user['downloads_reset_month'] ?? '') !== $cur) {
        db()->prepare('UPDATE users SET downloads_monthly=0, downloads_reset_month=? WHERE id=?')
            ->execute([$cur, $user['id']]);
        $user['downloads_monthly'] = 0;
        $user['downloads_reset_month'] = $cur;
    }
}

/* ---------- Избранное ---------- */
// Нормализация списка ID плитки: строки, trim, без пустых, длина <=120, уникальные.
function sanitize_fav_ids($arr) {
    if (!is_array($arr)) return [];
    $out = [];
    foreach ($arr as $v) {
        if (is_array($v) || is_object($v)) continue;
        $s = trim((string)$v);
        if ($s === '') continue;
        if (mb_strlen($s) > 120) $s = mb_substr($s, 0, 120);
        $out[] = $s;
    }
    return array_values(array_unique($out));
}
function get_favorites($user) {
    $stmt = db()->prepare("SELECT entity_id FROM tt_favorite_items WHERE user_id=? AND entity_type='tile' ORDER BY created_at DESC");
    $stmt->execute([(int)$user['id']]);
    return sanitize_fav_ids($stmt->fetchAll(PDO::FETCH_COLUMN));
}
function save_favorites($userId, array $ids) {
    $ids = sanitize_fav_ids($ids);
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare("DELETE FROM tt_favorite_items WHERE user_id=? AND entity_type='tile'")->execute([(int)$userId]);
        $insert = $pdo->prepare("INSERT INTO tt_favorite_items (user_id, entity_type, entity_id) VALUES (?, 'tile', ?)");
        foreach ($ids as $id) $insert->execute([(int)$userId, $id]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    return $ids;
}

/* ---------- Математическая капча ---------- */
function captcha_new() {
    $a = random_int(1, 9);
    $b = random_int(1, 9);
    $_SESSION['captcha'] = $a + $b;
    return "$a + $b";
}
function captcha_check($answer) {
    return isset($_SESSION['captcha']) && (string)$_SESSION['captcha'] === trim((string)$answer);
}

/* ---------- Пользователи ---------- */
function find_user_by_email($email) {
    $stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([mb_strtolower(trim($email))]);
    return $stmt->fetch() ?: null;
}

function create_user($data, $status = 'pending', $role = 'user') {
    $stmt = db()->prepare(
        'INSERT INTO users (email, password_hash, first_name, last_name, company, role, status, downloads_reset_month, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([
        mb_strtolower(trim($data['email'])),
        password_hash($data['password'], PASSWORD_DEFAULT),
        trim($data['first_name'] ?? ''),
        trim($data['last_name'] ?? ''),
        trim($data['company'] ?? ''),
        $role,
        $status,
        date('Y-m'),
    ]);
    return (int)db()->lastInsertId();
}

function valid_email($email) {
    return (bool)filter_var($email, FILTER_VALIDATE_EMAIL);
}

/* ---------- Безопасный вывод ---------- */
function h($s) {
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

/* ---------- Метка статуса (для админки) ---------- */
function status_label($status) {
    $map = [
        'pending'    => ['Ожидает',     '#B8860B'],
        'active'     => ['Активен',     '#2E7D32'],
        'banned'     => ['Заблокирован','#C62828'],
        'restricted' => ['Ограничен',   '#E65100'],
    ];
    return $map[$status] ?? [$status, '#666'];
}
