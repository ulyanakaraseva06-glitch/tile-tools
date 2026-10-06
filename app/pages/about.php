<?php
$aboutGallery = [
    ['/shared/images/home-interior-1600.webp', 'Сравнивайте плитку в реальных интерьерах'],
    ['/services/pdf/placeholders/catalog/interior-3x4-bath-marble-v1.webp', 'Показывайте коллекции в готовых сценах'],
    ['/source/sravni-plitku/images/renders/r5.jpg', 'Проверяйте разные варианты отделки'],
    ['/services/pdf/landing/app-screen-export.webp', 'Собирайте аккуратные документы и презентации'],
];
?>
<section class="about-workspace" data-about-page>
  <div class="about-gallery panel-card">
    <div class="about-gallery-stage">
      <?php foreach ($aboutGallery as $index => [$image, $caption]): ?>
        <figure class="about-slide <?= $index === 0 ? 'is-active' : '' ?>" data-about-slide="<?= $index ?>">
          <img src="<?= tt_escape($image) ?>" alt="<?= tt_escape($caption) ?>" <?= $index === 0 ? '' : 'loading="lazy"' ?>>
          <figcaption><?= tt_escape($caption) ?></figcaption>
        </figure>
      <?php endforeach; ?>
      <button class="about-gallery-arrow about-gallery-prev" type="button" data-about-prev aria-label="Предыдущая фотография">‹</button>
      <button class="about-gallery-arrow about-gallery-next" type="button" data-about-next aria-label="Следующая фотография">›</button>
    </div>
    <div class="about-gallery-footer">
      <div class="about-gallery-dots" role="tablist" aria-label="Фотографии сервисов">
        <?php foreach ($aboutGallery as $index => [$image, $caption]): ?><button type="button" class="<?= $index === 0 ? 'is-active' : '' ?>" data-about-dot="<?= $index ?>" role="tab" aria-label="<?= tt_escape($caption) ?>" aria-selected="<?= $index === 0 ? 'true' : 'false' ?>"></button><?php endforeach; ?>
      </div>
      <span class="about-gallery-count" data-about-count>1 / <?= count($aboutGallery) ?></span>
    </div>
  </div>

  <aside class="about-faq panel-card">
    <div class="about-faq-heading"><span class="eyebrow">Вопросы и ответы</span><h1>Как работает Tile Tools</h1><p>Коротко о возможностях сервиса и о том, кому он помогает.</p></div>
    <div class="about-faq-list">
      <details open><summary>Что делает Tile Tools?</summary><p>Объединяет подбор плитки, проверку материалов в интерьере, расчёт раскладки, документы, проекты и общую медиатеку в одном рабочем пространстве.</p></details>
      <details><summary>Для кого создан сервис?</summary><p>Для дизайнеров, архитекторов, менеджеров салонов, производителей и клиентов, которым важно быстро показать и согласовать решение.</p></details>
      <details><summary>Зачем нужны разные сервисы?</summary><p>Каждый инструмент отвечает за свой этап: сравнить материал, посчитать количество, оформить результат в PDF или найти оборудование и услуги.</p></details>
      <details><summary>Что сохраняется между разделами?</summary><p>Избранные материалы, папки, проекты и загруженные файлы доступны из общего аккаунта и не теряются при переходе между сервисами.</p></details>
      <details><summary>Можно ли начать без подготовки?</summary><p>Да. Откройте «Сравни плитку», выберите интерьер и материал — дальше сервис подскажет следующий шаг.</p></details>
    </div>
  </aside>
</section>
<script src="/shared/js/about.js?v=20261006-1" defer></script>
