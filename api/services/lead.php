<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/bootstrap.php';
require dirname(__DIR__, 2) . '/shared/services.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tt_abort(405, 'method_not_allowed', 'Допустим только POST-запрос.');
}

$body = tt_json_body();
tt_require_csrf($body);

$serviceId = trim((string) ($body['serviceId'] ?? ''));
$name = trim((string) ($body['name'] ?? ''));
$contact = trim((string) ($body['contact'] ?? ''));
$message = trim((string) ($body['message'] ?? ''));
$service = tt_find_service($serviceId);

if ($service === null) {
    tt_abort(422, 'invalid_service', 'Выберите услугу из списка.');
}
if (mb_strlen($name) < 2 || mb_strlen($name) > 160) {
    tt_abort(422, 'invalid_name', 'Укажите имя длиной от 2 до 160 символов.');
}
if (mb_strlen($contact) < 3 || mb_strlen($contact) > 255) {
    tt_abort(422, 'invalid_contact', 'Укажите телефон, e-mail или Telegram.');
}
if (mb_strlen($message) > 5000) {
    tt_abort(422, 'message_too_long', 'Описание задачи не должно превышать 5000 символов.');
}

$user = tt_current_user();
$leadId = tt_uuid();
$storedMessage = 'Услуга: ' . $service['title'];
if ($message !== '') {
    $storedMessage .= "\n\n" . $message;
}

$pdo = tt_pdo();
$statement = $pdo->prepare(
    'INSERT INTO tt_lead_requests
        (id, user_id, source_type, source_entity_id, name, phone_or_email, message, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$statement->execute([
    $leadId,
    $user ? (int) $user['id'] : null,
    'service',
    $serviceId,
    $name,
    $contact,
    $storedMessage,
    'new',
]);

tt_audit($pdo, $user ? (int) $user['id'] : null, 'service_lead_created', 'service', $serviceId, [
    'leadId' => $leadId,
    'serviceId' => $serviceId,
    'delivery' => 'database_only',
]);

tt_json([
    'ok' => true,
    'leadId' => $leadId,
    'savedOnly' => true,
], 201);
