<section class="hero-panel">
  <div>
    <p class="eyebrow">Единая рабочая среда</p>
    <h1>Плитка, проекты, документы и медиатека — в одном сервисе</h1>
    <p class="lead">Оболочка связывает исходные приложения без изменения их внутренней логики. Общие проекты, медиатека и избранное подключаются через отдельные адаптеры.</p>
    <div class="button-row">
      <a class="button button-primary" href="<?= tt_url('projects') ?>">Открыть проекты</a>
      <a class="button button-secondary" href="<?= tt_url('media') ?>">Перейти в медиатеку</a>
    </div>
  </div>
  <aside class="hero-status" aria-label="Статус переноса">
    <h2>Статус разработки</h2>
    <ul class="status-list">
      <li><span class="status-dot done"></span>Общая оболочка и маршруты</li>
      <li><span class="status-dot done"></span>Модель проектов, избранного и медиатеки</li>
      <li><span class="status-dot done"></span>Подключение трёх исходных приложений</li>
      <li><span class="status-dot progress"></span>Parity-check и адаптеры общих данных</li>
    </ul>
  </aside>
</section>

<section class="module-grid" aria-label="Разделы сервиса">
  <?php $cards = [
      ['visualizer', 'Сравни плитку', 'Работа с интерьерами, зонами и подбором плитки.'],
      ['calculator', 'Посчитай плитку', 'План помещения, проёмы, раскладка и расчёт.'],
      ['pdf', 'PDF и документы', 'Шаблоны, страницы, предпросмотр и экспорт PDF.'],
      ['media', 'Медиатека', 'Общие и личные материалы с квотой 100 МБ.'],
      ['projects', 'Проекты', 'Единый список, переносимые файлы и связи с материалами.'],
      ['services', 'Услуги Vilray', 'Визуализации, каталоги, фото, 3D и лид-формы.'],
  ]; foreach ($cards as [$key, $cardTitle, $description]): ?>
    <a class="module-card" href="<?= tt_url($key) ?>"><span class="module-icon" aria-hidden="true">✦</span><h2><?= tt_escape($cardTitle) ?></h2><p><?= tt_escape($description) ?></p><span class="card-link">Открыть →</span></a>
  <?php endforeach; ?>
</section>
