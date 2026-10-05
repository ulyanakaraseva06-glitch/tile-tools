<?php $homeUser = tt_current_user(); ?>
<div class="home-page">
  <section class="home-hero">
    <div class="home-hero-copy">
      <p class="home-kicker"><span>✦</span> Всё для работы с плиткой в одном пространстве</p>
      <h1>От идеи интерьера<br>до готового проекта</h1>
      <p class="home-lead">Подбирайте плитку в реальных интерьерах, рассчитывайте раскладку и собирайте профессиональные PDF — быстрее, нагляднее и без переключения между разными программами.</p>
      <div class="home-actions">
        <a class="button button-primary home-primary" href="<?= tt_url('visualizer') ?>">Начать подбор плитки <span>→</span></a>
        <a class="button button-secondary" href="<?= tt_url('projects') ?>">Открыть проекты</a>
      </div>
      <div class="home-trust">
        <span><b>48</b> моделей в медиатеке</span>
        <span><b>3</b> профессиональных инструмента</span>
        <span><b>1</b> общий проект и аккаунт</span>
      </div>
    </div>
    <div class="home-hero-visual" aria-label="Пример визуализации интерьера">
      <picture>
        <img src="/shared/images/home-interior-4000.webp?v=20260929-1" alt="Интерьер с подобранной плиткой" width="4000" height="3000" fetchpriority="high" decoding="async">
      </picture>
      <div class="home-floating-card home-floating-card-top"><span>✓</span><div><strong>Общая медиатека</strong><small>Материалы доступны в каждом сервисе</small></div></div>
      <div class="home-floating-card home-floating-card-bottom"><i></i><i></i><i></i><div><strong>Проект сохранён</strong><small>Можно продолжить с любого этапа</small></div></div>
    </div>
  </section>

  <section class="home-benefits" aria-label="Преимущества Tile Tools">
    <article><span>◈</span><div><h2>Всё связано</h2><p>Одна медиатека, единое избранное и проекты для всех инструментов.</p></div></article>
    <article><span>⌁</span><div><h2>Наглядный результат</h2><p>Покажите клиенту материал в интерьере ещё до покупки и укладки.</p></div></article>
    <article><span>◫</span><div><h2>Точные расчёты</h2><p>Планируйте размеры, раскладку и количество плитки без ручных таблиц.</p></div></article>
    <article><span>✦</span><div><h2>Готово к презентации</h2><p>Собирайте результат в аккуратный PDF для клиента или команды.</p></div></article>
  </section>

  <section class="home-section">
    <header class="home-section-heading"><div><p class="eyebrow">Рабочий процесс</p><h2>Три инструмента — один понятный путь</h2></div><p>Начните с любого этапа. Выбранные материалы и сохранённые работы останутся в вашем аккаунте.</p></header>
    <div class="home-tools">
      <a class="home-tool-card home-tool-large" href="<?= tt_url('visualizer') ?>">
        <picture>
          <img src="/shared/images/home-interior-4000.webp?v=20260929-1" alt="Сравнение плитки в интерьере" width="4000" height="3000" loading="lazy" decoding="async">
        </picture>
        <span class="home-tool-number">01</span>
        <div><p>Визуализация</p><h3>Сравни плитку</h3><span>Примерьте материалы к интерьеру и сравните варианты в нескольких зонах.</span><b>Перейти к подбору →</b></div>
      </a>
      <a class="home-tool-card" href="<?= tt_url('calculator') ?>">
        <img src="/services/pdf/placeholders/bathroom.svg" alt="Расчёт плитки для помещения" loading="lazy">
        <span class="home-tool-number">02</span>
        <div><p>Планирование</p><h3>Посчитай плитку</h3><span>Нарисуйте помещение, задайте размеры и получите схему раскладки.</span><b>Создать расчёт →</b></div>
      </a>
      <a class="home-tool-card" href="<?= tt_url('pdf') ?>">
        <img src="/services/pdf/landing/app-screen-export.webp" alt="Редактор PDF-документов" loading="lazy">
        <span class="home-tool-number">03</span>
        <div><p>Презентация</p><h3>Плитка PDF</h3><span>Соберите предложение, каталог или презентацию из готовых шаблонов.</span><b>Создать документ →</b></div>
      </a>
    </div>
  </section>

  <section class="home-steps">
    <div class="home-steps-copy"><p class="eyebrow">Просто начать</p><h2>От выбора плитки до презентации клиенту</h2><p>Tile Tools сохраняет рабочий контекст между разделами: понравившиеся материалы, проекты и документы всегда под рукой.</p><a href="<?= tt_url('media') ?>">Посмотреть медиатеку <span>→</span></a></div>
    <ol>
      <li><span>1</span><div><strong>Выберите материал</strong><p>Используйте поиск, фильтры, избранное и собственные папки.</p></div></li>
      <li><span>2</span><div><strong>Проверьте в проекте</strong><p>Посмотрите плитку в интерьере или создайте точную схему помещения.</p></div></li>
      <li><span>3</span><div><strong>Сохраните результат</strong><p>Вернитесь к работе позже или подготовьте PDF для клиента.</p></div></li>
    </ol>
  </section>

  <section class="home-cta">
    <div><p>Готовы начать?</p><h2><?= $homeUser ? 'Продолжите работу над своим проектом' : 'Создайте свой первый проект прямо сейчас' ?></h2><span>Все основные инструменты уже доступны в одном сервисе.</span></div>
    <div class="home-actions"><a class="button button-primary home-primary" href="<?= $homeUser ? tt_url('projects') : '/auth/register.php' ?>"><?= $homeUser ? 'Мои проекты' : 'Начать пользоваться' ?> <span>→</span></a><a class="button home-cta-secondary" href="<?= tt_url('services') ?>">Услуги студии</a></div>
  </section>
</div>
