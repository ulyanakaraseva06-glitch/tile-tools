import { placeholderImages, style, styled, text, badge, image, productCell, template } from './shared';

export const catalogSlabTemplates = [
  template(
    'catalog_slab_statement_cover',
    'cover',
    'Слэб: обложка-заявление',
    'Почти полноэкранный слэб и короткий заголовок коллекции крупного формата.',
    placeholderImages.previewCoverHero,
    {
      slab: styled(image('slab', 'Слэб 1:2', placeholderImages.tile120Marble, 'interior', '1:2', { x: 7, y: 9.2, w: 52, h: 78 }), style.imageShadow),
      brandBadge: styled(badge('brandBadge', '120x280', { x: 64, y: 18, w: 22, h: 4.8 }), style.accentBadge),
      title: styled(text('title', 'Название коллекции', 'Альпийский\nкамень', 'h1', { x: 64, y: 28, w: 29, h: 16 }), style.darkText),
      subtitle: styled(text('subtitle', 'Описание', 'Крупный формат для стен, столешниц и спокойных общественных интерьеров.', 'body', { x: 64, y: 48, w: 29, h: 16 }), style.mutedText),
      issue: styled(text('issue', 'Выпуск', '6 / 9 / 20 мм', 'small', { x: 64, y: 70, w: 22, h: 5 }), style.darkText)
    }
  ),

  template(
    'catalog_slab_origin_formats',
    'catalog_overview',
    'Слэб: история и форматы',
    'Текстовая колонка про происхождение камня и линейка трёх крупных форматов.',
    placeholderImages.previewProductHero,
    {
      heading: styled(text('heading', 'Заголовок', 'Камень как плоскость', 'h1', { x: 7, y: 9.2, w: 48, h: 7 }), style.darkText),
      story: styled(text('story', 'Описание', 'Светло-серая фактура читается как цельная стена. Форматы подобраны так, чтобы шов не дробил пространство: от слэба 120x280 до универсального 60x120.', 'body', { x: 7, y: 20, w: 38, h: 28 }), style.mutedText),
      note: styled(text('note', 'Примечание', '6 мм — облицовка и мебель. 9 мм — пол. 20 мм — улица.', 'small', { x: 7, y: 52, w: 38, h: 10 }), style.darkText),
      f1: styled(image('f1', 'Формат 120x280', placeholderImages.tile120Marble, 'product', '1:2', { x: 50, y: 18, w: 13, h: 52 }), style.imagePlain),
      f2: styled(image('f2', 'Формат 120x120', placeholderImages.tile60Marble, 'product', '1:1', { x: 66, y: 18, w: 13, h: 26 }), style.imagePlain),
      f3: styled(image('f3', 'Формат 60x120', placeholderImages.tile120Stone, 'product', '1:2', { x: 82, y: 18, w: 11, h: 28 }), style.imagePlain),
      l1: styled(text('l1', 'Подпись 1', '120x280', 'small', { x: 50, y: 72, w: 13, h: 5 }), style.darkText),
      l2: styled(text('l2', 'Подпись 2', '120x120', 'small', { x: 66, y: 46, w: 13, h: 5 }), style.darkText),
      l3: styled(text('l3', 'Подпись 3', '60x120', 'small', { x: 82, y: 48, w: 11, h: 5 }), style.darkText),
      caption: styled(text('caption', 'Подпись сцены', 'Лестница форматов без товарной сетки: сравнивается только масштаб плиты.', 'small', { x: 50, y: 80, w: 43, h: 8 }), style.mutedText)
    }
  ),

  template(
    'catalog_slab_tone_scale',
    'catalog_overview',
    'Слэб: палитра тонов',
    'Четыре вертикальных образца от холодного к тёплому — шкала, а не сетка SKU.',
    placeholderImages.previewSampleGrid,
    {
      heading: styled(text('heading', 'Заголовок', 'Шкала камня', 'h1', { x: 7, y: 9.2, w: 40, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Четыре тона одной породы: от ледяного серого к чуть более тёплому графиту.', 'body', { x: 50, y: 9.6, w: 43, h: 8 }), style.mutedText),
      s1: styled(image('s1', 'Тон 1', placeholderImages.tile60Marble, 'product', '1:2', { x: 7, y: 22, w: 20, h: 52 }), style.imagePlain),
      s2: styled(image('s2', 'Тон 2', placeholderImages.textureGreige, 'product', '1:2', { x: 29, y: 22, w: 20, h: 52 }), style.imagePlain),
      s3: styled(image('s3', 'Тон 3', placeholderImages.tile60Stone, 'product', '1:2', { x: 51, y: 22, w: 20, h: 52 }), style.imagePlain),
      s4: styled(image('s4', 'Тон 4', placeholderImages.catalogInteriorDark, 'product', '1:2', { x: 73, y: 22, w: 20, h: 52 }), style.imagePlain),
      n1: styled(text('n1', 'Подпись 1', 'Лёд\nхолодный', 'small', { x: 7, y: 76, w: 20, h: 8 }), style.darkText),
      n2: styled(text('n2', 'Подпись 2', 'Туман\nнейтральный', 'small', { x: 29, y: 76, w: 20, h: 8 }), style.darkText),
      n3: styled(text('n3', 'Подпись 3', 'Камень\nтёплый', 'small', { x: 51, y: 76, w: 20, h: 8 }), style.darkText),
      n4: styled(text('n4', 'Подпись 4', 'Графит\nтёмный', 'small', { x: 73, y: 76, w: 20, h: 8 }), style.darkText)
    }
  ),

  template(
    'catalog_slab_bookmatch',
    'catalog_visual_focus',
    'Слэб: bookmatch',
    'Два зеркальных слэба и подпись линии стыка — для стен и столешниц.',
    placeholderImages.previewInteriorProducts,
    {
      heading: styled(text('heading', 'Заголовок', 'Зеркальная стыковка', 'h1', { x: 7, y: 9.2, w: 50, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Две плиты раскрывают рисунок жилы. Шов совпадает по центру композиции.', 'body', { x: 58, y: 9.4, w: 35, h: 8 }), style.mutedText),
      left: styled(image('left', 'Слэб слева', placeholderImages.tile120Marble, 'interior', '1:2', { x: 7, y: 22, w: 41, h: 58 }), style.imageShadow),
      right: styled(image('right', 'Слэб справа', placeholderImages.tile120Marble, 'interior', '1:2', { x: 52, y: 22, w: 41, h: 58 }), style.imageShadow),
      seam: styled(text('seam', 'Подпись сцены', 'Линия стыка · bookmatch 120x280', 'small', { x: 7, y: 82, w: 50, h: 6 }), style.darkText)
    }
  ),

  template(
    'catalog_slab_wet_interior',
    'catalog_interior',
    'Слэб: влажная зона',
    'Одна крупная сцена ванной или кухни и микроподпись формата.',
    placeholderImages.previewInteriorProducts,
    {
      scene: styled(image('scene', 'Интерьер 16:9', placeholderImages.catalogInteriorMarble, 'interior', '16:9', { x: 7, y: 9.2, w: 86, h: 68 }), style.imageShadow),
      caption: styled(text('caption', 'Подпись сцены', 'Стена душа · 120x280 · 6 мм', 'small', { x: 7, y: 80, w: 40, h: 6 }), style.darkText),
      formatNote: styled(text('formatNote', 'Формат', 'Ректифицированный край, минимальный шов', 'small', { x: 50, y: 80, w: 43, h: 6 }), style.mutedText)
    }
  ),

  template(
    'catalog_slab_thickness_trio',
    'catalog_specs',
    'Слэб: три толщины',
    'Три блока 6 / 9 / 20 мм: где работает каждая толщина, без схем укладки на газон.',
    placeholderImages.previewTechnicalIcons,
    {
      heading: styled(text('heading', 'Заголовок', 'Один рисунок — три толщины', 'h1', { x: 7, y: 9.2, w: 70, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Тонкая плита для мебели и стен, стандарт для пола, 20 мм для улицы.', 'body', { x: 7, y: 18, w: 86, h: 7 }), style.mutedText),
      b1: styled(image('b1', 'Толщина 6 мм', placeholderImages.floatingMarble, 'product', '1:2', { x: 7, y: 28, w: 26, h: 28 }), style.imagePlain),
      b2: styled(image('b2', 'Толщина 9 мм', placeholderImages.floatingStone, 'product', '1:2', { x: 37, y: 28, w: 26, h: 28 }), style.imagePlain),
      b3: styled(image('b3', 'Толщина 20 мм', placeholderImages.tile120Stone, 'product', '1:2', { x: 67, y: 28, w: 26, h: 28 }), style.imagePlain),
      t1: styled(text('t1', 'Название', '6 мм\nстены, мебель, лифт', 'h2', { x: 7, y: 58, w: 26, h: 10 }), style.darkText),
      t2: styled(text('t2', 'Название', '9 мм\nпол и стены внутри', 'h2', { x: 37, y: 58, w: 26, h: 10 }), style.darkText),
      t3: styled(text('t3', 'Название', '20 мм\nтерраса и настил', 'h2', { x: 67, y: 58, w: 26, h: 10 }), style.darkText),
      note: styled(text('note', 'Примечание', 'Не монтажная инструкция: только выбор толщины под зону проекта.', 'small', { x: 7, y: 78, w: 86, h: 8 }), style.mutedText)
    }
  ),

  template(
    'catalog_slab_finish_row',
    'catalog_specs',
    'Слэб: три финиша',
    'Три макро-фактуры в ряд: натуральная, мягкий grip и структурная.',
    placeholderImages.previewMoodboard,
    {
      heading: styled(text('heading', 'Заголовок', 'Поверхность на ощупь', 'h1', { x: 7, y: 9.2, w: 55, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Один камень, три тактильных сценария — без смены рисунка.', 'body', { x: 7, y: 18, w: 86, h: 7 }), style.mutedText),
      m1: styled(image('m1', 'Макро 1', placeholderImages.textureGreige, 'product', '1:1', { x: 7, y: 28, w: 26, h: 36 }), style.imagePlain),
      m2: styled(image('m2', 'Макро 2', placeholderImages.tile60Stone, 'product', '1:1', { x: 37, y: 28, w: 26, h: 36 }), style.imagePlain),
      m3: styled(image('m3', 'Макро 3', placeholderImages.catalogInteriorDark, 'product', '1:1', { x: 67, y: 28, w: 26, h: 36 }), style.imagePlain),
      n1: styled(text('n1', 'Подпись 1', 'Натуральный\nмягкий мат', 'small', { x: 7, y: 66, w: 26, h: 8 }), style.darkText),
      n2: styled(text('n2', 'Подпись 2', 'Мягкое сцепление\nбез грубой структуры', 'small', { x: 37, y: 66, w: 26, h: 10 }), style.darkText),
      n3: styled(text('n3', 'Подпись 3', 'Структура\nвлажные зоны', 'small', { x: 67, y: 66, w: 26, h: 8 }), style.darkText),
      note: styled(text('note', 'Примечание', 'Коэффициент сцепления уточняется по партии и зоне применения.', 'small', { x: 7, y: 82, w: 70, h: 5 }), style.mutedText)
    }
  ),

  template(
    'catalog_slab_format_ladder',
    'catalog_grid',
    'Слэб: лестница форматов',
    'Размерные плашки от слэба к мелкому модулю — сравнение масштаба, не 3x3 SKU.',
    placeholderImages.previewSampleGrid,
    {
      heading: styled(text('heading', 'Заголовок', 'Масштаб в одном листе', 'h1', { x: 7, y: 9.2, w: 60, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Каждая плашка — другой формат той же поверхности.', 'body', { x: 7, y: 18, w: 70, h: 6 }), style.mutedText),
      a: styled(image('a', '120x280', placeholderImages.tile120Marble, 'product', '1:2', { x: 7, y: 28, w: 22, h: 52 }), style.imagePlain),
      b: styled(image('b', '120x120', placeholderImages.tile60Marble, 'product', '1:1', { x: 32, y: 28, w: 22, h: 28 }), style.imagePlain),
      c: styled(image('c', '60x120', placeholderImages.tile120Stone, 'product', '1:2', { x: 57, y: 28, w: 16, h: 32 }), style.imagePlain),
      d: styled(image('d', '60x60', placeholderImages.tile60Stone, 'product', '1:1', { x: 76, y: 28, w: 17, h: 22 }), style.imagePlain),
      la: styled(text('la', 'Подпись 1', '120x280', 'small', { x: 7, y: 82, w: 22, h: 5 }), style.darkText),
      lb: styled(text('lb', 'Подпись 2', '120x120', 'small', { x: 32, y: 58, w: 22, h: 5 }), style.darkText),
      lc: styled(text('lc', 'Подпись 3', '60x120', 'small', { x: 57, y: 62, w: 16, h: 5 }), style.darkText),
      ld: styled(text('ld', 'Подпись 4', '60x60', 'small', { x: 76, y: 52, w: 17, h: 5 }), style.darkText)
    }
  ),

  template(
    'catalog_slab_architecture',
    'catalog_interior',
    'Слэб: архитектура',
    'Широкая сцена общественного пространства и два компаньона снизу.',
    placeholderImages.previewInteriorProducts,
    {
      scene: styled(image('scene', 'Интерьер 16:9', placeholderImages.catalogInteriorDark, 'interior', '16:9', { x: 7, y: 9.2, w: 86, h: 48 }), style.imageShadow),
      heading: styled(text('heading', 'Заголовок', 'Лобби и общественные зоны', 'h1', { x: 7, y: 60, w: 50, h: 7 }), style.darkText),
      story: styled(text('story', 'Описание', 'Крупный формат держит стену без дробления. Компаньоны — пол и тёплый акцент.', 'body', { x: 7, y: 68, w: 48, h: 12 }), style.mutedText),
      c1: productCell('c1', placeholderImages.tile60Marble, 58, 62, 16),
      c2: productCell('c2', placeholderImages.tileWood, 77, 62, 16),
      n1: styled(text('n1', 'Позиция 1', 'Стена\n120x280', 'small', { x: 58, y: 78, w: 16, h: 8 }), style.darkText),
      n2: styled(text('n2', 'Позиция 2', 'Пол\n60x120', 'small', { x: 77, y: 78, w: 16, h: 8 }), style.darkText)
    }
  )
];
