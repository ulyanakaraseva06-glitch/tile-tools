<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tt_abort(405, 'method_not_allowed', 'Use POST.');
}

$body = tt_json_body();
tt_require_csrf($body);
$name = trim((string) ($body['name'] ?? ''));
$contact = trim((string) ($body['contact'] ?? ''));
$message = trim((string) ($body['message'] ?? ''));
$equipmentId = trim((string) ($body['equipmentId'] ?? ''));

if (mb_strlen($name) < 2 || mb_strlen($name) > 160 || mb_strlen($contact) < 3 || mb_strlen($contact) > 255 || mb_strlen($message) > 5000) {
    tt_abort(422, 'invalid_lead', 'Укажите имя и корректный телефон, e-mail или Telegram.');
}
if ($equipmentId !== '') {
    $check = tt_pdo()->prepare('SELECT id FROM tt_equipment_items WHERE id = ? AND is_active = 1');
    $check->execute([$equipmentId]);
    if (!$check->fetch()) {
        tt_abort(404, 'equipment_not_found', 'Оборудование не найдено.');
    }
}

$user = tt_current_user();
$pdo = tt_pdo();
$id = tt_uuid();
$statement = $pdo->prepare('INSERT INTO tt_lead_requests (id, user_id, source_type, source_entity_id, name, phone_or_email, message) VALUES (?, ?, "equipment", ?, ?, ?, ?)');
$statement->execute([$id, $user ? (int) $user['id'] : null, $equipmentId !== '' ? $equipmentId : null, $name, $contact, $message !== '' ? $message : null]);
tt_audit($pdo, $user ? (int) $user['id'] : null, 'equipment_lead_created', 'equipment', $equipmentId !== '' ? $equipmentId : 'consultation', ['lead_id' => $id]);
tt_json(['ok' => true, 'leadId' => $id], 201);
