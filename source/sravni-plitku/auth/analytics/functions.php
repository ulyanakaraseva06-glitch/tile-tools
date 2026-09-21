<?php
/* ================================================================
   analytics/functions.php — помощники модуля аналитики (ЭТАП 03).
   Запись событий и агрегаты. Авторизацией модуль НЕ управляет.
   Безопасность: PDO prepared statements, IP только в виде хэша,
   JSON ограничен по размеру, payload не разрастается.
================================================================ */
require_once __DIR__ . '/../auth/functions.php';

/* ---------- Готовность (созданы ли таблицы аналитики) ---------- */
function analytics_ready() {
    static $r = null;
    if ($r !== null) return $r;
    try {
        $r = (bool)db()->query("SHOW TABLES LIKE 'analytics_events'")->fetchColumn();
    } catch (Exception $e) {
        $r = false;
    }
    return $r;
}

/* ---------- Санитайзеры ---------- */
function analytics_sanitize_string($value, $maxLength = 255) {
    if (is_array($value) || is_object($value)) return null;
    $s = trim((string)$value);
    if ($s === '') return null;
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $s);
    if ($s === null) return null;
    if (mb_strlen($s) > $maxLength) $s = mb_substr($s, 0, $maxLength);
    return $s;
}

function analytics_json_encode_safe($value, $maxBytes = 8192) {
    if ($value === null || $value === '') return null;
    if (is_string($value)) {
        return strlen($value) > $maxBytes ? null : $value;
    }
    $json = json_encode($value, JSON_UNESCAPED_UNICODE);
    if ($json === false) return null;
    if (strlen($json) > $maxBytes) return null;
    return $json;
}

/* ---------- Хэш IP (сырой IP не храним) ---------- */
function analytics_get_client_ip_hash() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if ($ip === '') return null;
    $salt = defined('AUTH_SALT') ? AUTH_SALT : (DB_NAME . '|' . DB_PASS);
    return hash('sha256', $ip . '|' . $salt);
}

/* ---------- Определение устройства ---------- */
function analytics_detect_device($userAgent, $viewportW = null) {
    $ua  = (string)$userAgent;
    $low = mb_strtolower($ua);

    $device = 'desktop';
    if (preg_match('/ipad|tablet|playbook|silk|kindle/i', $ua) ||
        (strpos($low, 'android') !== false && strpos($low, 'mobile') === false)) {
        $device = 'tablet';
    } elseif (preg_match('/mobile|iphone|ipod|blackberry|opera mini|iemobile|windows phone/i', $ua)) {
        $device = 'mobile';
    } elseif ($viewportW !== null && (int)$viewportW > 0) {
        $w = (int)$viewportW;
        if ($w <= 600) $device = 'mobile';
        elseif ($w <= 1024) $device = 'tablet';
    }

    $browser = 'other';
    if     (strpos($low, 'yabrowser') !== false) $browser = 'Yandex';
    elseif (strpos($low, 'edg')       !== false) $browser = 'Edge';
    elseif (strpos($low, 'opr')       !== false || strpos($low, 'opera') !== false) $browser = 'Opera';
    elseif (strpos($low, 'firefox')   !== false) $browser = 'Firefox';
    elseif (strpos($low, 'chrome')    !== false) $browser = 'Chrome';
    elseif (strpos($low, 'safari')    !== false) $browser = 'Safari';

    $os = 'other';
    if     (strpos($low, 'windows') !== false) $os = 'Windows';
    elseif (strpos($low, 'android') !== false) $os = 'Android';
    elseif (preg_match('/iphone|ipad|ipod/i', $low)) $os = 'iOS';
    elseif (strpos($low, 'mac os') !== false || strpos($low, 'macintosh') !== false) $os = 'macOS';
    elseif (strpos($low, 'linux') !== false) $os = 'Linux';

    return ['device_type' => $device, 'browser' => $browser, 'os' => $os];
}

