<?php
$favoritesUser = tt_current_user();
if (!$favoritesUser):
?>
<section class="account-required panel-card">
  <span aria-hidden="true">♡</span><h1>Избранное привязано к аккаунту</h1>
  <p>Войдите или зарегистрируйтесь — выбранные материалы, оборудование и проекты будут доступны на всех ваших устройствах.</p>
  <div><a class="button button-primary" href="/auth/login.php">Войти</a><a class="button button-secondary" href="/auth/register.php">Зарегистрироваться</a></div>
</section>
<?php
else:
    require_once dirname(__DIR__, 2) . '/shared/services.php';
    $pdo = tt_pdo();
    $userId = (int) $favoritesUser['id'];
    $decodeList = static function ($value): array {
        if (!is_string($value) || $value === '') return [];
        $decoded = json_decode($value, true);
        return is_array($decoded) ? array_values(array_filter($decoded, 'is_string')) : [];
    };
    $mediaUrl = static fn ($id): ?string => $id ? '/api/media/file.php?id=' . rawurlencode((string) $id) : null;

    $sections = [
        'tile' => ['label' => 'Плитка', 'icon' => '▦', 'description' => 'Материалы, отмеченные сердцем во всех сервисах.', 'items' => []],
        'folder' => ['label' => 'Папки', 'icon' => '▱', 'description' => 'Ваши личные подборки плитки из медиатеки.', 'items' => []],
        'project' => ['label' => 'Проекты', 'icon' => '⊞', 'description' => 'Сохранённые проекты, к которым можно вернуться.', 'items' => []],
        'equipment' => ['label' => 'Оборудование', 'icon' => '▣', 'description' => 'Стенды, экспозиторы и оборудование для шоурума.', 'items' => []],
        'service' => ['label' => 'Услуги', 'icon' => '◇', 'description' => 'Услуги студии, которые вы сохранили.', 'items' => []],
        'media' => ['label' => 'Файлы', 'icon' => '▧', 'description' => 'Избранные изображения из общей медиатеки.', 'items' => []],
    ];

    $statement = $pdo->prepare("SELECT favorite.entity_id AS id, tile.name, tile.short_name, tile.brand, tile.sizes, tile.surfaces, tile.preview_media_id FROM tt_favorite_items favorite INNER JOIN tt_catalog_tiles tile ON tile.id = favorite.entity_id WHERE favorite.user_id = ? AND favorite.entity_type = 'tile' ORDER BY favorite.created_at DESC");
    $statement->execute([$userId]);
    foreach ($statement->fetchAll() as $row) {
        $sizes = $decodeList($row['sizes'] ?? null);
        $surfaces = $decodeList($row['surfaces'] ?? null);
        $sections['tile']['items'][] = ['id' => (string) $row['id'], 'title' => (string) ($row['short_name'] ?: $row['name']), 'subtitle' => (string) ($row['brand'] ?: 'Без бренда'), 'meta' => implode(' · ', array_filter([$sizes[0] ?? null, $surfaces[0] ?? null])) ?: 'Характеристики не указаны', 'image' => $mediaUrl($row['preview_media_id'] ?? null), 'href' => tt_url('media')];
    }

    $statement = $pdo->prepare("SELECT folder.id, folder.name, folder.updated_at, COUNT(folder_tile.tile_id) AS tile_count FROM tt_media_folders folder LEFT JOIN tt_media_folder_tiles folder_tile ON folder_tile.folder_id = folder.id WHERE folder.user_id = ? GROUP BY folder.id, folder.name, folder.updated_at ORDER BY folder.updated_at DESC");
    $statement->execute([$userId]);
    $folders = $statement->fetchAll();
    $folderImages = [];
    if ($folders !== []) {
        $statement = $pdo->prepare("SELECT folder_tile.folder_id, tile.preview_media_id FROM tt_media_folders folder INNER JOIN tt_media_folder_tiles folder_tile ON folder_tile.folder_id = folder.id INNER JOIN tt_catalog_tiles tile ON tile.id = folder_tile.tile_id WHERE folder.user_id = ? AND tile.preview_media_id IS NOT NULL ORDER BY folder.updated_at DESC, folder_tile.created_at DESC");
        $statement->execute([$userId]);
        foreach ($statement->fetchAll() as $row) {
            $folderId = (string) $row['folder_id'];
            $folderImages[$folderId] ??= [];
            if (count($folderImages[$folderId]) < 4) $folderImages[$folderId][] = $mediaUrl($row['preview_media_id']);
        }
    }
    foreach ($folders as $folder) {
        $folderId = (string) $folder['id'];
        $count = (int) $folder['tile_count'];
        $sections['folder']['items'][] = ['id' => $folderId, 'title' => (string) $folder['name'], 'subtitle' => $count . ' ' . ($count === 1 ? 'материал' : ($count >= 2 && $count <= 4 ? 'материала' : 'материалов')), 'meta' => 'Личная подборка', 'images' => $folderImages[$folderId] ?? [], 'href' => tt_url('media') . '#folder=' . rawurlencode($folderId)];
    }

    $statement = $pdo->prepare("SELECT favorite.entity_id AS id, project.title, project.project_type, project.status, project.preview_media_id FROM tt_favorite_items favorite INNER JOIN tt_projects project ON project.id = favorite.entity_id AND project.owner_user_id = favorite.user_id WHERE favorite.user_id = ? AND favorite.entity_type = 'project' AND project.deleted_at IS NULL ORDER BY favorite.created_at DESC");
    $statement->execute([$userId]);
    $projectTypes = ['visualization' => 'Сравни плитку', 'calculation' => 'Посчитай плитку', 'pdf' => 'Плитка PDF'];
    $projectStatuses = ['draft' => 'Черновик', 'active' => 'В работе', 'done' => 'Завершён', 'archived' => 'В архиве'];
    foreach ($statement->fetchAll() as $row) {
        $type = (string) $row['project_type'];
        $sections['project']['items'][] = ['id' => (string) $row['id'], 'title' => (string) $row['title'], 'subtitle' => $projectTypes[$type] ?? 'Проект', 'meta' => $projectStatuses[(string) $row['status']] ?? 'Проект', 'image' => $mediaUrl($row['preview_media_id'] ?? null), 'visual' => preg_replace('/[^a-z-]/', '', $type), 'href' => tt_url('projects')];
    }

    $statement = $pdo->prepare("SELECT favorite.entity_id AS id, equipment.name, equipment.brand, equipment.equipment_type, equipment.dimensions, equipment.visual_key FROM tt_favorite_items favorite INNER JOIN tt_equipment_items equipment ON equipment.id = favorite.entity_id WHERE favorite.user_id = ? AND favorite.entity_type = 'equipment' AND equipment.is_active = 1 ORDER BY favorite.created_at DESC");
    $statement->execute([$userId]);
    foreach ($statement->fetchAll() as $row) {
        $sections['equipment']['items'][] = ['id' => (string) $row['id'], 'title' => (string) $row['name'], 'subtitle' => (string) $row['brand'], 'meta' => implode(' · ', array_filter([(string) $row['equipment_type'], (string) ($row['dimensions'] ?? '')])), 'visual' => preg_replace('/[^a-z0-9-]/', '', strtolower((string) $row['visual_key'])), 'href' => tt_url('equipment')];
    }

    $statement = $pdo->prepare("SELECT entity_id FROM tt_favorite_items WHERE user_id = ? AND entity_type = 'service' ORDER BY created_at DESC");
    $statement->execute([$userId]);
    $services = [];
    foreach (tt_services_catalog() as $service) $services[(string) $service['id']] = $service;
    foreach (array_map('strval', $statement->fetchAll(PDO::FETCH_COLUMN)) as $serviceId) {
        if (!isset($services[$serviceId])) continue;
        $service = $services[$serviceId];
        $sections['service']['items'][] = ['id' => $serviceId, 'title' => (string) $service['title'], 'subtitle' => (string) $service['price'], 'meta' => (string) $service['short'], 'image' => (string) $service['image'], 'href' => tt_url('services')];
    }

    $statement = $pdo->prepare("SELECT favorite.entity_id AS id, media.original_name, media.scope, media.mime_type FROM tt_favorite_items favorite INNER JOIN tt_media_assets media ON media.id = favorite.entity_id WHERE favorite.user_id = ? AND favorite.entity_type = 'media' AND media.status = 'ready' AND media.deleted_at IS NULL ORDER BY favorite.created_at DESC");
    $statement->execute([$userId]);
    foreach ($statement->fetchAll() as $row) {
        $isImage = str_starts_with((string) $row['mime_type'], 'image/');
        $sections['media']['items'][] = ['id' => (string) $row['id'], 'title' => (string) $row['original_name'], 'subtitle' => $row['scope'] === 'personal' ? 'Личный файл' : 'Общий файл', 'meta' => (string) $row['mime_type'], 'image' => $isImage ? $mediaUrl($row['id']) : null, 'href' => tt_url('media')];
    }

    $favoriteCount = 0;
    foreach ($sections as $key => $section) if ($key !== 'folder') $favoriteCount += count($section['items']);
    $savedCount = $favoriteCount + count($sections['folder']['items']);
    $sectionRoutes = ['tile' => 'media', 'folder' => 'media', 'project' => 'projects', 'equipment' => 'equipment', 'service' => 'services', 'media' => 'media'];
