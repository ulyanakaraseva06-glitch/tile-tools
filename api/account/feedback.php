<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/bootstrap.php';
require dirname(__DIR__, 2) . '/shared/levels.php';

$user = tt_require_user();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tt_abort(405, 'method_not_allowed', 'Use POST.');
}

$body = tt_json_body();
tt_require_csrf($body);
$pdo = tt_pdo();
$statement = $pdo->prepare(
    'INSERT INTO tt_user_progress (user_id, feedback_completed_at)
     VALUES (?, NOW())
     ON DUPLICATE KEY UPDATE feedback_completed_at = COALESCE(feedback_completed_at, NOW())'
);
$statement->execute([(int) $user['id']]);
$progress = tt_sync_user_level_quota($pdo, (int) $user['id']);
tt_audit($pdo, (int) $user['id'], 'user_feedback_confirmed', 'user', (string) $user['id'], ['level' => $progress['level']]);

tt_json(['ok' => true, 'progress' => $progress]);
