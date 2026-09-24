<?php
declare(strict_types=1);

require dirname(__DIR__) . '/shared/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Method Not Allowed');
}

tt_start_session();
$csrf = (string) ($_POST['csrf'] ?? '');
if (!hash_equals(tt_csrf_token(), $csrf)) {
    http_response_code(419);
    exit('Сессия формы устарела.');
}

tt_revoke_current_auth_token();
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();
header('Location: /index.php');
exit;
