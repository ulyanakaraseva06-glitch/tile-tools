<?php
/* analytics/api/stats.php — выдача агрегатов для дашбордов.
   ЭТАП 02: заглушка (только админ). Реальные агрегаты — этапы 06–08. */
require_once __DIR__ . '/../functions.php';
header('Content-Type: application/json; charset=utf-8');
require_admin();
echo json_encode(['ok' => true, 'data' => new stdClass()]);