?>
<section class="favorites-page" data-favorites-page>
  <h1 class="sr-only">Избранное</h1>
  <span class="sr-only" data-favorites-total><?= $savedCount ?></span>
  <nav class="favorites-tabs panel-card" aria-label="Разделы избранного" role="tablist">
    <?php foreach ($sections as $key => $section): ?>
      <button type="button" role="tab" aria-selected="false" data-favorites-tab="<?= tt_escape($key) ?>" data-count="<?= count($section['items']) ?>"><span aria-hidden="true"><?= tt_escape($section['icon']) ?></span><strong><?= tt_escape($section['label']) ?></strong><b data-tab-count><?= count($section['items']) ?></b></button>
    <?php endforeach; ?>
  </nav>
  <?php foreach ($sections as $key => $section): ?>
    <section class="favorites-panel panel-card" data-favorites-panel="<?= tt_escape($key) ?>" role="tabpanel" hidden>
      <div class="favorites-panel-heading"><div><h2><?= tt_escape($section['label']) ?></h2><p><?= tt_escape($section['description']) ?></p></div></div>
      <div class="favorites-grid" data-favorites-grid>
        <?php foreach ($section['items'] as $item): ?>
          <article class="favorite-card" data-favorite-row>
            <a class="favorite-card-visual" href="<?= tt_escape($item['href']) ?>">
              <?php if ($key === 'folder'): ?>
                <span class="favorite-folder-collage <?= empty($item['images']) ? 'is-empty' : '' ?>"><?php foreach ($item['images'] as $image): ?><img src="<?= tt_escape($image) ?>" alt="" loading="lazy"><?php endforeach; ?><?php if (empty($item['images'])): ?><i aria-hidden="true">▱</i><?php endif; ?></span>
              <?php elseif ($key === 'equipment'): ?>
                <span class="equipment-photo equipment-<?= tt_escape($item['visual']) ?>"><i></i><b></b><em><?= tt_escape($item['subtitle']) ?></em></span>
              <?php elseif ($key === 'project' && empty($item['image'])): ?>
                <span class="favorite-project-art project-thumb-<?= tt_escape($item['visual']) ?>"><i></i></span>
              <?php elseif (!empty($item['image'])): ?>
                <img src="<?= tt_escape($item['image']) ?>" alt="<?= tt_escape($item['title']) ?>" loading="lazy">
              <?php else: ?>
                <span class="favorite-generic-art" aria-hidden="true"><?= tt_escape($section['icon']) ?></span>
              <?php endif; ?>
            </a>
            <div class="favorite-card-copy"><small><?= tt_escape($item['subtitle']) ?></small><h3><a href="<?= tt_escape($item['href']) ?>"><?= tt_escape($item['title']) ?></a></h3><p><?= tt_escape($item['meta']) ?></p></div>
            <?php if ($key !== 'folder'): ?><button class="favorite-remove" type="button" data-remove-favorite data-entity-type="<?= tt_escape($key) ?>" data-entity-id="<?= tt_escape($item['id']) ?>" aria-label="Удалить из избранного" title="Удалить из избранного">♥</button><?php else: ?><a class="favorite-open" href="<?= tt_escape($item['href']) ?>" aria-label="Открыть папку">→</a><?php endif; ?>
          </article>
        <?php endforeach; ?>
      </div>
      <section class="favorites-empty empty-state" data-panel-empty <?= $section['items'] !== [] ? 'hidden' : '' ?>><span class="empty-icon"><?= tt_escape($section['icon']) ?></span><h2>В разделе пока ничего нет</h2><p><?= $key === 'folder' ? 'Создайте первую папку в медиатеке и добавьте в неё плитку.' : 'Нажмите на сердце у подходящего объекта — он появится здесь.' ?></p><a class="button button-secondary" href="<?= tt_escape(tt_url($sectionRoutes[$key])) ?>">Перейти в раздел</a></section>
    </section>
  <?php endforeach; ?>
</section>
<script src="/shared/js/favorites.js?v=20260926-1" defer></script>
<?php endif; ?>
