import { placeholderImages, style, styled, text, badge, image, features, iconRow, productCell, divider, template } from './shared';

export const catalogOverviewTemplates = [
  template('catalog_series_overview', 'catalog_overview', 'Каталог: обзор серии', 'Обзор коллекции: интерьер, четыре фактуры, форматы и назначение.', placeholderImages.previewProductHero, {
    heading: styled(text('heading', 'Заголовок', 'Sierra Stone Collection', 'h1', { x: 7, y: 8, w: 48, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Серия с нейтральной каменной базой, крупными форматами и спокойной матовой поверхностью.', 'body', { x: 7, y: 18, w: 50, h: 8 }), style.mutedText),
    interior: styled(image('interior', 'Интерьер 16:9', placeholderImages.catalogInteriorWarm, 'interior', '16:9', { x: 60, y: 10, w: 32, h: 22 }), style.imageShadow),
    contentRule: divider('contentRule', { x: 7, y: 35, w: 86, h: 0.22 }),
    sample1: productCell('sample1', placeholderImages.tile60Stone, 8, 39, 17),
    sample2: productCell('sample2', placeholderImages.tile120Stone, 30, 39, 17),
    sample3: productCell('sample3', placeholderImages.tile60Marble, 52, 39, 17),
    sample4: productCell('sample4', placeholderImages.tileWood, 74, 39, 17),
    label1: styled(text('label1', 'Подпись 1', 'ST-601\n60x60', 'small', { x: 8, y: 55, w: 16, h: 6 }), style.darkText),
    label2: styled(text('label2', 'Подпись 2', 'ST-612\n60x120', 'small', { x: 30, y: 55, w: 16, h: 6 }), style.darkText),
    label3: styled(text('label3', 'Подпись 3', 'MR-601\n60x60', 'small', { x: 52, y: 55, w: 16, h: 6 }), style.darkText),
    label4: styled(text('label4', 'Подпись 4', 'WD-212\n20x120', 'small', { x: 74, y: 55, w: 16, h: 6 }), style.darkText),
    icons: styled(iconRow('icons', 'Иконки', { x: 8, y: 74, w: 84, h: 12 }, [
      { id: 'series-size', iconId: 'size', label: 'Форматы', value: '60x60 / 60x120 / 20x120' },
      { id: 'series-finish', iconId: 'matte', label: 'Финиш', value: 'матовый / сатин' },
      { id: 'series-usage', iconId: 'floor', label: 'Применение', value: 'пол / стены' }
    ]), style.softPanel)
  }),

  template('catalog_collection_story', 'catalog_overview', 'Каталог: история коллекции', 'Текстовая вводная страница с интерьером, образцом и характеристиками.', placeholderImages.previewProductHero, {
    image: styled(image('image', 'Интерьер 16:9', placeholderImages.catalogInteriorWarm, 'interior', '16:9', { x: 7, y: 8, w: 49, h: 30 }), style.imageShadow),
    brandBadge: styled(badge('brandBadge', 'Коллекция', { x: 63, y: 10, w: 20, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Спокойная база\nдля интерьера', 'h1', { x: 59, y: 21, w: 34, h: 20 }), style.darkText),
    body: styled(text('body', 'Текст', 'Коллекция построена вокруг нейтральной фактуры камня. Она хорошо работает как основной фон и не спорит с мебелью, светом и декором.', 'body', { x: 8, y: 50, w: 45, h: 16 }), style.mutedText),
    sample: productCell('sample', placeholderImages.tile60Stone, 62, 49, 20),
    specs: styled(iconRow('specs', 'Иконки', { x: 8, y: 78, w: 84, h: 11 }, [
      { id: 'story-size', iconId: 'size', label: 'Форматы', value: '60x60 / 60x120' },
      { id: 'story-finish', iconId: 'matte', label: 'Финиш', value: 'матовый' },
      { id: 'story-usage', iconId: 'wall', label: 'Применение', value: 'пол / стены' }
    ]), style.softPanel)
  }),

  template('catalog_collection_comparison', 'catalog_overview', 'Каталог: сравнение коллекций', 'Сравнение двух-трёх серий по характеру, формату и роли в проекте.', placeholderImages.previewProductHero, {
    heading: styled(text('heading', 'Заголовок', 'Сравнение коллекций', 'h1', { x: 7, y: 8, w: 42, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Страница помогает выбрать между базой, акцентом и более тёплой серией без длинного текста.', 'body', { x: 7, y: 18, w: 47, h: 8 }), style.mutedText),
    sample1: productCell('sample1', placeholderImages.tile60Stone, 8, 33, 18),
    sample2: productCell('sample2', placeholderImages.tile120Marble, 36, 33, 18),
    sample3: productCell('sample3', placeholderImages.tileWood, 64, 33, 18),
    block1: styled(features('block1', 'Коллекция 1', ['stone base', '60x60', 'пол / стены', 'спокойный фон'], { x: 8, y: 57, w: 22, h: 20 }), style.whitePanel),
    block2: styled(features('block2', 'Коллекция 2', ['marble accent', '60x120', 'showroom', 'более графичная'], { x: 38, y: 57, w: 22, h: 20 }), style.whitePanel),
    block3: styled(features('block3', 'Коллекция 3', ['warm wood', '20x120', 'жилые зоны', 'компаньон'], { x: 68, y: 57, w: 22, h: 20 }), style.whitePanel),
    note: styled(text('note', 'Примечание', 'Подходит для выбора серии на раннем этапе проекта или для быстрой матрицы вариантов.', 'small', { x: 8, y: 84, w: 60, h: 5 }), style.mutedText)
  }),

  template('catalog_collection_index', 'catalog_overview', 'Каталог: индекс коллекции', 'Навигационная страница серии с интерьером, образцами и разделами каталога.', placeholderImages.previewProductHero, {
    heading: styled(text('heading', 'Заголовок', 'Содержание серии', 'h1', { x: 7, y: 10, w: 42, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Быстрый обзор того, что есть в документе: цвета, форматы, применения и технические данные.', 'body', { x: 7, y: 21, w: 45, h: 10 }), style.mutedText),
    interior: styled(image('interior', 'Интерьер 4:3', placeholderImages.catalogInteriorWarm, 'interior', '4:3', { x: 58, y: 12, w: 34, h: 26 }), style.imageShadow),
    sample1: productCell('sample1', placeholderImages.tile60Stone, 60, 50, 14),
    sample2: productCell('sample2', placeholderImages.tile120Marble, 77, 50, 14),
    index: styled(features('index', 'Разделы каталога', ['01 Обзор серии', '02 Цвета и форматы', '03 Интерьеры и SKU', '04 Технический лист'], { x: 8, y: 45, w: 40, h: 31 }), style.whitePanel),
    note: styled(text('note', 'Примечание', 'Индекс удобен для документов на несколько страниц: клиент быстрее понимает структуру предложения.', 'small', { x: 8, y: 84, w: 74, h: 6 }), style.mutedText)
  })
];
