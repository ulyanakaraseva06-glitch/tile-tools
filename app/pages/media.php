<?php $mediaUser = tt_current_user(); $mediaIsAdmin = ($mediaUser['role'] ?? '') === 'admin'; ?>
<section class="page-heading media-heading">
  <div><p class="eyebrow">Единый каталог материалов</p><h1>Медиатека</h1><p>Все плитки из «Сравни плитку» доступны здесь, в расчёте и в PDF. Избранное синхронизируется между сервисами.</p></div>
  <div class="media-heading-actions"><span class="badge" id="media-total">Загрузка каталога…</span><?php if ($mediaIsAdmin): ?><button class="button button-primary" id="media-admin-add" type="button">＋ Добавить товар</button><?php endif; ?></div>
</section>
<section class="media-catalog" data-media-catalog>
  <aside class="panel-card media-sidebar"><h2>Мои подборки</h2><button class="media-nav-button is-active" type="button" data-folder="all"><span>▦</span>Все материалы <b id="media-all-count">0</b></button><button class="media-nav-button" type="button" data-folder="favorites"><span>♡</span>Избранное <b id="media-favorite-count">0</b></button><div class="media-folder-heading"><strong>Папки</strong><button type="button" id="media-add-folder" title="Создать папку">＋</button></div><div class="media-folder-list" id="media-folders"></div><p class="media-sidebar-note">Создавайте подборки «Кухня», «Ванная» или любые другие. После входа они сохраняются в аккаунте.</p></aside>
  <div class="media-content"><div class="media-search-row"><label class="media-search"><span>⌕</span><input id="media-search" type="search" placeholder="Поиск по названию, бренду или коллекции"></label><button class="button button-primary" id="media-search-button" type="button">Найти</button></div><div class="media-filter-row"><select class="input" id="media-brand"><option value="">Все бренды</option></select><select class="input" id="media-color"><option value="">Все цвета</option></select><select class="input" id="media-size"><option value="">Все размеры</option></select><select class="input" id="media-surface"><option value="">Все поверхности</option></select><select class="input" id="media-design"><option value="">Все дизайны</option></select><button class="filter-reset" id="media-reset" type="button">↻ Сбросить</button></div><div class="media-result-row"><p>Найдено: <strong id="media-result-count">0</strong></p><span id="media-active-caption">Все материалы</span></div><div class="media-tile-grid" id="media-grid" aria-live="polite"></div></div>
</section>
<dialog class="media-dialog" id="media-folder-dialog"><form method="dialog" id="media-folder-form"><button class="dialog-close" value="cancel" aria-label="Закрыть">×</button><h2>Новая папка</h2><p>Название увидите только вы.</p><label>Название<input class="input" id="media-folder-name" maxlength="120" required placeholder="Например, Ванная"></label><button class="button button-primary" value="default" type="submit">Создать папку</button></form></dialog>
<dialog class="media-dialog" id="media-add-dialog"><button class="dialog-close" type="button" data-close-folder-picker aria-label="Закрыть">×</button><h2>Добавить в папку</h2><p id="media-add-tile-name"></p><div class="media-folder-picker" id="media-folder-picker"></div></dialog>
<?php if ($mediaIsAdmin): ?>
<dialog class="media-dialog media-admin-dialog" id="media-admin-dialog">
  <button class="dialog-close" type="button" data-close-admin-tile aria-label="Закрыть">×</button>
  <h2>Новая плитка</h2>
  <p>Товар сразу появится в общей медиатеке и будет доступен во всех сервисах.</p>
  <form id="media-admin-form" enctype="multipart/form-data">
    <input type="hidden" name="csrf" value="<?= tt_escape(tt_csrf_token()) ?>">
    <label>Название<input class="input" name="name" maxlength="255" required placeholder="Например, Calacatta Gold"></label>
    <div class="media-admin-fields">
      <label>Бренд<input class="input" name="brand" maxlength="160" placeholder="Kerama Marazzi"></label>
      <label>Артикул<input class="input" name="article" maxlength="120" placeholder="KM-6001"></label>
      <label>Цвет<input class="input" name="color" maxlength="120" placeholder="Белый"></label>
      <label>Размер<input class="input" name="size" maxlength="120" placeholder="60x60"></label>
      <label>Поверхность<input class="input" name="surface" maxlength="120" placeholder="Матовая"></label>
      <label>Дизайн<input class="input" name="design" maxlength="120" placeholder="Мрамор"></label>
    </div>
    <label>Основной цвет<input class="input media-color-input" name="hex" type="color" value="#E7E3DE"></label>
    <label>Изображение<input class="input" name="image" type="file" accept="image/jpeg,image/png,image/webp" required><small>JPEG, PNG или WebP, не более 25 МБ.</small></label>
    <p class="media-admin-error" id="media-admin-error" role="alert" hidden></p>
    <button class="button button-primary" type="submit">Добавить в медиатеку</button>
  </form>
</dialog>
<?php endif; ?>
<script src="/shared/js/media.js" defer></script>