/* ---------- Сессии ---------- */
function analytics_touch_session($sessionKey, $userId = null, $meta = []) {
    if (!analytics_ready()) return false;
    $sessionKey = analytics_sanitize_string($sessionKey, 64);
    if (!$sessionKey) return false;
    if (!is_array($meta)) $meta = [];

    $ua  = $meta['user_agent'] ?? ($_SERVER['HTTP_USER_AGENT'] ?? '');
    $dev = analytics_detect_device($ua, $meta['viewport_w'] ?? null);

    $sql = 'INSERT INTO analytics_sessions
              (session_key, user_id, first_seen_at, last_seen_at, device_type, browser, os,
               viewport_w, viewport_h, screen_w, screen_h, user_agent, ip_hash, referrer, landing_path,
               utm_source, utm_medium, utm_campaign, pageviews, events_count)
            VALUES (?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
            ON DUPLICATE KEY UPDATE
              last_seen_at = NOW(),
              user_id      = COALESCE(user_id, VALUES(user_id)),
              device_type  = COALESCE(device_type, VALUES(device_type)),
              browser      = COALESCE(browser, VALUES(browser)),
              os           = COALESCE(os, VALUES(os)),
              viewport_w   = COALESCE(viewport_w, VALUES(viewport_w)),
              viewport_h   = COALESCE(viewport_h, VALUES(viewport_h)),
              screen_w     = COALESCE(screen_w, VALUES(screen_w)),
              screen_h     = COALESCE(screen_h, VALUES(screen_h)),
              user_agent   = COALESCE(user_agent, VALUES(user_agent)),
              ip_hash      = COALESCE(ip_hash, VALUES(ip_hash))';

    db()->prepare($sql)->execute([
        $sessionKey,
        $userId ? (int)$userId : null,
        $dev['device_type'], $dev['browser'], $dev['os'],
        isset($meta['viewport_w']) ? (int)$meta['viewport_w'] : null,
        isset($meta['viewport_h']) ? (int)$meta['viewport_h'] : null,
        isset($meta['screen_w'])   ? (int)$meta['screen_w']   : null,
        isset($meta['screen_h'])   ? (int)$meta['screen_h']   : null,
        analytics_sanitize_string($ua, 1000),
        analytics_get_client_ip_hash(),
        analytics_sanitize_string($meta['referrer'] ?? null, 1000),
        analytics_sanitize_string($meta['landing_path'] ?? null, 255),
        analytics_sanitize_string($meta['utm_source'] ?? null, 120),
        analytics_sanitize_string($meta['utm_medium'] ?? null, 120),
        analytics_sanitize_string($meta['utm_campaign'] ?? null, 120),
    ]);
    return true;
}

/* ---------- Запись события ---------- */
function analytics_track_event($userId, $sessionKey, $eventName, $payload = []) {
    if (!analytics_ready()) return false;
    $eventName  = analytics_sanitize_string($eventName, 80);
    $sessionKey = analytics_sanitize_string($sessionKey, 64);
    if (!$eventName || !$sessionKey) return false;
    if (!is_array($payload)) $payload = [];
    $uid = $userId ? (int)$userId : null;

    analytics_touch_session($sessionKey, $uid, $payload);

    $stmt = db()->prepare('INSERT INTO analytics_events
       (session_key, user_id, event_name, page_path, scene_id, zone_id, tile_id,
        tile_brand, tile_collection, tile_color, tile_size, tile_surface, tile_design,
        search_query, filters_json, selection_json, metadata_json, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())');
    $stmt->execute([
        $sessionKey, $uid, $eventName,
        analytics_sanitize_string($payload['page_path']       ?? null, 255),
        analytics_sanitize_string($payload['scene_id']        ?? null, 120),
        analytics_sanitize_string($payload['zone_id']         ?? null, 120),
        analytics_sanitize_string($payload['tile_id']         ?? null, 120),
        analytics_sanitize_string($payload['tile_brand']      ?? null, 120),
        analytics_sanitize_string($payload['tile_collection'] ?? null, 120),
        analytics_sanitize_string($payload['tile_color']      ?? null, 80),
        analytics_sanitize_string($payload['tile_size']       ?? null, 80),
        analytics_sanitize_string($payload['tile_surface']    ?? null, 80),
        analytics_sanitize_string($payload['tile_design']     ?? null, 80),
        analytics_sanitize_string($payload['search_query']    ?? null, 255),
        analytics_json_encode_safe($payload['filters']   ?? null),
        analytics_json_encode_safe($payload['selection'] ?? null),
        analytics_json_encode_safe($payload['metadata']  ?? null),
    ]);

    db()->prepare('UPDATE analytics_sessions SET events_count = events_count + 1, last_seen_at = NOW() WHERE session_key = ?')
        ->execute([$sessionKey]);
    return true;
}

/* ---------- Период → начальная дата ---------- */
function analytics_period_since($period) {
    switch ($period) {
        case 'today': return date('Y-m-d 00:00:00');
        case '7d':    return date('Y-m-d H:i:s', strtotime('-7 days'));
        case '30d':   return date('Y-m-d H:i:s', strtotime('-30 days'));
        case 'all':
        default:      return null;
    }
}

/* Подсчёт строк за период (имя таблицы — только внутренние константы, не из ввода). */
function analytics_count($table, $period, $extra = '', $extraArgs = []) {
    $since = analytics_period_since($period);
    $col   = ($table === 'analytics_sessions') ? 'last_seen_at' : 'created_at';
    $sql   = "SELECT COUNT(*) FROM $table WHERE 1=1";
    $args  = [];
    if ($since)  { $sql .= " AND $col >= ?"; $args[] = $since; }
    if ($extra)  { $sql .= " AND $extra";    $args = array_merge($args, $extraArgs); }
    $st = db()->prepare($sql); $st->execute($args);
    return (int)$st->fetchColumn();
}

/* ---------- Сводка для дашборда ---------- */
function analytics_get_overview_stats($period = '7d') {
    $empty = [
        'period' => $period, 'users_total' => 0, 'sessions' => 0, 'events' => 0,
        'tile_applies' => 0, 'favorites' => 0, 'searches' => 0,
        'downloads_success' => 0, 'downloads_blocked' => 0,
    ];
    try {
        $empty['users_total'] = (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
    } catch (Exception $e) {}
    if (!analytics_ready()) return $empty;
    try {
        return [
            'period'            => $period,
            'users_total'       => $empty['users_total'],
            'sessions'          => analytics_count('analytics_sessions', $period),
            'events'            => analytics_count('analytics_events', $period),
            'tile_applies'      => analytics_count('analytics_events', $period, 'event_name = ?', ['tile_apply']),
            'favorites'         => analytics_count('analytics_events', $period, 'event_name = ?', ['favorite_add']),
            'searches'          => analytics_count('analytics_events', $period, 'event_name = ?', ['search']),
            'downloads_success' => analytics_count('download_events', $period, 'status = ?', ['success']),
            'downloads_blocked' => analytics_count('download_events', $period, 'status = ?', ['blocked_limit']),
        ];
    } catch (Exception $e) {
        return $empty;
    }
}

/* ---------- Аналитика плитки ---------- */
function analytics_get_tile_stats($period = '30d', $limit = 20) {
    $out = ['top_applied' => [], 'top_downloaded' => [], 'top_brands' => [], 'top_colors' => [], 'top_sizes' => []];
    if (!analytics_ready()) return $out;
    $since = analytics_period_since($period);
    $lim   = (int)$limit;

    $topBy = function ($column, $eventName) use ($since, $lim) {
        $args = [$eventName];
        $sql  = "SELECT $column AS k, COUNT(*) AS c
                 FROM analytics_events
                 WHERE event_name = ? AND $column IS NOT NULL AND $column <> ''";
        if ($since) { $sql .= ' AND created_at >= ?'; $args[] = $since; }
        $sql .= " GROUP BY $column ORDER BY c DESC LIMIT $lim";
        $st = db()->prepare($sql); $st->execute($args);
        return $st->fetchAll();
    };

    try {
        $out['top_applied']    = $topBy('tile_id', 'tile_apply');
        $out['top_downloaded'] = $topBy('tile_id', 'download');
        $out['top_brands']     = $topBy('tile_brand', 'tile_apply');
        $out['top_colors']     = $topBy('tile_color', 'tile_apply');
        $out['top_sizes']      = $topBy('tile_size', 'tile_apply');
    } catch (Exception $e) {}
    return $out;
}

/* ---------- Активность одного пользователя ---------- */
function analytics_get_user_activity($userId, $limit = 50) {
    $out = ['events' => [], 'downloads' => [], 'event_counts' => []];
    if (!analytics_ready()) return $out;
    $uid = (int)$userId;
    $lim = (int)$limit;
    try {
        $ev = db()->prepare("SELECT * FROM analytics_events WHERE user_id = ? ORDER BY created_at DESC LIMIT $lim");
        $ev->execute([$uid]); $out['events'] = $ev->fetchAll();

        $dl = db()->prepare("SELECT * FROM download_events WHERE user_id = ? ORDER BY created_at DESC LIMIT $lim");
        $dl->execute([$uid]); $out['downloads'] = $dl->fetchAll();

        $c = db()->prepare('SELECT event_name, COUNT(*) AS c FROM analytics_events WHERE user_id = ? GROUP BY event_name ORDER BY c DESC');
        $c->execute([$uid]); $out['event_counts'] = $c->fetchAll();
    } catch (Exception $e) {}
    return $out;
}

/* ================================================================
   Обвязка для админских страниц аналитики (с этапа 02).
================================================================ */
function analytics_admin_page($title, $bodyHtml) {
    $admin = require_admin();
    $css1 = app_relative_url('auth/auth.css');
    $css2 = app_relative_url('analytics/analytics.css');
    $home = app_relative_url('index.php');
    $users = app_relative_url('auth/admin.php');
    $dash  = app_relative_url('analytics/admin/dashboard.php');
    $tiles = app_relative_url('analytics/admin/tiles.php');
    $out   = app_relative_url('auth/logout.php');
    echo '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>' . h($title) . ' — СравниПлитку</title>';
    echo '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
    echo '<link rel="stylesheet" href="' . h($css1) . '"><link rel="stylesheet" href="' . h($css2) . '">';
    echo '</head><body>';
    echo '<div class="topbar"><div class="brand">Аналитика</div><nav>';
    echo '<a class="btn btn--ghost btn--sm" href="' . h($dash) . '">Дашборд</a>';
    echo '<a class="btn btn--ghost btn--sm" href="' . h($tiles) . '">Аналитика плитки</a>';
    echo '<a class="btn btn--ghost btn--sm" href="' . h($users) . '">Пользователи</a>';
    echo '<a class="btn btn--ghost btn--sm" href="' . h($home) . '">← Визуализатор</a>';
    echo '<a class="btn btn--neutral btn--sm" href="' . h($out) . '">Выйти</a>';
    echo '</nav></div><div class="page">' . $bodyHtml . '</div></body></html>';
}

/* ================================================================
   ЭТАП 06 — запросы для главного дашборда администратора.
   Все запросы — prepared statements. Имена таблиц/колонок — константы.
================================================================ */

/* KPI-карточки дашборда. Пользователи всегда считаются (таблица users есть);
   событийные метрики — только если установлены таблицы аналитики. */
function analytics_dashboard_kpis($period = '7d') {
    $since = analytics_period_since($period);

    $k = [
        'period'            => $period,
        'users_total'       => 0,
        'users_new'         => 0,
        'users_pending'     => 0,
        'users_active'      => 0,
        'sessions'          => 0,
        'events'            => 0,
        'tile_applies'      => 0,
        'favorites'         => 0,
        'downloads_success' => 0,
        'downloads_blocked' => 0,
    ];

    /* --- пользователи (users есть всегда) --- */
    try {
        $k['users_total']   = (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $k['users_pending'] = (int)db()->query("SELECT COUNT(*) FROM users WHERE status='pending'")->fetchColumn();
        if ($since) {
            $st = db()->prepare('SELECT COUNT(*) FROM users WHERE created_at >= ?');
            $st->execute([$since]);
            $k['users_new'] = (int)$st->fetchColumn();
        } else {
            $k['users_new'] = $k['users_total'];
        }
    } catch (Throwable $e) {}

    if (!analytics_ready()) return $k;

    /* --- событийные метрики --- */
    try {
        $k['sessions']          = analytics_count('analytics_sessions', $period);
        $k['events']            = analytics_count('analytics_events', $period);
        $k['tile_applies']      = analytics_count('analytics_events', $period, 'event_name = ?', ['tile_apply']);
        $k['favorites']         = analytics_count('analytics_events', $period, 'event_name = ?', ['favorite_add']);
        $k['downloads_success'] = analytics_count('download_events', $period, 'status = ?', ['success']);
        $k['downloads_blocked'] = analytics_count('download_events', $period, 'status = ?', ['blocked_limit']);

        // активные пользователи = уникальные user_id среди событий за период
        $sql = 'SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE user_id IS NOT NULL';
        $args = [];
        if ($since) { $sql .= ' AND created_at >= ?'; $args[] = $since; }
        $st = db()->prepare($sql); $st->execute($args);
        $k['users_active'] = (int)$st->fetchColumn();
    } catch (Throwable $e) {}

    return $k;
}

/* Карта tile_id -> brand по событиям применения (последний известный бренд). */
function analytics_tile_brand_map() {
    $map = [];
    if (!analytics_ready()) return $map;
    try {
        $rows = db()->query("SELECT tile_id, tile_brand FROM analytics_events
                             WHERE event_name='tile_apply' AND tile_id IS NOT NULL AND tile_id <> ''")
                    ->fetchAll();
        foreach ($rows as $r) {
            if (!isset($map[$r['tile_id']]) && $r['tile_brand'] !== null && $r['tile_brand'] !== '') {
                $map[$r['tile_id']] = $r['tile_brand'];
            }
        }
    } catch (Throwable $e) {}
    return $map;
}

/* Сколько раз каждая плитка попала в успешное скачивание (разбор selection_json в PHP). */
function analytics_download_tile_counts($period = '30d') {
    $counts = [];
    if (!analytics_ready()) return $counts;
    $since = analytics_period_since($period);
    try {
        $sql = "SELECT selection_json FROM download_events WHERE status='success' AND selection_json IS NOT NULL";
        $args = [];
        if ($since) { $sql .= ' AND created_at >= ?'; $args[] = $since; }
        $sql .= ' LIMIT 5000';                 // защита от перегрузки на больших объёмах
        $st = db()->prepare($sql); $st->execute($args);
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $json) {
            $sel = json_decode((string)$json, true);
            if (!is_array($sel)) continue;
            foreach ($sel as $tid) {
                $tid = (string)$tid;
                if ($tid === '') continue;
                $counts[$tid] = ($counts[$tid] ?? 0) + 1;
            }
        }
    } catch (Throwable $e) {}
    return $counts;
}

/* Топ плиток: применения + избранное + скачивания. Колонки по роудмапу. */
function analytics_top_tiles($period = '30d', $limit = 15) {
    if (!analytics_ready()) return [];
    $since = analytics_period_since($period);
    $rows = [];
    try {
        $sql = "SELECT tile_id,
                       SUM(event_name='tile_apply')   AS applies,
                       SUM(event_name='favorite_add') AS favorites
                FROM analytics_events
                WHERE tile_id IS NOT NULL AND tile_id <> ''
                  AND event_name IN ('tile_apply','favorite_add')";
        $args = [];
        if ($since) { $sql .= ' AND created_at >= ?'; $args[] = $since; }
        $sql .= ' GROUP BY tile_id';
        $st = db()->prepare($sql); $st->execute($args);
        foreach ($st->fetchAll() as $r) {
            $rows[$r['tile_id']] = [
                'tile_id'   => $r['tile_id'],
                'applies'   => (int)$r['applies'],
                'favorites' => (int)$r['favorites'],
                'downloads' => 0,
            ];
        }
    } catch (Throwable $e) {}

    $dl = analytics_download_tile_counts($period);
    foreach ($dl as $tid => $cnt) {
        if (!isset($rows[$tid])) $rows[$tid] = ['tile_id'=>$tid,'applies'=>0,'favorites'=>0,'downloads'=>0];
        $rows[$tid]['downloads'] = $cnt;
    }

    $rows = array_values($rows);
    usort($rows, function ($a, $b) {
        return ($b['applies'] + $b['downloads']) <=> ($a['applies'] + $a['downloads']);
    });
    return array_slice($rows, 0, (int)$limit);
}

/* Топ брендов: применения + скачивания (downloads сведены через карту tile->brand). */
function analytics_top_brands($period = '30d', $limit = 15) {
    if (!analytics_ready()) return [];
    $since = analytics_period_since($period);
    $brands = [];
    try {
        $sql = "SELECT tile_brand AS b, COUNT(*) AS applies
                FROM analytics_events
                WHERE event_name='tile_apply' AND tile_brand IS NOT NULL AND tile_brand <> ''";
        $args = [];
        if ($since) { $sql .= ' AND created_at >= ?'; $args[] = $since; }
        $sql .= ' GROUP BY tile_brand';
        $st = db()->prepare($sql); $st->execute($args);
        foreach ($st->fetchAll() as $r) {
            $brands[$r['b']] = ['brand'=>$r['b'], 'applies'=>(int)$r['applies'], 'downloads'=>0];
        }
    } catch (Throwable $e) {}

    $map = analytics_tile_brand_map();
    foreach (analytics_download_tile_counts($period) as $tid => $cnt) {
        $b = $map[$tid] ?? null;
        if ($b === null) continue;
        if (!isset($brands[$b])) $brands[$b] = ['brand'=>$b,'applies'=>0,'downloads'=>0];
        $brands[$b]['downloads'] += $cnt;
    }

    $brands = array_values($brands);
    usort($brands, function ($a, $b) {
        return ($b['applies'] + $b['downloads']) <=> ($a['applies'] + $a['downloads']);
    });
    return array_slice($brands, 0, (int)$limit);
}

/* Устройства: сессии по типу + доля. */
function analytics_device_breakdown($period = '7d') {
    if (!analytics_ready()) return [];
    $since = analytics_period_since($period);
    try {
        $sql = 'SELECT COALESCE(device_type, "—") AS d, COUNT(*) AS c FROM analytics_sessions WHERE 1=1';
        $args = [];
        if ($since) { $sql .= ' AND last_seen_at >= ?'; $args[] = $since; }
        $sql .= ' GROUP BY device_type ORDER BY c DESC';
        $st = db()->prepare($sql); $st->execute($args);
        $rows = $st->fetchAll();
        $total = 0; foreach ($rows as $r) $total += (int)$r['c'];
        $out = [];
        foreach ($rows as $r) {
            $c = (int)$r['c'];
            $out[] = ['device'=>$r['d'], 'sessions'=>$c, 'share'=>$total ? round($c*100/$total) : 0];
        }
        return $out;
    } catch (Throwable $e) { return []; }
}

/* Последние активные пользователи: профиль + последняя активность + события + скачивания. */
function analytics_recent_active_users($period = '7d', $limit = 15) {
    if (!analytics_ready()) return [];
    $since = analytics_period_since($period);
    try {
        $sql = 'SELECT u.id, u.first_name, u.last_name, u.email, u.company,
                       MAX(e.created_at) AS last_activity, COUNT(e.id) AS events
                FROM analytics_events e
                JOIN users u ON u.id = e.user_id
                WHERE e.user_id IS NOT NULL';
        $args = [];
        if ($since) { $sql .= ' AND e.created_at >= ?'; $args[] = $since; }
        $sql .= ' GROUP BY u.id ORDER BY last_activity DESC LIMIT ' . (int)$limit;
        $st = db()->prepare($sql); $st->execute($args);
        $users = $st->fetchAll();
        if (!$users) return [];

        // скачивания по этим пользователям одним запросом
        $ids = array_map(function ($u) { return (int)$u['id']; }, $users);
        $place = implode(',', array_fill(0, count($ids), '?'));
        $dlSql = "SELECT user_id, COUNT(*) c FROM download_events WHERE status='success' AND user_id IN ($place)";
        $dlArgs = $ids;
        if ($since) { $dlSql .= ' AND created_at >= ?'; $dlArgs[] = $since; }
        $dlSql .= ' GROUP BY user_id';
        $dlSt = db()->prepare($dlSql); $dlSt->execute($dlArgs);
        $dlMap = [];
        foreach ($dlSt->fetchAll() as $r) $dlMap[(int)$r['user_id']] = (int)$r['c'];

        foreach ($users as &$u) { $u['downloads'] = $dlMap[(int)$u['id']] ?? 0; }
        unset($u);
        return $users;
    } catch (Throwable $e) { return []; }
}

/* ================================================================
   ЭТАП 07 — запросы для подробной карточки пользователя.
   Все запросы — prepared statements, период по created_at/last_seen_at.
================================================================ */

/* KPI активности одного пользователя за период. */
function analytics_user_kpis($userId, $period = '30d') {
    $uid = (int)$userId;
    $since = analytics_period_since($period);
    $k = ['sessions'=>0,'events'=>0,'tile_applies'=>0,'favorites'=>0,
          'downloads'=>0,'last_visit'=>null,'devices'=>[]];
    if (!analytics_ready()) return $k;
    try {
        // сессии + последний визит + устройства
        $sql = 'SELECT COUNT(*) c, MAX(last_seen_at) lv FROM analytics_sessions WHERE user_id = ?';
        $args = [$uid];
        if ($since) { $sql .= ' AND last_seen_at >= ?'; $args[] = $since; }
        $st = db()->prepare($sql); $st->execute($args);
        $row = $st->fetch();
        $k['sessions']   = (int)($row['c'] ?? 0);
        $k['last_visit'] = $row['lv'] ?? null;

        $sqlD = 'SELECT COALESCE(device_type,"—") d, COUNT(*) c FROM analytics_sessions WHERE user_id = ?';
        $argsD = [$uid];
        if ($since) { $sqlD .= ' AND last_seen_at >= ?'; $argsD[] = $since; }
        $sqlD .= ' GROUP BY device_type ORDER BY c DESC LIMIT 3';
        $stD = db()->prepare($sqlD); $stD->execute($argsD);
        $k['devices'] = $stD->fetchAll();

        // события
        $base = 'FROM analytics_events WHERE user_id = ?';
        $cArgs = [$uid];
        if ($since) { $base .= ' AND created_at >= ?'; $cArgs[] = $since; }
        $st = db()->prepare("SELECT COUNT(*) $base"); $st->execute($cArgs);
        $k['events'] = (int)$st->fetchColumn();
        $st = db()->prepare("SELECT COUNT(*) $base AND event_name='tile_apply'"); $st->execute($cArgs);
        $k['tile_applies'] = (int)$st->fetchColumn();
        $st = db()->prepare("SELECT COUNT(*) $base AND event_name='favorite_add'"); $st->execute($cArgs);
        $k['favorites'] = (int)$st->fetchColumn();

        // скачивания
        $sqlDl = "SELECT COUNT(*) FROM download_events WHERE user_id = ? AND status='success'";
        $argsDl = [$uid];
        if ($since) { $sqlDl .= ' AND created_at >= ?'; $argsDl[] = $since; }
        $st = db()->prepare($sqlDl); $st->execute($argsDl);
        $k['downloads'] = (int)$st->fetchColumn();
    } catch (Throwable $e) {}
    return $k;
}

/* Сколько раз плитки конкретного пользователя попали в его успешные скачивания. */
function analytics_user_download_tile_counts($userId, $period = '30d') {
    $counts = [];
    if (!analytics_ready()) return $counts;
    $uid = (int)$userId; $since = analytics_period_since($period);
    try {
        $sql = "SELECT selection_json FROM download_events WHERE user_id = ? AND status='success' AND selection_json IS NOT NULL";
        $args = [$uid];
        if ($since) { $sql .= ' AND created_at >= ?'; $args[] = $since; }
        $sql .= ' LIMIT 2000';
        $st = db()->prepare($sql); $st->execute($args);
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $json) {
            $sel = json_decode((string)$json, true);
            if (!is_array($sel)) continue;
            foreach ($sel as $tid) {
                $tid = (string)$tid; if ($tid === '') continue;
                $counts[$tid] = ($counts[$tid] ?? 0) + 1;
            }
        }
    } catch (Throwable $e) {}
    return $counts;
}

/* Топ плиток пользователя: применения + избранное + скачивания. */
function analytics_user_top_tiles($userId, $period = '30d', $limit = 15) {
    if (!analytics_ready()) return [];
    $uid = (int)$userId; $since = analytics_period_since($period);
    $rows = [];
    try {
        $sql = "SELECT tile_id,
                       SUM(event_name='tile_apply')   applies,
                       SUM(event_name='favorite_add') favorites
                FROM analytics_events
                WHERE user_id = ? AND tile_id IS NOT NULL AND tile_id <> ''
                  AND event_name IN ('tile_apply','favorite_add')";
        $args = [$uid];
        if ($since) { $sql .= ' AND created_at >= ?'; $args[] = $since; }
        $sql .= ' GROUP BY tile_id';
        $st = db()->prepare($sql); $st->execute($args);
        foreach ($st->fetchAll() as $r) {
            $rows[$r['tile_id']] = ['tile_id'=>$r['tile_id'],'applies'=>(int)$r['applies'],
                                    'favorites'=>(int)$r['favorites'],'downloads'=>0];
        }
    } catch (Throwable $e) {}
    foreach (analytics_user_download_tile_counts($uid, $period) as $tid => $cnt) {
        if (!isset($rows[$tid])) $rows[$tid] = ['tile_id'=>$tid,'applies'=>0,'favorites'=>0,'downloads'=>0];
        $rows[$tid]['downloads'] = $cnt;
    }
    $rows = array_values($rows);
    usort($rows, function ($a, $b) { return ($b['applies']+$b['downloads']) <=> ($a['applies']+$a['downloads']); });
    return array_slice($rows, 0, (int)$limit);
}

/* Топ значений фильтров пользователя по применённым плиткам (цвет/размер/поверхность/дизайн). */
function analytics_user_top_filters($userId, $period = '30d', $limit = 6) {
    $out = ['color'=>[], 'size'=>[], 'surface'=>[], 'design'=>[]];
    if (!analytics_ready()) return $out;
    $uid = (int)$userId; $since = analytics_period_since($period);
    $cols = ['color'=>'tile_color','size'=>'tile_size','surface'=>'tile_surface','design'=>'tile_design'];
    foreach ($cols as $key => $col) {
        try {
            $sql = "SELECT $col v, COUNT(*) c FROM analytics_events
                    WHERE user_id = ? AND event_name='tile_apply' AND $col IS NOT NULL AND $col <> ''";
            $args = [$uid];
            if ($since) { $sql .= ' AND created_at >= ?'; $args[] = $since; }
            $sql .= " GROUP BY $col ORDER BY c DESC LIMIT " . (int)$limit;
            $st = db()->prepare($sql); $st->execute($args);
            $out[$key] = $st->fetchAll();
        } catch (Throwable $e) {}
    }
    return $out;
}

/* Последние поисковые запросы пользователя. */
function analytics_user_recent_searches($userId, $limit = 15) {
    if (!analytics_ready()) return [];
    $uid = (int)$userId; $lim = (int)$limit;
    try {
        $st = db()->prepare("SELECT created_at, search_query, filters_json, metadata_json
                             FROM analytics_events
                             WHERE user_id = ? AND event_name='search' AND search_query IS NOT NULL AND search_query <> ''
                             ORDER BY created_at DESC LIMIT $lim");
        $st->execute([$uid]);
        return $st->fetchAll();
    } catch (Throwable $e) { return []; }
}

/* Последние N событий пользователя (для истории). */
function analytics_user_events($userId, $limit = 100) {
    if (!analytics_ready()) return [];
    $uid = (int)$userId; $lim = (int)$limit;
    try {
        $st = db()->prepare("SELECT created_at, event_name, scene_id, zone_id, tile_id,
                                    tile_color, tile_size, search_query
                             FROM analytics_events WHERE user_id = ?
                             ORDER BY created_at DESC LIMIT $lim");
        $st->execute([$uid]);
        return $st->fetchAll();
    } catch (Throwable $e) { return []; }
}

/* История скачиваний пользователя. */
function analytics_user_downloads($userId, $limit = 100) {
    if (!analytics_ready()) return [];
    $uid = (int)$userId; $lim = (int)$limit;
    try {
        $st = db()->prepare("SELECT created_at, scene_id, selection_json, status,
                                    used_before, used_after, error_message
                             FROM download_events WHERE user_id = ?
                             ORDER BY created_at DESC LIMIT $lim");
        $st->execute([$uid]);
        return $st->fetchAll();
    } catch (Throwable $e) { return []; }
}

/* ---------- Админ-заметки ---------- */
function admin_notes_ready() {
    static $r = null;
    if ($r !== null) return $r;
    try { $r = (bool)db()->query("SHOW TABLES LIKE 'admin_notes'")->fetchColumn(); }
    catch (Throwable $e) { $r = false; }
    return $r;
}
function admin_notes_list($userId) {
    if (!admin_notes_ready()) return [];
    try {
        $st = db()->prepare('SELECT n.*, u.first_name, u.last_name, u.email
                             FROM admin_notes n LEFT JOIN users u ON u.id = n.admin_id
                             WHERE n.user_id = ? ORDER BY n.created_at DESC');
        $st->execute([(int)$userId]);
        return $st->fetchAll();
    } catch (Throwable $e) { return []; }
}
function admin_notes_add($userId, $adminId, $note) {
    if (!admin_notes_ready()) return false;
    $note = trim((string)$note);
    if ($note === '') return false;
    if (mb_strlen($note) > 5000) $note = mb_substr($note, 0, 5000);
    try {
        db()->prepare('INSERT INTO admin_notes (user_id, admin_id, note, created_at) VALUES (?,?,?,NOW())')
            ->execute([(int)$userId, (int)$adminId, $note]);
        return true;
    } catch (Throwable $e) { return false; }
}

/* Найти пользователя по id (для карточки). */
function admin_get_user($userId) {
    try {
        $st = db()->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([(int)$userId]);
        return $st->fetch() ?: null;
    } catch (Throwable $e) { return null; }
}
/* Имя одобрившего администратора (по approved_by). */
function admin_get_approver_name($approvedBy) {
    if (!$approvedBy) return null;
    try {
        $st = db()->prepare('SELECT first_name, last_name, email FROM users WHERE id = ?');
        $st->execute([(int)$approvedBy]);
        $a = $st->fetch();
        if (!$a) return null;
        $name = trim($a['first_name'] . ' ' . $a['last_name']);
        return $name !== '' ? $name : $a['email'];
    } catch (Throwable $e) { return null; }
}

/* ================================================================
   ЭТАП 08 — аналитика плитки.
   Источник — analytics_events; скачивания по плитке — разбор
   download_events.selection_json (успешные). Все запросы — prepared.
================================================================ */

/* Карта tile_id -> значение атрибута (последнее непустое из событий). */
function analytics_tile_attr_map($col) {
    $allowed = ['tile_brand','tile_collection','tile_color','tile_size','tile_surface','tile_design'];
    if (!in_array($col, $allowed, true) || !analytics_ready()) return [];
    $map = [];
    try {
        $rows = db()->query("SELECT tile_id, $col v FROM analytics_events
                             WHERE tile_id IS NOT NULL AND tile_id <> '' AND $col IS NOT NULL AND $col <> ''")
                    ->fetchAll();
        foreach ($rows as $r) { if (!isset($map[$r['tile_id']])) $map[$r['tile_id']] = $r['v']; }
    } catch (Throwable $e) {}
    return $map;
}

/* Возможные значения фильтров (только реально встречавшиеся). */
function analytics_tile_filter_options($period = '30d') {
    $out = ['brand'=>[], 'color'=>[], 'size'=>[], 'surface'=>[], 'design'=>[]];
    if (!analytics_ready()) return $out;
    $since = analytics_period_since($period);
    $cols = ['brand'=>'tile_brand','color'=>'tile_color','size'=>'tile_size','surface'=>'tile_surface','design'=>'tile_design'];
    foreach ($cols as $key => $col) {
        try {
            $sql = "SELECT DISTINCT $col v FROM analytics_events WHERE $col IS NOT NULL AND $col <> ''";
            $args = [];
            if ($since) { $sql .= ' AND created_at >= ?'; $args[] = $since; }
            $sql .= " ORDER BY $col";
            $st = db()->prepare($sql); $st->execute($args);
            $out[$key] = $st->fetchAll(PDO::FETCH_COLUMN);
        } catch (Throwable $e) {}
    }
    return $out;
}

/* Главная таблица аналитики плитки. $opts: period, brand, color, size, surface,
   design, tile_id (поиск), sort, dir. Возвращает массив строк. */
function analytics_tile_table(array $opts = []) {
    if (!analytics_ready()) return [];
    $period = $opts['period'] ?? '30d';
    $since  = analytics_period_since($period);

    $where = "tile_id IS NOT NULL AND tile_id <> ''";
    $args  = [];
    $map = ['brand'=>'tile_brand','color'=>'tile_color','size'=>'tile_size','surface'=>'tile_surface','design'=>'tile_design'];
    foreach ($map as $k => $col) {
        if (!empty($opts[$k])) { $where .= " AND $col = ?"; $args[] = $opts[$k]; }
    }
    if (!empty($opts['tile_id'])) { $where .= " AND tile_id LIKE ?"; $args[] = '%' . $opts['tile_id'] . '%'; }
    if ($since) { $where .= " AND created_at >= ?"; $args[] = $since; }

    $rows = [];
    try {
        $sql = "SELECT tile_id,
                   MAX(NULLIF(tile_brand,''))      AS brand,
                   MAX(NULLIF(tile_collection,'')) AS collection,
                   MAX(NULLIF(tile_color,''))      AS color,
                   MAX(NULLIF(tile_size,''))       AS size,
                   MAX(NULLIF(tile_surface,''))    AS surface,
                   MAX(NULLIF(tile_design,''))     AS design,
                   SUM(event_name='tile_apply')      AS applies,
                   SUM(event_name='tile_apply_all')  AS applies_all,
                   SUM(event_name='favorite_add')    AS favorites,
                   MAX(created_at)                   AS last_activity
                FROM analytics_events
                WHERE $where
                GROUP BY tile_id";
        $st = db()->prepare($sql); $st->execute($args);
        foreach ($st->fetchAll() as $r) {
            $rows[$r['tile_id']] = [
                'tile_id'      => $r['tile_id'],
                'brand'        => $r['brand'],
                'collection'   => $r['collection'],
                'color'        => $r['color'],
                'size'         => $r['size'],
                'surface'      => $r['surface'],
                'design'       => $r['design'],
                'applies'      => (int)$r['applies'],
                'applies_all'  => (int)$r['applies_all'],
                'favorites'    => (int)$r['favorites'],
                'downloads'    => 0,
                'conversion'   => 0.0,
                'last_activity'=> $r['last_activity'],
            ];
        }
    } catch (Throwable $e) {}

    // скачивания по плитке (из успешных download_events)
    foreach (analytics_download_tile_counts($period) as $tid => $cnt) {
        if (isset($rows[$tid])) $rows[$tid]['downloads'] = $cnt;
        // плитки, по которым были только скачивания (без событий применения), в таблицу
        // не добавляем — у них нет атрибутов; они учтены в общем разборе при необходимости.
    }
    // конверсия apply -> download
    foreach ($rows as &$r) {
        $r['conversion'] = $r['applies'] > 0 ? round($r['downloads'] * 100 / $r['applies'], 1) : 0.0;
    }
    unset($r);

    // сортировка
    $sortable = ['tile_id','applies','applies_all','favorites','downloads','conversion','last_activity'];
    $sort = in_array($opts['sort'] ?? '', $sortable, true) ? $opts['sort'] : 'applies';
    $dir  = (($opts['dir'] ?? 'desc') === 'asc') ? 1 : -1;
    $rows = array_values($rows);
    usort($rows, function ($a, $b) use ($sort, $dir) {
        $x = $a[$sort]; $y = $b[$sort];
        if (is_numeric($x) && is_numeric($y)) return ($x <=> $y) * $dir;
        return strcmp((string)$x, (string)$y) * $dir;
    });
    return $rows;
}

/* Группировка по атрибуту (бренд/цвет/размер): применения + избранное + скачивания. */
function analytics_tile_group($period, $groupKey, $limit = 20) {
    $cols = ['brand'=>'tile_brand','color'=>'tile_color','size'=>'tile_size'];
    if (!isset($cols[$groupKey]) || !analytics_ready()) return [];
    $col = $cols[$groupKey];
    $since = analytics_period_since($period);
    $rows = [];
    try {
        $sql = "SELECT $col v,
                       SUM(event_name='tile_apply')   applies,
                       SUM(event_name='favorite_add') favorites
                FROM analytics_events
                WHERE $col IS NOT NULL AND $col <> ''
                  AND event_name IN ('tile_apply','favorite_add')";
        $args = [];
        if ($since) { $sql .= ' AND created_at >= ?'; $args[] = $since; }
        $sql .= " GROUP BY $col";
        $st = db()->prepare($sql); $st->execute($args);
        foreach ($st->fetchAll() as $r) {
            $rows[$r['v']] = ['value'=>$r['v'], 'applies'=>(int)$r['applies'], 'favorites'=>(int)$r['favorites'], 'downloads'=>0];
        }
    } catch (Throwable $e) {}

    // скачивания по группе через карту tile_id -> значение атрибута
    $attrMap = analytics_tile_attr_map($col);
    foreach (analytics_download_tile_counts($period) as $tid => $cnt) {
        $v = $attrMap[$tid] ?? null;
        if ($v === null) continue;
        if (!isset($rows[$v])) $rows[$v] = ['value'=>$v,'applies'=>0,'favorites'=>0,'downloads'=>0];
        $rows[$v]['downloads'] += $cnt;
    }

    $rows = array_values($rows);
    usort($rows, function ($a, $b) { return ($b['applies']+$b['downloads']) <=> ($a['applies']+$a['downloads']); });
    return array_slice($rows, 0, (int)$limit);
}
