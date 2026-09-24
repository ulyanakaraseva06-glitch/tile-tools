<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/shared/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    tt_abort(405, 'method_not_allowed', 'Use GET.');
}

$search = trim((string) ($_GET['q'] ?? ''));
$brand = trim((string) ($_GET['brand'] ?? ''));
$color = trim((string) ($_GET['color'] ?? ''));
$size = trim((string) ($_GET['size'] ?? ''));
$surface = trim((string) ($_GET['surface'] ?? ''));
$design = trim((string) ($_GET['design'] ?? ''));
$user = tt_current_user();
$userId = $user ? (int) $user['id'] : 0;

$where = [];
$params = [$userId];
if ($search !== '') {
    $where[] = '(t.name LIKE ? OR t.short_name LIKE ? OR t.brand LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(t.source_payload, \'$.article\')) LIKE ?)';
    $needle = '%' . mb_substr($search, 0, 120) . '%';
    array_push($params, $needle, $needle, $needle, $needle);
}
foreach (['brand' => $brand, 'colors' => $color, 'sizes' => $size, 'surfaces' => $surface, 'designs' => $design] as $column => $value) {
    if ($value === '') continue;
    if ($column === 'brand') {
        $where[] = 't.brand = ?';
        $params[] = mb_substr($value, 0, 160);
    } else {
        $where[] = "JSON_CONTAINS(COALESCE(t.{$column}, JSON_ARRAY()), JSON_QUOTE(?))";
        $params[] = mb_substr($value, 0, 120);
    }
}

$sql = "SELECT t.id, t.name, t.short_name, t.brand, t.colors, t.sizes, t.surfaces, t.designs,
               t.hex_color, t.preview_media_id, t.source_payload,
               CASE WHEN f.id IS NULL THEN 0 ELSE 1 END AS is_favorite
        FROM tt_catalog_tiles t
        LEFT JOIN tt_favorite_items f
          ON f.user_id = ? AND f.entity_type = 'tile' AND f.entity_id = t.id";
if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
$sql .= ' ORDER BY is_favorite DESC, COALESCE(t.short_name, t.name), t.id';

$statement = tt_pdo()->prepare($sql);
$statement->execute($params);
$imageRows = tt_pdo()->query(
    "SELECT images.tile_id, images.media_id
       FROM tt_catalog_tile_images images
       INNER JOIN tt_media_assets media ON media.id = images.media_id AND media.status = 'ready'
      ORDER BY images.tile_id, images.sort_order"
)->fetchAll();
$imageUrlsByTile = [];
foreach ($imageRows as $imageRow) {
    $imageUrlsByTile[(string) $imageRow['tile_id']][] = '/api/media/file.php?id=' . rawurlencode((string) $imageRow['media_id']);
}
$items = [];
$facets = ['brands' => [], 'colors' => [], 'sizes' => [], 'surfaces' => [], 'designs' => []];
foreach ($statement->fetchAll() as $row) {
    $decode = static function ($value): array {
        $decoded = json_decode((string) $value, true);
        return is_array($decoded) ? array_values(array_filter($decoded, 'is_string')) : [];
    };
    $payload = json_decode((string) $row['source_payload'], true);
    $sourcePayload = is_array($payload) ? $payload : [];
    $imageUrls = $imageUrlsByTile[(string) $row['id']] ?? [];
    $previewUrl = $imageUrls[0] ?? ($row['preview_media_id'] ? '/api/media/file.php?id=' . rawurlencode((string) $row['preview_media_id']) : null);
    $item = [
        'id' => $row['id'],
        'name' => $row['name'],
        'shortName' => $row['short_name'],
        'brand' => $row['brand'],
        'colors' => $decode($row['colors']),
        'sizes' => $decode($row['sizes']),
        'surfaces' => $decode($row['surfaces']),
        'designs' => $decode($row['designs']),
        'hex' => $row['hex_color'] ?: '#e7e3de',
        'previewUrl' => $previewUrl,
        'imageUrls' => $imageUrls !== [] ? $imageUrls : array_values(array_filter([$previewUrl], 'is_string')),
        'imageCount' => $imageUrls !== [] ? count($imageUrls) : ($previewUrl ? 1 : 0),
        'article' => isset($sourcePayload['article']) && is_string($sourcePayload['article']) ? $sourcePayload['article'] : null,
        'attributes' => isset($sourcePayload['attributes']) && is_array($sourcePayload['attributes']) ? $sourcePayload['attributes'] : array_values(array_filter([
            $sourcePayload['attribute1'] ?? null,
            $sourcePayload['attribute2'] ?? null,
            $sourcePayload['attribute3'] ?? null,
        ], 'is_array')),
        'isFavorite' => (bool) $row['is_favorite'],
        'source' => $sourcePayload,
    ];
    $items[] = $item;
    if ($item['brand']) $facets['brands'][] = $item['brand'];
    foreach (['colors', 'sizes', 'surfaces', 'designs'] as $facet) {
        foreach ($item[$facet] as $value) $facets[$facet][] = $value;
    }
}
foreach ($facets as &$values) {
    $values = array_values(array_unique($values));
    natcasesort($values);
    $values = array_values($values);
}
unset($values);
usort($items, static function (array $left, array $right): int {
    $favoriteOrder = ((int) $right['isFavorite']) <=> ((int) $left['isFavorite']);
    if ($favoriteOrder !== 0) return $favoriteOrder;
    return strnatcasecmp((string) ($left['shortName'] ?: $left['name']), (string) ($right['shortName'] ?: $right['name']));
});

tt_json(['ok' => true, 'items' => $items, 'facets' => $facets, 'authenticated' => (bool) $user]);
