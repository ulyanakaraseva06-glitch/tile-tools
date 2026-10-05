<?php
declare(strict_types=1);

function tt_password_reset_base_url(): string
{
    $configured = rtrim((string) (tt_config()['app']['base_url'] ?? ''), '/');
    if ($configured !== '') {
        return $configured;
    }

    $serverName = strtolower((string) ($_SERVER['SERVER_NAME'] ?? ''));
    if (in_array($serverName, ['127.0.0.1', 'localhost'], true)) {
        $scheme = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http';
        $port = (int) ($_SERVER['SERVER_PORT'] ?? 80);
        $portPart = ($scheme === 'http' && $port !== 80) || ($scheme === 'https' && $port !== 443) ? ':' . $port : '';
        return $scheme . '://' . $serverName . $portPart;
    }

    return 'https://exp.vilraystudio.ru';
}

function tt_send_password_reset_email(string $email, string $nickname, string $resetUrl): bool
{
    $notifications = tt_config()['notifications'] ?? [];
    $from = trim((string) ($notifications['password_reset_from'] ?? 'Tile Tools <info@vilraystudio.ru>'));
    if ($from === '' || preg_match('/[\r\n]/', $from)) {
        $from = 'Tile Tools <info@vilraystudio.ru>';
    }

    $safeNickname = htmlspecialchars($nickname !== '' ? $nickname : 'пользователь', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeUrl = htmlspecialchars($resetUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $subject = 'Восстановление пароля Tile Tools';
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $message = '<!doctype html><html lang="ru"><body style="margin:0;padding:24px;background:#f4f4f6;font-family:Arial,sans-serif;color:#18181e">'
        . '<div style="max-width:560px;margin:auto;padding:32px;border:1px solid #e8e8ec;border-radius:14px;background:#fff">'
        . '<h1 style="margin:0 0 16px;color:#8a6aae;font-size:24px">Tile Tools</h1>'
        . '<p>Здравствуйте, ' . $safeNickname . '!</p>'
        . '<p>Для вашего аккаунта запрошено восстановление пароля. Ссылка действует 60 минут и может быть использована только один раз.</p>'
        . '<p style="margin:26px 0"><a href="' . $safeUrl . '" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#a385c4;color:#fff;text-decoration:none;font-weight:bold">Создать новый пароль</a></p>'
        . '<p style="color:#6b6b80;font-size:13px">Если вы не запрашивали восстановление, просто проигнорируйте письмо — пароль останется прежним.</p>'
        . '</div></body></html>';
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . $from,
        'Reply-To: info@vilraystudio.ru',
        'X-Mailer: PHP/' . PHP_VERSION,
    ];

    return mail($email, $encodedSubject, $message, implode("\r\n", $headers));
}

function tt_password_reset_token(string $value): ?array
{
    if (!preg_match('/^([a-f0-9]{24})\.([a-f0-9]{64})$/D', $value, $matches)) {
        return null;
    }
    return ['selector' => $matches[1], 'validator' => $matches[2]];
}
