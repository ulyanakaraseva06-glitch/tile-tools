<?php
require_once dirname(__DIR__, 2) . '/shared/services.php';
$services = tt_services_catalog();
$categories = [
    '' => ['★', 'Все услуги'], 'visualization' => ['▧', 'Визуализация'], 'product' => ['◇', 'Визуализация товара'],
    'catalogs' => ['▤', 'Каталоги и презентации'], 'marketplaces' => ['▣', 'Инфографика'], 'video' => ['▶', 'Видео и motion'], 'digital' => ['▱', 'Сайты и digital'],
];
?>
<section class="vilray-services" data-services-page>
  <aside class="services-sidebar panel-card">
    <h2>Услуги</h2>
    <nav class="services-nav" aria-label="Категории услуг">
      <?php foreach ($categories as $id => [$icon, $label]): ?><button type="button" class="<?= $id === '' ? 'is-active' : '' ?>" data-service-filter="<?= tt_escape($id === '' ? 'all' : $id) ?>"><span><?= tt_escape($icon) ?></span><?= tt_escape($label) ?></button><?php endforeach; ?>
    </nav>
    <hr>
    <a href="https://vilraystudio.ru/about.html" target="_blank" rel="noopener">▦ <span>О студии Vilray</span></a>
    <a href="https://vilraystudio.ru/portfolio.html" target="_blank" rel="noopener">▧ <span>Примеры работ</span></a>
    <a href="https://vilraystudio.ru/faq.html" target="_blank" rel="noopener">? <span>Частые вопросы</span></a>
    <div class="vilray-sidebar-brand"><strong>VILRAY<br><small>STUDIO</small></strong><p>Визуально-цифровые решения для бизнеса в сфере дома, ремонта и строительства.</p><a href="https://vilraystudio.ru/" target="_blank" rel="noopener">Узнать больше →</a></div>
  </aside>

  <main class="services-content">
    <header class="services-heading"><div><p class="eyebrow">Услуги</p><h1>Профессиональный контент для ваших продаж</h1><p>3D-визуализация, каталоги, инфографика, видео и сайты — всё, что помогает показывать продукт, объяснять ценность и продавать.</p></div><div class="vilray-partner"><strong>VILRAY</strong><span>STUDIO</span><small>ПАРТНЁР TILE TOOLS<br>ПО ВИЗУАЛЬНОМУ КОНТЕНТУ</small></div></header>
    <div class="vilray-service-grid" data-service-list>
      <?php foreach ($services as $service): ?><article class="vilray-service-card" data-service-card data-category="<?= tt_escape($service['category']) ?>">
        <img src="<?= tt_escape($service['image']) ?>" alt="<?= tt_escape($service['title']) ?>" loading="lazy">
        <div><h2><?= tt_escape($service['title']) ?></h2><p><?= tt_escape($service['short']) ?></p><footer><strong><?= tt_escape($service['price']) ?></strong><button type="button" data-service-open="<?= tt_escape($service['id']) ?>" aria-label="Заказать <?= tt_escape($service['title']) ?>">→</button></footer></div>
      </article><?php endforeach; ?>
    </div>
  </main>

  <aside class="services-request panel-card">
    <div class="services-request-title"><span>⌁</span><h2>Передать проект<br>в студию Vilray</h2></div>
    <p>Расскажите о задаче — сохраним заявку и подготовим её к обработке менеджером.</p>
    <form data-service-form>
      <label>Какая услуга вас интересует?<select class="input" name="serviceId" required><option value="">Выберите услугу</option><?php foreach ($services as $service): ?><option value="<?= tt_escape($service['id']) ?>"><?= tt_escape($service['title']) ?></option><?php endforeach; ?></select></label>
      <label>Кратко опишите задачу<textarea class="input" name="message" rows="4" maxlength="5000" placeholder="Например: нужна визуализация новой коллекции в интерьере ванной комнаты..."></textarea></label>
      <label>Ваше имя<input class="input" name="name" required minlength="2" maxlength="160" placeholder="Алексей"></label>
      <label>Телефон, e-mail или Telegram<input class="input" name="contact" required minlength="3" maxlength="255" placeholder="+7 999 123-45-67 или @username"></label>
      <label class="services-consent"><input type="checkbox" required> <span>Согласен(а) с политикой обработки персональных данных.</span></label>
      <button class="button button-primary" type="submit">⌁ Отправить запрос</button>
      <small>Заявка сохраняется в Tile Tools и пока не отправляется во внешние сервисы.</small>
    </form>
    <article class="services-ad"><small>ПРИМЕР РАБОТЫ</small><div></div><strong>Визуальная система для продукта</strong><a href="https://vilraystudio.ru/portfolio.html" target="_blank" rel="noopener">Смотреть портфолио →</a></article>
  </aside>
</section>

<dialog class="service-dialog" data-service-dialog><button class="dialog-close" type="button" data-service-close aria-label="Закрыть">×</button><div data-service-dialog-content></div></dialog>
<script type="application/json" id="services-data"><?= json_encode($services, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
<script src="/shared/js/services.js" defer></script>
