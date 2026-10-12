<?php if (!tt_current_user()): ?>
<section class="account-required panel-card">
  <span aria-hidden="true">⊟</span><h1>Проекты сохраняются в аккаунте</h1>
  <p>Войдите или зарегистрируйтесь, чтобы работы из всех сервисов были доступны только вам и открывались на другом компьютере.</p>
  <div><a class="button button-primary" href="/auth/login.php">Войти</a><a class="button button-secondary" href="/auth/register.php">Зарегистрироваться</a></div>
</section>
<?php else: ?>
<section class="projects-page" data-projects-page>
  <aside class="projects-sidebar panel-card" aria-label="Разделы проектов">
    <div class="projects-sidebar-tabs" role="tablist" aria-label="Панель проектов">
      <button class="is-active" type="button" role="tab" aria-selected="true" data-project-panel="filters">Фильтрация</button>
      <button type="button" role="tab" aria-selected="false" data-project-panel="folders">Папки</button>
    </div>
    <section class="projects-side-panel" data-project-panel-content="filters">
      <div class="projects-filter-heading"><h2>Фильтрация</h2><button class="filter-reset" type="button" data-project-filter-reset>↻ Сбросить</button></div>
      <label class="projects-sidebar-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Поиск по названию проекта" data-project-search></label>
      <div class="projects-sidebar-filters">
        <label><span>Статус</span><select class="input" data-project-status><option value="">Все статусы</option><option value="draft">Черновик</option><option value="active">В работе</option><option value="done">Завершён</option><option value="archived">Архив</option></select></label>
        <label><span>Сервис</span><select class="input" data-project-type><option value="">Все сервисы</option><option value="visualization">Сравни плитку</option><option value="calculation">Посчитай плитку</option><option value="pdf">PDF и документы</option></select></label>
        <label class="projects-sort-filter"><span>Сортировка</span><select class="input" data-project-sort><option value="updated-desc">Сначала новые</option><option value="updated-asc">Сначала старые</option><option value="title">По названию</option></select></label>
      </div>
    </section>
    <section class="projects-side-panel" data-project-panel-content="folders" hidden>
      <h2>Мои проекты</h2>
      <nav class="projects-nav">
        <button class="is-active" type="button" data-project-view="all"><span>▱</span>Все проекты <b data-project-count="all">0</b></button>
        <button type="button" data-project-view="favorite"><span>♡</span>Избранные <b data-project-count="favorite">0</b></button>
      </nav>
      <div class="projects-folder-heading"><span>РАЗДЕЛЫ</span></div>
      <nav class="projects-nav projects-folder-nav">
        <button type="button" data-project-view="active"><span>◷</span>В работе <b data-project-count="active">0</b></button>
        <button type="button" data-project-view="done"><span>✓</span>Завершённые <b data-project-count="done">0</b></button>
        <button type="button" data-project-view="archived"><span>▣</span>Архив <b data-project-count="archived">0</b></button>
      </nav>
      <p class="projects-sidebar-note">Разделите сохранённые работы по этапу, чтобы быстрее находить нужный проект.</p>
    </section>
    <button class="button button-primary projects-new-side" type="button" data-new-project>＋ Новый проект</button>
    <div class="projects-help"><span>◉</span><div><strong>Нужна помощь?</strong><small>Проект сохраняет состояние сервиса и позволяет продолжить работу.</small></div></div>
  </aside>

  <section class="projects-content">
    <div class="projects-table-wrap panel-card">
      <div class="projects-table-head"><span>Проект</span><span>Сервис</span><span>Дата изменения</span><span>Содержимое</span><span>Статус</span><span>Действия</span></div>
      <div data-project-list></div>
      <div class="projects-empty" data-project-empty hidden><span>▱</span><h2>Проекты не найдены</h2><p>Создайте работу в одном из сервисов или измените параметры поиска.</p><button class="button button-primary" type="button" data-new-project>Создать проект</button></div>
      <footer class="projects-table-footer"><span data-project-summary>Показано 0 проектов</span><div><button type="button" disabled>‹</button><button class="is-active" type="button">1</button><button type="button" disabled>›</button></div></footer>
    </div>
  </section>

  <aside class="projects-rail" aria-label="Полезная информация">
    <article class="service-ad-card" aria-label="Vilray Studio"><small>VILRAY STUDIO</small><strong>Нужна профессиональная подача проекта?</strong><span>Визуализации, каталоги и материалы для продаж.</span><a href="<?= tt_url('services') ?>">Перейти к услуге →</a></article>
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
<script src="/shared/js/projects.js?v=20261012-1" defer></script>
<?php endif; ?>
