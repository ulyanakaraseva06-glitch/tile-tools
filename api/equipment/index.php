<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    tt_abort(405, 'method_not_allowed', 'Use GET.');
}

$pdo = tt_pdo();
$query = trim((string) ($_GET['q'] ?? ''));
$filters = [
    'category' => trim((string) ($_GET['category'] ?? '')),
    'brand' => trim((string) ($_GET['brand'] ?? '')),
    'purpose' => trim((string) ($_GET['purpose'] ?? '')),
    'availability' => trim((string) ($_GET['availability'] ?? '')),
    'type' => trim((string) ($_GET['type'] ?? '')),
];
$where = ['is_active = 1'];
$params = [];

if ($query !== '') {
    $where[] = '(name LIKE :query_name OR brand LIKE :query_brand OR short_description LIKE :query_description OR category LIKE :query_category)';
    $needle = '%' . mb_substr($query, 0, 120) . '%';
    $params['query_name'] = $needle;
    $params['query_brand'] = $needle;
    $params['query_description'] = $needle;
    $params['query_category'] = $needle;
}
foreach ($filters as $field => $value) {
    if ($value === '') {
        continue;
    }
    $column = $field === 'type' ? 'equipment_type' : $field;
    $where[] = $column . ' = :' . $field;
    $params[$field] = mb_substr($value, 0, 120);
}

$sortMap = [
    'popular' => 'popularity DESC, name ASC',
    'name' => 'name ASC',
    'brand' => 'brand ASC, name ASC',
    'newest' => 'created_at DESC, name ASC',
];
$sort = (string) ($_GET['sort'] ?? 'popular');
$orderBy = $sortMap[$sort] ?? $sortMap['popular'];
$statement = $pdo->prepare('SELECT id, name, brand, category, purpose, availability, equipment_type, dimensions, short_description, visual_key, popularity FROM tt_equipment_items WHERE ' . implode(' AND ', $where) . ' ORDER BY ' . $orderBy);
$statement->execute($params);

$facetColumns = ['category', 'brand', 'purpose', 'availability', 'equipment_type'];
$facets = [];
foreach ($facetColumns as $column) {
    $rows = $pdo->query('SELECT DISTINCT ' . $column . ' AS value FROM tt_equipment_items WHERE is_active = 1 ORDER BY value')->fetchAll();
    $facets[$column === 'equipment_type' ? 'type' : $column] = array_map(static fn(array $row): string => (string) $row['value'], $rows);
}

tt_json(['ok' => true, 'items' => $statement->fetchAll(), 'facets' => $facets]);
