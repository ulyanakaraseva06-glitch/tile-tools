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
    $statement = tt_pdo()->prepare('SELECT entity_type, entity_id, created_at FROM tt_favorite_items WHERE user_id = ? ORDER BY created_at DESC');
    $statement->execute([(int) $favoritesUser['id']]);
    $favoriteRows = $statement->fetchAll();
    $typeLabels = ['tile' => 'Плитка', 'equipment' => 'Оборудование', 'project' => 'Проект', 'media' => 'Медиафайл', 'service' => 'Услуга'];
    $routeByType = ['tile' => tt_url('media'), 'equipment' => tt_url('equipment'), 'project' => tt_url('projects'), 'media' => tt_url('media'), 'service' => tt_url('services')];
    $nameQueries = [
        'tile' => tt_pdo()->prepare('SELECT COALESCE(short_name, name) FROM tt_catalog_tiles WHERE id = ? LIMIT 1'),
        'equipment' => tt_pdo()->prepare('SELECT name FROM tt_equipment_items WHERE id = ? LIMIT 1'),
        'project' => tt_pdo()->prepare('SELECT title FROM tt_projects WHERE id = ? AND owner_user_id = ? LIMIT 1'),
    ];
    foreach ($favoriteRows as &$favoriteRow) {
        $type = (string) $favoriteRow['entity_type'];
        $name = '';
        if (isset($nameQueries[$type])) {
            $parameters = $type === 'project' ? [$favoriteRow['entity_id'], (int) $favoritesUser['id']] : [$favoriteRow['entity_id']];
            $nameQueries[$type]->execute($parameters);
            $name = (string) ($nameQueries[$type]->fetchColumn() ?: '');
        }
        $favoriteRow['display_name'] = $name !== '' ? $name : (string) $favoriteRow['entity_id'];
    }
    unset($favoriteRow);
?>
<section class="favorites-page" data-favorites-page>
  <header class="page-heading"><div><p class="eyebrow">Ваш аккаунт</p><h1>Избранное</h1><p>Один личный список для материалов, оборудования, проектов и услуг.</p></div><b><?= count($favoriteRows) ?></b></header>
  <?php if ($favoriteRows === []): ?>
    <section class="empty-state"><span class="empty-icon">♡</span><h2>Сохранённых объектов пока нет</h2><p>Нажмите на сердце возле плитки, оборудования или проекта.</p></section>
  <?php else: ?>
    <div class="favorites-account-list panel-card">
      <?php foreach ($favoriteRows as $favorite): ?>
        <article data-favorite-row>
          <span class="favorite-kind"><?= tt_escape($typeLabels[$favorite['entity_type']] ?? $favorite['entity_type']) ?></span>
          <a href="<?= tt_escape($routeByType[$favorite['entity_type']] ?? tt_url('favorites')) ?>"><?= tt_escape($favorite['display_name']) ?></a>
          <time><?= tt_escape((new DateTimeImmutable((string) $favorite['created_at']))->format('d.m.Y H:i')) ?></time>
          <button type="button" data-remove-favorite data-entity-type="<?= tt_escape((string) $favorite['entity_type']) ?>" data-entity-id="<?= tt_escape((string) $favorite['entity_id']) ?>" aria-label="Удалить из избранного">×</button>
        </article>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>
<script src="/shared/js/favorites.js?v=20260924-1" defer></script>
<?php endif; ?>
