<?php
declare(strict_types=1);

function tt_services_catalog(): array
{
    return [
        ['id' => 'interior-visualization', 'category' => 'visualization', 'title' => 'Интерьерная 3D-визуализация', 'short' => 'Реалистичные интерьеры с вашим продуктом для сайтов, каталогов и презентаций.', 'description' => 'Показываем ассортимент отделочных и фасадных материалов в реалистичных интерьерах и продуктовых сценах, чтобы покупателю было проще понять ценность товара.', 'price' => 'от 2 080 ₽ за ракурс', 'image' => '/services/pdf/placeholders/catalog/interior-3x4-bath-marble-v1.webp'],
        ['id' => 'exterior-visualization', 'category' => 'visualization', 'title' => 'Экстерьерная визуализация', 'short' => 'Визуальные материалы для фасадов, архитектуры и новых коллекций.', 'description' => 'Готовим экстерьерные сцены ещё до полноценного запуска продаж, появления готовых образцов или масштабного производства.', 'price' => 'от 4 800 ₽ за проект', 'image' => '/source/sravni-plitku/images/renders/r5.jpg'],
        ['id' => 'product-visualization', 'category' => 'product', 'title' => 'Визуализация товара', 'short' => 'Предметные 3D-изображения серий SKU, цветов, размеров и модификаций.', 'description' => 'Создаём изображения товаров на нейтральном фоне для сайтов, каталогов, презентаций, интернет-магазинов и карточек товара.', 'price' => 'от 1 380 ₽', 'image' => '/services/pdf/placeholders/catalog/elements/tile-60x60-marble-floating-v1.webp'],
        ['id' => 'catalogs-presentations', 'category' => 'catalogs', 'title' => 'Каталоги и презентации', 'short' => 'Коммерческие презентации, продуктовые каталоги, lookbook и брошюры.', 'description' => 'Разрабатываем понятные инструменты для переговоров и отдела продаж: структуру, дизайн, тексты, продуктовые страницы и итоговый PDF.', 'price' => 'от 12 800 ₽', 'image' => '/services/pdf/landing/app-screen-export.webp'],
        ['id' => 'infographics', 'category' => 'marketplaces', 'title' => 'Инфографика', 'short' => 'Карточки товара, схемы, размеры, преимущества и сценарии применения.', 'description' => 'Показываем характеристики, комплектацию, сравнения и преимущества продукта в понятной визуальной форме для маркетплейсов, сайтов и презентаций.', 'price' => 'от 2 800 ₽', 'image' => '/services/pdf/landing/app-screen-panel.webp'],
        ['id' => 'video-motion', 'category' => 'video', 'title' => 'Видео и motion-дизайн', 'short' => 'Имиджевые ролики, продуктовое видео, 3D-анимация и motion design.', 'description' => 'Готовим видео для социальных сетей, рекламы, презентаций и выставок: от короткой продуктовой демонстрации до имиджевого ролика.', 'price' => 'от 7 800 ₽', 'image' => '/services/pdf/landing/app-screen-video.webp'],
        ['id' => 'websites-digital', 'category' => 'digital', 'title' => 'Сайты и digital-инструменты', 'short' => 'Сайты, лендинги, конфигураторы и личные кабинеты для дилеров.', 'description' => 'Разрабатываем сайт как рабочий инструмент бизнеса: с каталогом, продуктовой подачей, заявками, конфигураторами и сценариями для менеджеров.', 'price' => 'от 38 000 ₽', 'image' => '/services/pdf/landing/app-screen-hero.webp'],
    ];
}

function tt_find_service(string $id): ?array
{
    foreach (tt_services_catalog() as $service) {
        if ($service['id'] === $id) return $service;
    }
    return null;
}
