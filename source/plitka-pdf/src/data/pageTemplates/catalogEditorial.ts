import { placeholderImages, style, styled, text, badge, image, productCell, template } from './shared';

export const catalogEditorialTemplates = [
  template(
    'catalog_editorial_chapter',
    'catalog_overview',
    'Lookbook: глава 01',
    'Крупный номер главы и фото коллекции — ритм журнального lookbook.',
    placeholderImages.previewCoverHero,
    {
      chapter: styled(text('chapter', 'Заголовок', '01', 'hero', { x: 7, y: 14, w: 28, h: 22 }), style.darkText),
      heading: styled(text('heading', 'Название коллекции', 'Жилая\nсерия', 'h1', { x: 7, y: 40, w: 28, h: 14 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Природные оттенки и мягкие фактуры. Коллекция для пространств, в которых хочется остаться.', 'body', { x: 7, y: 58, w: 28, h: 18 }), style.mutedText),
      photo: styled(image('photo', 'Интерьер 3:4', placeholderImages.catalogInteriorMarble, 'interior', '3:4', { x: 42, y: 9.2, w: 51, h: 78 }), style.imageShadow)
    }
  ),

  template(
    'catalog_editorial_quote',
    'catalog_visual_focus',
    'Lookbook: цитата',
    'Манифест поверх кадра — не обложка с годом и не товарный блок.',
    placeholderImages.previewInteriorProducts,
    {
      scene: styled(image('scene', 'Интерьер 16:9', placeholderImages.catalogInteriorDark, 'interior', '16:9', { x: 7, y: 9.2, w: 86, h: 72 }), style.imageShadow),
      quote: styled(text('quote', 'Заголовок', 'Материал должен\nмолчать в интерьере', 'hero', { x: 10, y: 28, w: 56, h: 18 }), style.lightText),
      credit: styled(text('credit', 'Подпись сцены', 'Манифест коллекции · lookbook', 'small', { x: 10, y: 50, w: 40, h: 8 }), style.lightText)
    }
  ),

  template(
    'catalog_editorial_dual_lifestyle',
    'catalog_interior',
    'Lookbook: два кадра',
    'Две lifestyle-сцены разного кадра: широкий и портретный.',
    placeholderImages.previewInteriorProducts,
    {
      wide: styled(image('wide', 'Интерьер 16:9', placeholderImages.catalogInteriorWarm, 'interior', '16:9', { x: 7, y: 9.2, w: 54, h: 48 }), style.imageShadow),
      portrait: styled(image('portrait', 'Интерьер 3:4', placeholderImages.catalogInteriorMarble, 'interior', '3:4', { x: 64, y: 9.2, w: 29, h: 72 }), style.imageShadow),
      caption1: styled(text('caption1', 'Подпись 1', 'Широкий кадр · гостиная', 'small', { x: 7, y: 60, w: 54, h: 6 }), style.darkText),
      caption2: styled(text('caption2', 'Подпись 2', 'Портрет · влажная зона', 'small', { x: 7, y: 68, w: 54, h: 6 }), style.mutedText),
      note: styled(text('note', 'Примечание', 'Одна палитра объединяет комнаты, сохраняя индивидуальность каждого пространства.', 'small', { x: 7, y: 78, w: 54, h: 8 }), style.mutedText)
    }
  ),

  template(
    'catalog_editorial_collage',
    'catalog_visual_focus',
    'Lookbook: коллаж фрагментов',
    'Пять-шесть обрезков разного масштаба — не moodboard из трёх квадратов в ряд.',
    placeholderImages.previewMoodboard,
    {
      a: styled(image('a', 'Фрагмент 1', placeholderImages.catalogInteriorLiving, 'interior', '4:3', { x: 7, y: 9.2, w: 40, h: 38 }), style.imageShadow),
      b: styled(image('b', 'Фрагмент 2', placeholderImages.tile60Marble, 'product', '1:1', { x: 49, y: 9.2, w: 22, h: 18 }), style.imagePlain),
      c: styled(image('c', 'Фрагмент 3', placeholderImages.catalogInteriorWood, 'interior', '9:16', { x: 73, y: 9.2, w: 20, h: 38 }), style.imageShadow),
      d: styled(image('d', 'Фрагмент 4', placeholderImages.tileWood, 'product', '1:2', { x: 49, y: 29, w: 22, h: 18 }), style.imagePlain),
      e: styled(image('e', 'Фрагмент 5', placeholderImages.textureGreige, 'product', '1:1', { x: 7, y: 50, w: 18, h: 28 }), style.imagePlain),
      f: styled(image('f', 'Фрагмент 6', placeholderImages.catalogInteriorWarm, 'interior', '16:9', { x: 27, y: 50, w: 44, h: 28 }), style.imageShadow),
      caption: styled(text('caption', 'Подпись сцены', 'Камень и дерево\nСвет и фактура', 'small', { x: 73, y: 50, w: 20, h: 28 }), style.darkText)
    }
  ),

  template(
    'catalog_editorial_index',
    'catalog_overview',
    'Lookbook: оглавление серий',
    'Нумерованный список серий — короткое оглавление lookbook, не каталог на 40 коллекций.',
    placeholderImages.previewProductHero,
    {
      heading: styled(text('heading', 'Заголовок', 'Серии в этом томе', 'h1', { x: 7, y: 9.2, w: 50, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Четыре направления. Номер совпадает с главой lookbook.', 'body', { x: 58, y: 9.6, w: 35, h: 8 }), style.mutedText),
      n1: styled(text('n1', 'Заголовок', '01', 'hero', { x: 7, y: 22, w: 12, h: 10 }), style.darkText),
      t1: styled(text('t1', 'Название', 'Камень', 'h2', { x: 22, y: 22, w: 28, h: 5 }), style.darkText),
      d1: styled(text('d1', 'Описание', 'Светлые плоскости для жилых стен и пола.', 'small', { x: 22, y: 28, w: 28, h: 8 }), style.mutedText),
      n2: styled(text('n2', 'Заголовок', '02', 'hero', { x: 54, y: 22, w: 12, h: 10 }), style.darkText),
      t2: styled(text('t2', 'Название', 'Мрамор', 'h2', { x: 69, y: 22, w: 24, h: 5 }), style.darkText),
      d2: styled(text('d2', 'Описание', 'Мягкая жила для влажных зон.', 'small', { x: 69, y: 28, w: 24, h: 8 }), style.mutedText),
      n3: styled(text('n3', 'Заголовок', '03', 'hero', { x: 7, y: 42, w: 12, h: 10 }), style.darkText),
      t3: styled(text('t3', 'Название', 'Дерево', 'h2', { x: 22, y: 42, w: 28, h: 5 }), style.darkText),
      d3: styled(text('d3', 'Описание', 'Планка 20x120 для жилых полов.', 'small', { x: 22, y: 48, w: 28, h: 8 }), style.mutedText),
      n4: styled(text('n4', 'Заголовок', '04', 'hero', { x: 54, y: 42, w: 12, h: 10 }), style.darkText),
      t4: styled(text('t4', 'Название', 'Бетон', 'h2', { x: 69, y: 42, w: 24, h: 5 }), style.darkText),
      d4: styled(text('d4', 'Описание', 'Нейтральный фон общественных зон.', 'small', { x: 69, y: 48, w: 24, h: 8 }), style.mutedText),
      strip: styled(image('strip', 'Лента 16:9', placeholderImages.catalogInteriorWarm, 'interior', '5:2', { x: 7, y: 62, w: 86, h: 20 }), style.imageShadow)
    }
  ),

  template(
    'catalog_editorial_palette_ribbon',
    'catalog_overview',
    'Lookbook: лента оттенков',
    'Горизонтальная лента тонов коллекции — не вертикальная палитра слэба и не 2x2.',
    placeholderImages.previewSampleGrid,
    {
      heading: styled(text('heading', 'Заголовок', 'Лента оттенков', 'h1', { x: 7, y: 9.2, w: 50, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Шесть тонов одной серии в одну линию — как веер образцов в журнале.', 'body', { x: 7, y: 18, w: 86, h: 7 }), style.mutedText),
      r1: styled(image('r1', 'Оттенок 1', placeholderImages.tile60Marble, 'product', '1:1', { x: 7, y: 30, w: 13, h: 36 }), style.imagePlain),
      r2: styled(image('r2', 'Оттенок 2', placeholderImages.textureGreige, 'product', '1:1', { x: 21.2, y: 30, w: 13, h: 36 }), style.imagePlain),
      r3: styled(image('r3', 'Оттенок 3', placeholderImages.tile60Stone, 'product', '1:1', { x: 35.4, y: 30, w: 13, h: 36 }), style.imagePlain),
      r4: styled(image('r4', 'Оттенок 4', placeholderImages.tile120Stone, 'product', '1:1', { x: 49.6, y: 30, w: 13, h: 36 }), style.imagePlain),
      r5: styled(image('r5', 'Оттенок 5', placeholderImages.catalogInteriorDark, 'product', '1:1', { x: 63.8, y: 30, w: 13, h: 36 }), style.imagePlain),
      r6: styled(image('r6', 'Оттенок 6', placeholderImages.tileWood, 'product', '1:1', { x: 78, y: 30, w: 15, h: 36 }), style.imagePlain),
      n1: styled(text('n1', 'Подпись 1', 'Слоновая', 'small', { x: 7, y: 68, w: 13, h: 5 }), style.darkText),
      n2: styled(text('n2', 'Подпись 2', 'Песок', 'small', { x: 21.2, y: 68, w: 13, h: 5 }), style.darkText),
      n3: styled(text('n3', 'Подпись 3', 'Камень', 'small', { x: 35.4, y: 68, w: 13, h: 5 }), style.darkText),
      n4: styled(text('n4', 'Подпись 4', 'Тауп', 'small', { x: 49.6, y: 68, w: 13, h: 5 }), style.darkText),
      n5: styled(text('n5', 'Подпись 5', 'Графит', 'small', { x: 63.8, y: 68, w: 13, h: 5 }), style.darkText),
      n6: styled(text('n6', 'Подпись 6', 'Дуб', 'small', { x: 78, y: 68, w: 15, h: 5 }), style.darkText),
      note: styled(text('note', 'Примечание', 'Лента читается слева направо: от самого светлого к акценту.', 'small', { x: 7, y: 78, w: 70, h: 8 }), style.mutedText)
    }
  ),

  template(
    'catalog_editorial_side_caption',
    'catalog_visual_focus',
    'Lookbook: кадр и подпись',
    'Крупный кадр и боковая колонка подписи — журнальный разворот, не hero товара.',
    placeholderImages.previewInteriorProducts,
    {
      shot: styled(image('shot', 'Интерьер 3:4', placeholderImages.catalogInteriorMarble, 'interior', '3:4', { x: 7, y: 9.2, w: 58, h: 78 }), style.imageShadow),
      kicker: styled(badge('kicker', 'Кадр 07', { x: 70, y: 18, w: 20, h: 4.8 }), style.accentBadge),
      heading: styled(text('heading', 'Заголовок', 'Стена\nкак фон', 'h1', { x: 70, y: 28, w: 23, h: 14 }), style.darkText),
      caption: styled(text('caption', 'Подпись сцены', 'Боковая колонка держит имя сцены, формат и одну мысль. Фото остаётся главным объектом полосы.', 'body', { x: 70, y: 46, w: 23, h: 22 }), style.mutedText),
      formatNote: styled(text('formatNote', 'Формат', '120x280 · 6 мм', 'small', { x: 70, y: 72, w: 23, h: 6 }), style.darkText)
    }
  ),

  template(
    'catalog_editorial_project_case',
    'catalog_interior',
    'Lookbook: кейс проекта',
    'Сцена объекта и два SKU — короткий кейс lookbook, не техлист.',
    placeholderImages.previewInteriorProducts,
    {
      scene: styled(image('scene', 'Интерьер 16:9', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 7, y: 9.2, w: 62, h: 52 }), style.imageShadow),
      heading: styled(text('heading', 'Заголовок', 'Кейс: жилой объём', 'h1', { x: 7, y: 64, w: 40, h: 7 }), style.darkText),
      story: styled(text('story', 'Описание', 'Тёплый камень и натуральный рисунок дуба. Два материала создают спокойный, цельный интерьер.', 'body', { x: 7, y: 72, w: 40, h: 12 }), style.mutedText),
      sku1: productCell('sku1', placeholderImages.tile60Stone, 72, 12, 18),
      sku2: productCell('sku2', placeholderImages.tileWood, 72, 38, 18),
      l1: styled(text('l1', 'Позиция 1', 'Камень\n60x120', 'small', { x: 72, y: 26, w: 21, h: 8 }), style.darkText),
      l2: styled(text('l2', 'Позиция 2', 'Дуб\n20x120', 'small', { x: 72, y: 52, w: 21, h: 8 }), style.darkText)
    }
  ),

  template(
    'catalog_editorial_next_step',
    'catalog_overview',
    'Lookbook: следующий шаг',
    'Закрывающий разворот: фото и текст приглашения, без шаблона контактов.',
    placeholderImages.previewContacts,
    {
      photo: styled(image('photo', 'Интерьер 16:9', placeholderImages.catalogInteriorWarm, 'interior', '16:9', { x: 7, y: 9.2, w: 52, h: 78 }), style.imageShadow),
      heading: styled(text('heading', 'Заголовок', 'Продолжить\nподбор', 'h1', { x: 64, y: 22, w: 29, h: 16 }), style.darkText),
      story: styled(text('story', 'Описание', 'Начните с образцов. Сравните фактуры при дневном свете, выберите оттенок и составьте палитру для своего пространства.', 'body', { x: 64, y: 42, w: 29, h: 24 }), style.mutedText),
      caption: styled(text('caption', 'Подпись сцены', 'Том закрыт · серия открыта', 'small', { x: 64, y: 70, w: 29, h: 8 }), style.darkText)
    }
  )
];
