import { placeholderImages, techIcons, style, styled, text, badge, image, iconRow, productCell, divider, features, template } from './shared';

export const catalogInteriorTemplates = [
  template('catalog_interior_sku_spread', 'catalog_interior', 'Каталог: интерьер + SKU-полоса', 'Крупный интерьер и нижняя полоса товарных позиций с артикулами.', placeholderImages.previewInteriorProducts, {
    heading: styled(text('heading', 'Заголовок', 'Интерьер и позиции', 'h1', { x: 7, y: 8, w: 45, h: 7 }), style.darkText),
    interior: styled(image('interior', 'Интерьер 16:9', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 7, y: 20, w: 86, h: 43 }), style.imageShadow),
    skuRule: divider('skuRule', { x: 7, y: 65.2, w: 86, h: 0.22 }),
    sample1: productCell('sample1', placeholderImages.tile60Stone, 8, 68, 14),
    sample2: productCell('sample2', placeholderImages.tile120Marble, 31, 68, 14),
    sample3: productCell('sample3', placeholderImages.tileWood, 54, 68, 14),
    sample4: productCell('sample4', placeholderImages.tile60Marble, 77, 68, 14),
    text1: styled(text('text1', 'SKU 1', 'ST-601\n60x60', 'small', { x: 8, y: 82, w: 14, h: 5.5 }), style.darkText),
    text2: styled(text('text2', 'SKU 2', 'MR-612\n60x120', 'small', { x: 31, y: 82, w: 14, h: 5.5 }), style.darkText),
    text3: styled(text('text3', 'SKU 3', 'WD-212\n20x120', 'small', { x: 54, y: 82, w: 14, h: 5.5 }), style.darkText),
    text4: styled(text('text4', 'SKU 4', 'MR-601\n60x60', 'small', { x: 77, y: 82, w: 14, h: 5.5 }), style.darkText)
  }),

  template('catalog_product_hero', 'catalog_interior', 'Каталог: интерьер и большая плита', 'Интерьер, крупный образец плитки, характеристики и зона под описание товара.', placeholderImages.previewProductHero, {
    interior: styled(image('interior', 'Интерьер 4:3', placeholderImages.catalogInteriorMarble, 'interior', '4:3', { x: 7, y: 8, w: 44, h: 33 }), style.imageShadow),
    label: styled(badge('label', 'Товар', { x: 59, y: 10, w: 16, h: 4.6 }), style.accentBadge),
    title: styled(text('title', 'Название товара', 'Linea Marmo Vein', 'h1', { x: 59, y: 20, w: 34, h: 8 }), style.darkText),
    description: styled(text('description', 'Описание', 'Керамогранит под светлый мрамор с мягким сатиновым рисунком.', 'body', { x: 59, y: 31, w: 34, h: 10 }), style.mutedText),
    product: styled(image('product', 'Крупный образец', placeholderImages.floatingMarble, 'product', '1:1', { x: 14, y: 53, w: 29, h: 21 }), style.imagePlain),
    techIcons: styled(iconRow('techIcons', 'Характеристики', { x: 55, y: 51, w: 38, h: 16 }, techIcons), style.whitePanel),
    specRule: divider('specRule', { x: 55, y: 70, w: 38, h: 0.22 }),
    materialText: styled(text('materialText', 'Материалы', 'Артикул MR-612\nФормат 60x120\nПоверхность сатин\nКрай ректифицированный', 'small', { x: 56, y: 74, w: 34, h: 15 }), style.darkText)
  }),

  template('catalog_interior_products_split', 'catalog_interior', 'Каталог: интерьер слева, позиции справа', 'Интерьерная подача и две товарные позиции справа с квадратными зонами под плитку.', placeholderImages.previewInteriorProducts, {
    interior: styled(image('interior', 'Интерьер 9:16', placeholderImages.catalogInteriorWood, 'interior', '9:16', { x: 7, y: 8, w: 34, h: 52 }), style.imageShadow),
    heading: styled(text('heading', 'Заголовок', 'Интерьерное решение', 'h1', { x: 49, y: 10, w: 35, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Страница связывает интерьерный образ с конкретными товарными позициями.', 'body', { x: 49, y: 21, w: 38, h: 10 }), style.mutedText),
    product1: productCell('product1', placeholderImages.tile120Stone, 49, 39),
    productText1: styled(text('productText1', 'Позиция 1', 'ST-612\n60x120 / матовая\nstone taupe', 'small', { x: 76, y: 40, w: 17, h: 10 }), style.darkText),
    product2: productCell('product2', placeholderImages.tile60Marble, 49, 63),
    productText2: styled(text('productText2', 'Позиция 2', 'MR-601\n60x60 / сатин\nсветлый мрамор', 'small', { x: 76, y: 64, w: 17, h: 10 }), style.darkText),
    quickIcons: styled(iconRow('quickIcons', 'Иконки', { x: 49, y: 82, w: 43, h: 10 }, [
      { id: 'split-size', iconId: 'size', label: 'Форматы', value: '3' },
      { id: 'split-wall', iconId: 'wall', label: 'Стены', value: 'да' },
      { id: 'split-floor', iconId: 'floor', label: 'Пол', value: 'да' }
    ]), style.softPanel)
  }),

  template('catalog_interiors_gallery', 'catalog_interior', 'Каталог: галерея интерьеров', 'Страница для нескольких интерьерных изображений и короткой привязки к материалам.', placeholderImages.previewInteriorProducts, {
    heading: styled(text('heading', 'Заголовок', 'Варианты применения', 'h1', { x: 7, y: 8, w: 42, h: 7 }), style.darkText),
    interior1: styled(image('interior1', 'Интерьер 16:9', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 7, y: 21, w: 40, h: 24 }), style.imageShadow),
    interior2: styled(image('interior2', 'Интерьер 4:3', placeholderImages.catalogInteriorDark, 'interior', '4:3', { x: 53, y: 21, w: 39, h: 24 }), style.imageShadow),
    interior3: styled(image('interior3', 'Интерьер 3:4', placeholderImages.catalogInteriorMarble, 'interior', '3:4', { x: 7, y: 55, w: 28, h: 34 }), style.imageShadow),
    sample: productCell('sample', placeholderImages.tile60Stone, 43, 62, 20),
    note: styled(text('note', 'Подпись', 'Один материал может работать в нескольких сценариях: пол, стены, санузел, общественная зона.', 'body', { x: 68, y: 62, w: 23, h: 14 }), style.mutedText)
  }),

  template('catalog_image_product_pair', 'catalog_interior', 'Каталог: интерьер + один товар', 'Функциональная страница с крупной интерьерной сценой и одной товарной позицией.', placeholderImages.previewInteriorProducts, {
    interior: styled(image('interior', 'Интерьер 16:9', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 7, y: 11, w: 54, h: 42 }), style.imageShadow),
    heading: styled(text('heading', 'Заголовок', 'Готовое решение', 'h1', { x: 67, y: 11, w: 24, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Один интерьерный образ и конкретная плитка для быстрого согласования.', 'body', { x: 67, y: 22, w: 24, h: 11 }), style.mutedText),
    product: productCell('product', placeholderImages.tile120Stone, 67, 42, 20),
    productText: styled(text('productText', 'Позиция', 'ST-612\\n60x120 / матовая\\nкерамогранит под камень', 'small', { x: 67, y: 58, w: 24, h: 8.4 }), style.darkText),
    productDivider: divider('productDivider', { x: 67, y: 70.2, w: 24, h: 0.22 }),
    icons: styled(iconRow('icons', 'Иконки', { x: 7, y: 74, w: 58, h: 9 }, [
      { id: 'pair-size', iconId: 'large-format', label: 'Формат', value: '60x120' },
      { id: 'pair-finish', iconId: 'matte', label: 'Финиш', value: 'матовый' },
      { id: 'pair-usage', iconId: 'floor', label: 'Зоны', value: 'пол / стены' }
    ]), style.softPanel),
    note: styled(text('note', 'Нижняя подпись', 'Подходит для первой страницы серии, где нужно показать интерьер и один ключевой артикул.', 'small', { x: 7, y: 86, w: 72, h: 5 }), style.mutedText)
  }),

  template('catalog_image_two_products', 'catalog_interior', 'Каталог: интерьер + две позиции', 'Интерьерная страница с двумя основными товарами и короткими техническими подписями.', placeholderImages.previewInteriorProducts, {
    interior: styled(image('interior', 'Интерьер 9:16', placeholderImages.catalogInteriorWood, 'interior', '9:16', { x: 7, y: 11, w: 37, h: 58 }), style.imageShadow),
    heading: styled(text('heading', 'Заголовок', 'Комплект материалов', 'h1', { x: 52, y: 11, w: 38, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Базовая плитка и акцентный материал в одной спокойной композиции.', 'body', { x: 52, y: 22, w: 38, h: 9 }), style.mutedText),
    product1: productCell('product1', placeholderImages.tile60Stone, 52, 39, 18),
    productText1: styled(text('productText1', 'Позиция 1', 'ST-601\\n60x60 / матовая\\nосновной пол', 'small', { x: 74, y: 40, w: 18, h: 10 }), style.darkText),
    product2: productCell('product2', placeholderImages.tileWood, 52, 64, 18),
    productText2: styled(text('productText2', 'Позиция 2', 'WD-212\\n20x120 / матовая\\nдеревянный акцент', 'small', { x: 74, y: 65, w: 18, h: 10 }), style.darkText),
    note: styled(text('note', 'Примечание', 'Формат удобен для подборки по помещению: основа, акцент, назначение и следующий шаг.', 'small', { x: 7, y: 82, w: 70, h: 7 }), style.mutedText)
  }),

  template('catalog_project_case', 'catalog_interior', 'Каталог: проектный кейс', 'Короткий проектный кейс с интерьером, набором материалов и пояснением для согласования.', placeholderImages.previewInteriorProducts, {
    heading: styled(text('heading', 'Заголовок', 'Проектный кейс', 'h1', { x: 7, y: 10, w: 40, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Показывает, как материалы собираются в реальный объект, а не только в красивую подборку.', 'body', { x: 7, y: 20, w: 42, h: 9 }), style.mutedText),
    interior: styled(image('interior', 'Интерьер 16:9', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 7, y: 33, w: 54, h: 30 }), style.imageShadow),
    caseBlock: styled(features('caseBlock', 'Кейс', ['120 м2', '3 помещения', '2 формата', '1 цветовая система'], { x: 67, y: 33, w: 25, h: 18 }), style.whitePanel),
    product1: productCell('product1', placeholderImages.tile120Stone, 67, 55, 16),
    productText1: styled(text('productText1', 'Материал 1', 'ST-612\n60x120', 'small', { x: 67, y: 72, w: 24, h: 8 }), style.darkText),
    icons: styled(iconRow('icons', 'Быстрый итог', { x: 67, y: 82, w: 25, h: 10 }, [
      { id: 'case-area', iconId: 'size', label: 'Площадь', value: '120 м2' },
      { id: 'case-room', iconId: 'floor', label: 'Зоны', value: '3' }
    ]), style.softPanel),
    note: styled(text('note', 'Примечание', 'Кейс можно менять под объект, если документ уходит в согласование с заказчиком.', 'small', { x: 7, y: 85, w: 52, h: 5 }), style.mutedText)
  })
];
