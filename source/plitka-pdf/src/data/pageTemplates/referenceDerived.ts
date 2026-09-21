import {
  badge,
  divider,
  features,
  iconRow,
  image,
  panel,
  placeholderImages,
  productCell,
  style,
  styled,
  table,
  template,
  text
} from './shared';

const compactSpecColumns = [
  { id: 'article', label: 'Артикул' },
  { id: 'format', label: 'Формат' },
  { id: 'surface', label: 'Поверхность' }
];

const compactSpecRows = [
  { article: 'ST-601', format: '60x60', surface: 'Матовая' },
  { article: 'ST-612', format: '60x120', surface: 'Матовая' },
  { article: 'MR-612', format: '60x120', surface: 'Сатин' }
];

export const referenceDerivedTemplates = [
  template(
    'cover_reference_year_statement',
    'cover',
    'Обложка: типографика и год',
    'Минималистичная обложка с крупным годом, спокойным фоном и коротким позиционированием каталога.',
    placeholderImages.previewCoverHero,
    {
      background: styled(
        image('background', 'Фоновая фактура', placeholderImages.textureGreige, 'decorative', '3:4', { x: 7, y: 8, w: 86, h: 84 }),
        { ...style.imagePlain, backgroundColor: '#eee8de' }
      ),
      year: styled({ ...text('year', 'Год выпуска', '26', 'hero', { x: 10, y: 17, w: 42, h: 25 }), fontSizePt: 100 }, {
        textColor: '#2b2926',
        borderRadius: 0
      }),
      title: styled(text('title', 'Название каталога', 'CATALOGUE\nCOLLECTIONS', 'h1', { x: 11, y: 52, w: 46, h: 14 }), style.darkText),
      statement: styled(text('statement', 'Позиционирование', 'Керамические поверхности для архитектуры и интерьера', 'body', { x: 61, y: 55, w: 27, h: 12 }), style.mutedText),
      issue: styled(text('issue', 'Выпуск', '2026 / GENERAL EDITION', 'small', { x: 11, y: 82, w: 32, h: 5 }), style.darkText),
      accentRule: divider('accentRule', { x: 61, y: 75, w: 27, h: 0.22 })
    }
  ),

  template(
    'catalog_reference_material_bands',
    'catalog_overview',
    'Каталог: ленты материалов',
    'Редакционная страница с широкими фактурными полосами, короткими названиями и спокойным вводным текстом.',
    placeholderImages.previewMoodboard,
    {
      brandBadge: styled(badge('brandBadge', 'Material archive', { x: 7, y: 10, w: 24, h: 4.6 }), style.accentBadge),
      heading: styled(text('heading', 'Заголовок', 'Материалы коллекции', 'h1', { x: 36, y: 10, w: 48, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Сравните характер поверхности, тон и рисунок до перехода к конкретным артикулам.', 'body', { x: 7, y: 21, w: 48, h: 8 }), style.mutedText),
      band1: styled({ ...image('band1', 'Светлый камень', placeholderImages.tile60Stone, 'product', '5:2', { x: 7, y: 35, w: 86, h: 12 }), fit: 'cover' as const }, style.imagePlain),
      band2: styled({ ...image('band2', 'Мрамор', placeholderImages.tile120Marble, 'product', '5:2', { x: 7, y: 51, w: 86, h: 12 }), fit: 'cover' as const }, style.imagePlain),
      band3: styled({ ...image('band3', 'Тёплый материал', placeholderImages.tileWood, 'product', '5:2', { x: 7, y: 67, w: 86, h: 12 }), fit: 'cover' as const }, style.imagePlain),
      label1: styled(text('label1', 'Материал 1', '01  LIMESTONE / warm ivory', 'small', { x: 9, y: 37, w: 30, h: 4 }), style.darkText),
      label2: styled(text('label2', 'Материал 2', '02  MARBLE / graphic vein', 'small', { x: 9, y: 53, w: 30, h: 4 }), style.lightText),
      label3: styled(text('label3', 'Материал 3', '03  WOOD / natural oak', 'small', { x: 9, y: 69, w: 30, h: 4 }), style.darkText),
      footerNote: styled(text('footerNote', 'Примечание', 'Три направления для единой коллекции', 'small', { x: 65, y: 84, w: 28, h: 4 }, 'right'), style.mutedText)
    }
  ),

  template(
    'catalog_reference_room_palette',
    'catalog_interior',
    'Каталог: интерьер и палитра',
    'Коммерческая страница с крупным интерьером, вертикальной палитрой и компактной карточкой выбранного товара.',
    placeholderImages.previewInteriorProducts,
    {
      heading: styled(text('heading', 'Заголовок', 'Коллекция в интерьере', 'h1', { x: 7, y: 10, w: 41, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Крупный образ пространства и вся базовая палитра на одной странице.', 'body', { x: 53, y: 11, w: 39, h: 7 }), style.mutedText),
      interior: styled(image('interior', 'Интерьер 4:3', placeholderImages.catalogInteriorLiving, 'interior', '4:3', { x: 32, y: 24, w: 61, h: 43 }), style.imageShadow),
      swatch1: productCell('swatch1', placeholderImages.tile60Stone, 7, 25, 15),
      swatch2: productCell('swatch2', placeholderImages.textureGreige, 7, 42, 15),
      swatch3: productCell('swatch3', placeholderImages.tile60Marble, 7, 59, 15),
      swatch4: productCell('swatch4', placeholderImages.tile120Marble, 7, 76, 15),
      selected: styled(text('selected', 'Выбранный товар', 'ST-612\n60x120 / матовая\nWarm Stone', 'small', { x: 35, y: 73, w: 25, h: 10 }), style.darkText),
      quickIcons: styled(iconRow('quickIcons', 'Характеристики', { x: 64, y: 73, w: 29, h: 11 }, [
        { id: 'palette-size', iconId: 'large-format', label: 'Формат', value: '60x120' },
        { id: 'palette-use', iconId: 'wall', label: 'Зоны', value: 'пол / стены' }
      ]), style.softPanel)
    }
  ),

  template(
    'catalog_reference_dual_scene',
    'catalog_interior',
    'Каталог: две сцены и спецификация',
    'Два интерьерных кадра, краткая история коллекции и нижняя товарная полоса для менеджера или дилера.',
    placeholderImages.previewInteriorProducts,
    {
      brandBadge: styled(badge('brandBadge', 'Two spaces', { x: 7, y: 10, w: 18, h: 4.6 }), style.accentBadge),
      heading: styled(text('heading', 'Заголовок', 'Один материал. Два сценария.', 'h1', { x: 31, y: 10, w: 53, h: 7 }), style.darkText),
      scene1: styled(image('scene1', 'Интерьер 1', placeholderImages.catalogInteriorMarble, 'interior', '3:4', { x: 7, y: 24, w: 40, h: 35 }), style.imageShadow),
      scene2: styled(image('scene2', 'Интерьер 2', placeholderImages.catalogInteriorDark, 'interior', '4:3', { x: 53, y: 24, w: 40, h: 35 }), style.imageShadow),
      caption1: styled(text('caption1', 'Сцена 1', 'Спокойная светлая ванная', 'small', { x: 7, y: 62, w: 35, h: 4 }), style.mutedText),
      caption2: styled(text('caption2', 'Сцена 2', 'Контрастная общественная зона', 'small', { x: 53, y: 62, w: 35, h: 4 }), style.mutedText),
      sample1: productCell('sample1', placeholderImages.tile60Marble, 8, 72, 14),
      sample2: productCell('sample2', placeholderImages.tile120Marble, 29, 72, 14),
      specTable: styled(table('specTable', 'Спецификация', compactSpecColumns, compactSpecRows, { x: 50, y: 71, w: 43, h: 16 }), style.whitePanel)
    }
  ),

  template(
    'catalog_reference_color_story',
    'catalog_grid',
    'Каталог: цветовая история',
    'Матрица оттенков с разным масштабом образцов и одной интерьерной подсказкой по применению.',
    placeholderImages.previewSampleGrid,
    {
      heading: styled(text('heading', 'Заголовок', 'Цветовая история', 'h1', { x: 7, y: 10, w: 42, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'От базового тона к акценту: палитра читается как единая система.', 'body', { x: 53, y: 11, w: 39, h: 7 }), style.mutedText),
      heroSample: styled(image('heroSample', 'Главный оттенок', placeholderImages.tile120Stone, 'product', '1:2', { x: 7, y: 25, w: 25, h: 42 }), style.imagePlain),
      sample2: productCell('sample2', placeholderImages.tile60Stone, 38, 25, 16),
      sample3: productCell('sample3', placeholderImages.textureGreige, 59, 25, 16),
      sample4: productCell('sample4', placeholderImages.tile60Marble, 80, 25, 13),
      sample5: productCell('sample5', placeholderImages.tile120Marble, 38, 48, 16),
      sample6: productCell('sample6', placeholderImages.tileWood, 59, 48, 16),
      interior: styled(image('interior', 'Интерьерная подсказка', placeholderImages.catalogInteriorWarm, 'interior', '16:9', { x: 7, y: 73, w: 45, h: 16 }), style.imageShadow),
      paletteNote: styled(text('paletteNote', 'Описание палитры', 'BASE  warm ivory\nMID  greige stone\nACCENT  marble vein\nCOMPANION  oak', 'small', { x: 59, y: 72, w: 31, h: 15 }), style.darkText)
    }
  ),

  template(
    'catalog_reference_outdoor_story',
    'catalog_interior',
    'Каталог: outdoor-история',
    'Панорамная outdoor-сцена, короткий текст и один крупный материал для понятной эмоциональной презентации.',
    placeholderImages.previewInteriorProducts,
    {
      brandBadge: styled(badge('brandBadge', 'Outdoor', { x: 7, y: 10, w: 17, h: 4.6 }), style.accentBadge),
      heading: styled(text('heading', 'Заголовок', 'Материал для открытого пространства', 'h1', { x: 30, y: 10, w: 60, h: 7 }), style.darkText),
      interior: styled(image('interior', 'Терраса 16:9', placeholderImages.catalogInteriorWarm, 'interior', '16:9', { x: 7, y: 24, w: 68, h: 40 }), style.imageShadow),
      story: styled(text('story', 'История', 'Единая поверхность связывает дом, террасу и ландшафт. Крупный кадр показывает материал в реальном масштабе.', 'body', { x: 79, y: 27, w: 14, h: 22 }), style.mutedText),
      material: productCell('material', placeholderImages.tile60Stone, 8, 72, 18),
      materialText: styled(text('materialText', 'Материал', 'YLICO SAND\n60x60 / 20 mm\nструктурная поверхность', 'small', { x: 31, y: 73, w: 25, h: 10 }), style.darkText),
      usage: styled(iconRow('usage', 'Применение', { x: 62, y: 72, w: 31, h: 12 }, [
        { id: 'outdoor-use', iconId: 'floor', label: 'Применение', value: 'терраса' },
        { id: 'outdoor-thickness', iconId: 'thickness', label: 'Толщина', value: '20 mm' }
      ]), style.softPanel)
    }
  ),

  template(
    'catalog_reference_outdoor_system',
    'catalog_specs',
    'Каталог: outdoor-система',
    'Техническая страница для уличной плитки: конструкция, способы укладки, форматы и ключевые ограничения.',
    placeholderImages.previewTechnicalIcons,
    {
      heading: styled(text('heading', 'Заголовок', 'Outdoor 2.0: система применения', 'h1', { x: 7, y: 10, w: 55, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Объясните не только свойства материала, но и способы его монтажа.', 'body', { x: 66, y: 11, w: 27, h: 8 }), style.mutedText),
      construction: styled(image('construction', 'Конструкция плитки', placeholderImages.floatingStone, 'product', '1:2', { x: 7, y: 27, w: 24, h: 22 }), style.imagePlain),
      installModes: styled(features('installModes', 'Способы укладки', [
        'На траву или грунт',
        'На гравийное основание',
        'На регулируемые опоры',
        'На клеевой состав'
      ], { x: 38, y: 25, w: 55, h: 25 }), style.whitePanel),
      iconSpecs: styled(iconRow('iconSpecs', 'Ключевые параметры', { x: 7, y: 58, w: 86, h: 13 }, [
        { id: 'system-thickness', iconId: 'thickness', label: 'Толщина', value: '20 mm' },
        { id: 'system-frost', iconId: 'frost', label: 'Мороз', value: 'стойкая' },
        { id: 'system-slip', iconId: 'abrasion', label: 'Сцепление', value: 'R11' },
        { id: 'system-outdoor', iconId: 'floor', label: 'Зона', value: 'улица' }
      ]), style.softPanel),
      formats: styled(text('formats', 'Форматы', '60x60   60x120   30x120', 'h2', { x: 7, y: 79, w: 45, h: 7 }), style.darkText),
      note: styled(text('note', 'Примечание', 'Параметры уточняются по конкретному артикулу и партии.', 'small', { x: 57, y: 80, w: 36, h: 6 }), style.mutedText)
    }
  ),

  template(
    'catalog_brand_technology_story',
    'catalog_specs',
    'Каталог: технология бренда',
    'Короткий технологический блок о производстве, стабильности и контроле качества без маркетингового перегруза.',
    placeholderImages.previewTechnicalIcons,
    {
      brandBadge: styled(badge('brandBadge', 'Brand tech', { x: 7, y: 10, w: 19, h: 4.6 }), style.accentBadge),
      heading: styled(text('heading', 'Заголовок', 'Технология и контроль', 'h1', { x: 31, y: 10, w: 56, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Покажите, чем коллекция отличается на уровне производства, стабильности и контроля партии.', 'body', { x: 7, y: 21, w: 52, h: 8 }), style.mutedText),
      image: styled(image('image', 'Производственный образ', placeholderImages.textureGreige, 'decorative', '16:9', { x: 7, y: 33, w: 48, h: 29 }), style.imageShadow),
      process: styled(features('process', 'Процесс', ['Стабильная сырьевая база', 'Контроль оттенка и калибра', 'Повторяемость партии', 'Проверка визуального совпадения'], { x: 60, y: 33, w: 33, h: 22 }), style.whitePanel),
      stats: styled(iconRow('stats', 'Что важно для продаж', { x: 7, y: 67, w: 86, h: 11 }, [
        { id: 'tech-story-format', iconId: 'large-format', label: 'Формат', value: '60x120' },
        { id: 'tech-story-finish', iconId: 'matte', label: 'Финиш', value: 'матовый' },
        { id: 'tech-story-control', iconId: 'approved', label: 'Контроль', value: 'по партии' }
      ]), style.softPanel),
      note: styled(text('note', 'Примечание', 'Этот блок закрывает вопрос качества до тех пор, пока клиент не перейдёт к конкретному артикулу.', 'small', { x: 7, y: 83, w: 60, h: 5 }), style.mutedText)
    }
  ),

  template(
    'catalog_reference_dark_index',
    'catalog_overview',
    'Каталог: тёмный индекс',
    'Контрастная навигационная страница с крупными номерами разделов и небольшим материалом-акцентом.',
    placeholderImages.previewMoodboard,
    {
      darkField: styled(panel('darkField', { x: 7, y: 9, w: 86, h: 80 }), style.darkPanel),
      heading: styled(text('heading', 'Заголовок', 'INDEX / COLLECTIONS', 'h1', { x: 11, y: 15, w: 45, h: 8 }), style.lightText),
      section1: styled(text('section1', 'Раздел 1', '01\nStone', 'h1', { x: 11, y: 31, w: 22, h: 14 }), style.lightText),
      section2: styled(text('section2', 'Раздел 2', '02\nMarble', 'h1', { x: 38, y: 31, w: 22, h: 14 }), style.lightText),
      section3: styled(text('section3', 'Раздел 3', '03\nWood', 'h1', { x: 65, y: 31, w: 22, h: 14 }), style.lightText),
      rule1: divider('rule1', { x: 11, y: 51, w: 76, h: 0.22 }),
      note1: styled(text('note1', 'Описание 1', 'Natural surfaces\nPages 06-42', 'small', { x: 11, y: 57, w: 22, h: 8 }), style.lightText),
      note2: styled(text('note2', 'Описание 2', 'Graphic veins\nPages 44-86', 'small', { x: 38, y: 57, w: 22, h: 8 }), style.lightText),
      note3: styled(text('note3', 'Описание 3', 'Warm structures\nPages 88-112', 'small', { x: 65, y: 57, w: 22, h: 8 }), style.lightText),
      material: styled(image('material', 'Материал-акцент', placeholderImages.floatingMarble, 'product', '1:1', { x: 65, y: 71, w: 18, h: 13 }), style.imagePlain)
    }
  )
];
