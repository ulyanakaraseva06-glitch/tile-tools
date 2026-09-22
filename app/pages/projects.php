<section class="projects-page" data-projects-page>
  <aside class="projects-sidebar panel-card" aria-label="Разделы проектов">
    <h2>Проекты</h2>
    <nav class="projects-nav">
      <button class="is-active" type="button" data-project-view="all"><span>▱</span>Все проекты <b data-project-count="all">0</b></button>
      <button type="button" data-project-view="active"><span>◷</span>В работе <b data-project-count="active">0</b></button>
      <button type="button" data-project-view="done"><span>✓</span>Завершённые <b data-project-count="done">0</b></button>
      <button type="button" data-project-view="favorite"><span>♡</span>Избранные <b data-project-count="favorite">0</b></button>
      <button type="button" data-project-view="archived"><span>▣</span>Архив <b data-project-count="archived">0</b></button>
    </nav>
    <button class="button button-primary projects-new-side" type="button" data-new-project>＋ Новый проект</button>
    <div class="projects-help"><span>◉</span><div><strong>Нужна помощь?</strong><small>Проект сохраняет состояние сервиса и позволяет продолжить работу.</small></div></div>
  </aside>

  <section class="projects-content">
    <header class="projects-heading">
      <div><h1>Проекты</h1><p>Управляйте визуализациями, расчётами и PDF-документами в одном месте.</p></div>
      <button class="button button-primary" type="button" data-new-project>＋ Новый проект</button>
    </header>
    <div class="projects-toolbar">
      <label class="projects-search"><span>⌕</span><input type="search" placeholder="Поиск по названию проекта…" data-project-search></label>
      <select class="input" data-project-status><option value="">Все статусы</option><option value="draft">Черновик</option><option value="active">В работе</option><option value="done">Завершён</option><option value="archived">Архив</option></select>
      <select class="input" data-project-type><option value="">Все типы</option><option value="visualization">Сравни плитку</option><option value="calculation">Посчитай плитку</option><option value="pdf">PDF и документы</option></select>
      <select class="input" data-project-sort><option value="updated-desc">По дате (сначала новые)</option><option value="updated-asc">По дате (сначала старые)</option><option value="title">По названию</option></select>
    </div>
    <div class="projects-table-wrap panel-card">
      <div class="projects-table-head"><span>Проект</span><span>Сервис</span><span>Дата изменения</span><span>Содержимое</span><span>Статус</span><span>Действия</span></div>
      <div data-project-list></div>
      <div class="projects-empty" data-project-empty hidden><span>▱</span><h2>Проекты не найдены</h2><p>Создайте работу в одном из сервисов или измените параметры поиска.</p><button class="button button-primary" type="button" data-new-project>Создать проект</button></div>
      <footer class="projects-table-footer"><span data-project-summary>Показано 0 проектов</span><div><button type="button" disabled>‹</button><button class="is-active" type="button">1</button><button type="button" disabled>›</button></div></footer>
    </div>
  </section>

  <aside class="projects-rail" aria-label="Полезная информация">
    <article class="projects-promo panel-card"><small>НОВАЯ КОЛЛЕКЦИЯ</small><div class="projects-promo-art marble"></div><h2>Материалы для вашего проекта</h2><p>Добавляйте плитку из общей медиатеки и продолжайте работу в любом модуле.</p><a class="button button-secondary" href="<?= tt_url('media') ?>">Открыть медиатеку →</a></article>
    <article class="projects-tip panel-card"><span>✦</span><div><h2>Все работы в одном месте</h2><p>Статус задаёт пользователь. Кнопка «Вернуться к работе» откроет нужный сервис и восстановит сохранённое состояние.</p></div></article>
  </aside>
</section>

<dialog class="projects-dialog" data-project-dialog>
  <button class="dialog-close" type="button" data-project-dialog-close aria-label="Закрыть">×</button>
  <h2>Новый проект</h2><p>Выберите сервис, в котором хотите начать работу.</p>
  <div class="projects-service-picker">
    <a href="<?= tt_url('visualizer') ?>"><span>◩</span><strong>Сравни плитку</strong><small>Создать визуализацию интерьера</small></a>
    <a href="<?= tt_url('calculator') ?>"><span>⊞</span><strong>Посчитай плитку</strong><small>Создать расчёт и раскладку</small></a>
    <a href="<?= tt_url('pdf') ?>"><span>▤</span><strong>PDF и документы</strong><small>Создать документ или презентацию</small></a>
  </div>
</dialog>
<script src="/shared/js/projects.js" defer></script>
