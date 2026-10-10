<?php $mediaUser = tt_current_user(); $mediaIsAdmin = ($mediaUser['role'] ?? '') === 'admin'; ?>
<section class="media-catalog" data-media-catalog>
  <aside class="panel-card media-sidebar">
    <div class="media-sidebar-tabs" role="tablist" aria-label="Панель медиатеки">
      <button class="is-active" type="button" role="tab" aria-selected="true" data-media-panel="filters">Фильтрация</button>
      <button type="button" role="tab" aria-selected="false" data-media-panel="folders">Папки</button>
    </div>
    <section class="media-side-panel is-active" data-media-panel-content="filters">
      <div class="media-filter-heading"><h2>Фильтрация</h2><button class="filter-reset" id="media-reset" type="button">↻ Сбросить</button></div>
      <label class="media-sidebar-search"><span aria-hidden="true">⌕</span><input id="media-search" type="search" placeholder="Поиск по названию, бренду или коллекции"></label>
      <div class="media-sidebar-filters" aria-label="Параметры фильтрации">
        <section class="media-filter-choice" data-media-filter="brand" data-facet="brands"><strong>Бренд</strong><div class="media-filter-options"></div></section>
        <section class="media-filter-choice" data-media-filter="colors" data-facet="colors"><strong>Цвет</strong><div class="media-filter-options"></div></section>
        <section class="media-filter-choice" data-media-filter="sizes" data-facet="sizes"><strong>Размер</strong><div class="media-filter-options"></div></section>
        <section class="media-filter-choice" data-media-filter="surfaces" data-facet="surfaces"><strong>Поверхность</strong><div class="media-filter-options"></div></section>
        <section class="media-filter-choice" data-media-filter="designs" data-facet="designs"><strong>Дизайн</strong><div class="media-filter-options"></div></section>
      </div>
      <div class="media-filter-footer"><span class="badge" id="media-total">Загрузка…</span><?php if ($mediaIsAdmin): ?><button class="button button-primary" id="media-admin-add" type="button">＋ Добавить</button><?php endif; ?></div>
      <button class="media-topbar-search-button" id="media-search-button" type="button" hidden>Найти</button>
    </section>
    <section class="media-side-panel" data-media-panel-content="folders" hidden>
      <h2>Мои подборки</h2>
      <button class="media-nav-button is-active" type="button" data-folder="all"><span>▦</span>Все материалы <b id="media-all-count">0</b></button>
      <button class="media-nav-button" type="button" data-folder="favorites"><span>♡</span>Избранное <b id="media-favorite-count">0</b></button>
      <div class="media-folder-heading"><strong>Папки</strong><button type="button" id="media-add-folder" title="Создать папку">＋</button></div>
      <div class="media-folder-list" id="media-folders"></div>
      <p class="media-sidebar-note">Создавайте подборки «Кухня», «Ванная» или любые другие. После входа они сохраняются в аккаунте.</p>
    </section>
  </aside>
  <div class="media-content"><div class="media-result-row"><p>Найдено: <strong id="media-result-count">0</strong></p><span id="media-active-caption">Все материалы</span></div><div class="media-tile-grid" id="media-grid" aria-live="polite"></div></div>
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
<script src="/shared/js/media.js?v=20261010-2" defer></script>
