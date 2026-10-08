<?php
require_once dirname(__DIR__, 2) . '/shared/services.php';
$services = tt_services_catalog();
$categories = [
    '' => ['★', 'Все услуги'], 'visualization' => ['▧', 'Визуализация'], 'product' => ['◇', 'Визуализация товара'],
    'catalogs' => ['▤', 'Каталоги и презентации'], 'marketplaces' => ['▣', 'Инфографика'], 'video' => ['▶', 'Видео и motion'], 'digital' => ['▱', 'Сайты и digital'],
];
?>
<section class="vilray-services" data-services-page>
  <main class="services-content">
    <div class="vilray-service-grid" data-service-list>
      <?php foreach ($services as $service): ?><article class="vilray-service-card" data-service-card data-category="<?= tt_escape($service['category']) ?>">
        <img src="<?= tt_escape($service['image']) ?>" alt="<?= tt_escape($service['title']) ?>" loading="lazy">
        <div><h2><?= tt_escape($service['title']) ?></h2><p><?= tt_escape($service['short']) ?></p><footer><strong><?= tt_escape($service['price']) ?></strong><button type="button" data-service-open="<?= tt_escape($service['id']) ?>" aria-label="Заказать <?= tt_escape($service['title']) ?>">→</button></footer></div>
      </article><?php endforeach; ?>
    </div>
  </main>

  <aside class="services-rail">
    <section class="services-filter-card panel-card">
      <div class="services-filter-heading"><h2>Категории услуг</h2></div>
      <label class="services-category-select">
        <span class="sr-only">Выберите категорию услуг</span>
        <select class="input" data-service-filter-select aria-label="Выберите категорию услуг">
          <?php foreach ($categories as $id => [$icon, $label]): ?><option value="<?= tt_escape($id === '' ? 'all' : $id) ?>"><?= tt_escape($label) ?></option><?php endforeach; ?>
        </select>
      </label>
    </section>
    <article class="service-ad-card" aria-label="Vilray Studio"><small>VILRAY STUDIO</small><strong>Нужна профессиональная подача проекта?</strong><span>Визуализации, каталоги и материалы для продаж.</span><a href="<?= tt_url('services') ?>">Перейти к услуге →</a></article>
    <section class="services-links-card panel-card">
      <a href="https://vilraystudio.ru/about.html" target="_blank" rel="noopener">▦ <span>О студии Vilray</span><b>›</b></a>
      <a href="https://vilraystudio.ru/portfolio.html" target="_blank" rel="noopener">▧ <span>Примеры работ</span><b>›</b></a>
      <a href="https://vilraystudio.ru/faq.html" target="_blank" rel="noopener">? <span>Частые вопросы</span><b>›</b></a>
    </section>
  </aside>

</section>

<dialog class="service-dialog" data-service-dialog><button class="dialog-close" type="button" data-service-close aria-label="Закрыть">×</button><div data-service-dialog-content></div></dialog>
<script type="application/json" id="services-data"><?= json_encode($services, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
<script src="/shared/js/services.js?v=20261008-1" defer></script>
