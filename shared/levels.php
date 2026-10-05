<?php
declare(strict_types=1);

const TT_LEVEL_QUOTAS = [
    1 => 100 * 1024 * 1024,
    2 => 200 * 1024 * 1024,
    3 => 300 * 1024 * 1024,
];

function tt_user_level_progress(PDO $pdo, int $userId): array
{
    $pdo->prepare('INSERT IGNORE INTO tt_user_progress (user_id) VALUES (?)')->execute([$userId]);
    $statement = $pdo->prepare(
        'SELECT p.feedback_completed_at, p.vote_participations,
                (SELECT COUNT(*) FROM tt_user_referrals r WHERE r.referrer_user_id = p.user_id) AS referral_count
         FROM tt_user_progress p
         WHERE p.user_id = ?
         LIMIT 1'
    );
    $statement->execute([$userId]);
    $row = $statement->fetch() ?: [];

    $referrals = (int) ($row['referral_count'] ?? 0);
    $votes = (int) ($row['vote_participations'] ?? 0);
    $hasFeedback = !empty($row['feedback_completed_at']);
    $level = 1;
    if ($referrals >= 2) {
        $level = 2;
        if ($hasFeedback || $votes >= 3) {
            $level = 3;
        }
    }

    return [
        'level' => $level,
        'quota_bytes' => TT_LEVEL_QUOTAS[$level],
        'quota_mb' => intdiv(TT_LEVEL_QUOTAS[$level], 1024 * 1024),
        'referrals' => $referrals,
        'referrals_required' => 2,
        'feedback_completed' => $hasFeedback,
        'vote_participations' => $votes,
        'votes_required' => 3,
    ];
}

function tt_sync_user_level_quota(PDO $pdo, int $userId): array
{
    $progress = tt_user_level_progress($pdo, $userId);
    $statement = $pdo->prepare(
        'INSERT INTO tt_user_storage_quotas (user_id, limit_bytes)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE limit_bytes = VALUES(limit_bytes)'
    );
    $statement->execute([$userId, $progress['quota_bytes']]);
    return $progress;
}
