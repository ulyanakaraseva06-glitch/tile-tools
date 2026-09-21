import { ImageZone } from '../../types/project';
import { placeholderImages, style, styled, text, badge, image, iconRow, template } from './shared';

function interiorPlank(id: string, src: string, x: number, y: number, w = 26, h = 10): ImageZone {
  return styled(image(id, 'Планка 20x120', src, 'product', '1:2', { x, y, w, h }), style.imagePlain);
}

export const catalogWoodTemplates = [
  template(
    'catalog_wood_opener',
    'cover',
    'Планка: opener',
    'Название коллекции и атмосфера деревянного пола — вход в жилую линейку планок.',
    placeholderImages.previewCoverHero,
    {
      scene: styled(image('scene', 'Пол 16:9', placeholderImages.catalogInteriorWood, 'interior', '16:9', { x: 7, y: 9.2, w: 58, h: 78 }), style.imageShadow),
      brandBadge: styled(badge('brandBadge', '20x120', { x: 70, y: 22, w: 20, h: 4.8 }), style.accentBadge),
      title: styled(text('title', 'Название коллекции', 'Жилой\nдуб', 'hero', { x: 70, y: 32, w: 23, h: 16 }), style.darkText),
      subtitle: styled(text('subtitle', 'Описание', 'Древесная планка для жилых полов: спокойный рисунок, тёплый тон, без уличной графики.', 'body', { x: 70, y: 52, w: 23, h: 18 }), style.mutedText)
    }
  ),

  template(
    'catalog_wood_tone_story',
    'catalog_overview',
    'Планка: три тона',
    'Три чипа дуба и короткий story — палитра серии, не товарный ряд на террасу.',
    placeholderImages.previewSampleGrid,
    {
      heading: styled(text('heading', 'Заголовок', 'Три тона дуба', 'h1', { x: 7, y: 9.2, w: 46, h: 7 }), style.darkText),
      story: styled(text('story', 'Описание', 'Светлый мёд, бисквит и шоколад в одной линейке. Оттенки собраны так, чтобы соседствовать в одном интерьере: пол, стена и столешница без смены породы.', 'body', { x: 7, y: 20, w: 32, h: 32 }), style.mutedText),
      note: styled(text('note', 'Примечание', 'Чипы заменяются на фото партии. Названия тонов правятся в подписи.', 'small', { x: 7, y: 56, w: 32, h: 12 }), style.darkText),
      chip1: styled(image('chip1', 'Тон 1', placeholderImages.floatingWood, 'product', '1:1', { x: 44, y: 18, w: 15, h: 48 }), style.imagePlain),
      chip2: styled(image('chip2', 'Тон 2', placeholderImages.tileWood, 'product', '1:1', { x: 61, y: 18, w: 15, h: 48 }), style.imagePlain),
      chip3: styled(image('chip3', 'Тон 3', placeholderImages.catalogInteriorWood, 'product', '1:1', { x: 78, y: 18, w: 15, h: 48 }), style.imagePlain),
      n1: styled(text('n1', 'Подпись 1', 'Светлый', 'small', { x: 44, y: 68, w: 15, h: 5 }), style.darkText),
      n2: styled(text('n2', 'Подпись 2', 'Натуральный', 'small', { x: 61, y: 68, w: 15, h: 5 }), style.darkText),
      n3: styled(text('n3', 'Подпись 3', 'Тёмный', 'small', { x: 78, y: 68, w: 15, h: 5 }), style.darkText),
      caption: styled(text('caption', 'Подпись сцены', 'Вертикальные чипы, а не сетка SKU и не outdoor-ряд 20 мм.', 'small', { x: 44, y: 78, w: 49, h: 8 }), style.mutedText)
    }
  ),

  template(
    'catalog_wood_full_scene',
    'catalog_interior',
    'Планка: сцена раскладки',
    'Почти полноэкранная жилая сцена одной раскладки планок и микроподпись.',
    placeholderImages.previewInteriorProducts,
    {
      scene: styled(image('scene', 'Интерьер 16:9', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 7, y: 9.2, w: 86, h: 68 }), style.imageShadow),
      caption: styled(text('caption', 'Подпись сцены', 'Прямая раскладка · 20x120 · 9 мм', 'small', { x: 7, y: 80, w: 42, h: 6 }), style.darkText),
      formatNote: styled(text('formatNote', 'Формат', 'Жилой пол, не терраса 20 мм', 'small', { x: 52, y: 80, w: 41, h: 6 }), style.mutedText)
    }
  ),

  template(
    'catalog_wood_surface_split',
    'catalog_specs',
    'Планка: пол / стена / столешница',
    'Три вертикальных применения одной планки: пол, стена и столешница.',
    placeholderImages.previewTechnicalIcons,
    {
      heading: styled(text('heading', 'Заголовок', 'Одна планка — три плоскости', 'h1', { x: 7, y: 9.2, w: 70, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Разрез применения без outdoor-укладки: пол комнаты, акцентная стена и рабочая столешница.', 'body', { x: 7, y: 18, w: 86, h: 7 }), style.mutedText),
      floor: styled(image('floor', 'Пол', placeholderImages.tileWood, 'product', '1:2', { x: 7, y: 28, w: 26, h: 34 }), style.imagePlain),
      wall: styled(image('wall', 'Стена', placeholderImages.floatingWood, 'product', '1:2', { x: 37, y: 28, w: 26, h: 34 }), style.imagePlain),
      top: styled(image('top', 'Столешница', placeholderImages.catalogInteriorWood, 'product', '1:2', { x: 67, y: 28, w: 26, h: 34 }), style.imagePlain),
      t1: styled(text('t1', 'Название', 'Пол', 'h2', { x: 7, y: 64, w: 26, h: 5 }), style.darkText),
      t2: styled(text('t2', 'Название', 'Стена', 'h2', { x: 37, y: 64, w: 26, h: 5 }), style.darkText),
      t3: styled(text('t3', 'Название', 'Столешница', 'h2', { x: 67, y: 64, w: 26, h: 5 }), style.darkText),
      d1: styled(text('d1', 'Описание', 'Прямая раскладка 20x120, жилые зоны.', 'small', { x: 7, y: 70, w: 26, h: 10 }), style.mutedText),
      d2: styled(text('d2', 'Описание', 'Вертикальный набор на акцентную стену.', 'small', { x: 37, y: 70, w: 26, h: 10 }), style.mutedText),
      d3: styled(text('d3', 'Описание', 'Горизонтальный рез на кухне и ванной.', 'small', { x: 67, y: 70, w: 26, h: 10 }), style.mutedText)
    }
  ),

  template(
    'catalog_wood_plank_row',
    'catalog_grid',
    'Планка: ряд 20x120',
    'Один горизонтальный ряд интерьерных планок 20x120 — не outdoor-лист 20 мм.',
    placeholderImages.previewSampleGrid,
    {
      heading: styled(text('heading', 'Заголовок', 'Планки 20x120', 'h1', { x: 7, y: 9.2, w: 50, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Интерьерная линейка 9 мм. Широкие зоны, изображение вписывается целиком.', 'body', { x: 7, y: 18, w: 86, h: 7 }), style.mutedText),
      plank1: interiorPlank('plank1', placeholderImages.tileWood, 7, 30, 20, 22),
      plank2: interiorPlank('plank2', placeholderImages.floatingWood, 29, 30, 20, 22),
      plank3: interiorPlank('plank3', placeholderImages.catalogInteriorWood, 51, 30, 20, 22),
      plank4: interiorPlank('plank4', placeholderImages.tileWood, 73, 30, 20, 22),
      t1: styled(text('t1', 'Планка 1', 'Дуб светлый\n20x120 / 9 мм', 'small', { x: 7, y: 54, w: 20, h: 8 }), style.darkText),
      t2: styled(text('t2', 'Планка 2', 'Дуб натуральный\n20x120 / 9 мм', 'small', { x: 29, y: 54, w: 20, h: 8 }), style.darkText),
      t3: styled(text('t3', 'Планка 3', 'Дуб тёплый\n20x120 / 9 мм', 'small', { x: 51, y: 54, w: 20, h: 8 }), style.darkText),
      t4: styled(text('t4', 'Планка 4', 'Дуб графит\n20x120 / 9 мм', 'small', { x: 73, y: 54, w: 20, h: 8 }), style.darkText),
      note: styled(text('note', 'Примечание', 'Тёплая фактура дерева для жилых пространств. Рекомендуемая раскладка — со смещением до трети длины.', 'small', { x: 7, y: 78, w: 86, h: 8 }), style.mutedText)
    }
  ),

  template(
    'catalog_wood_herringbone',
    'catalog_specs',
    'Планка: ёлочка и прямой ряд',
    'Смещённые ряды планок как схема раскладки ёлочкой или прямым рядом, без газона.',
    placeholderImages.previewTechnicalIcons,
    {
      heading: styled(text('heading', 'Заголовок', 'Ёлочка и прямой ряд', 'h1', { x: 7, y: 9.2, w: 55, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Два ритма швов: классическая ёлочка и прямая линия. Схема, а не монтажный чертёж.', 'body', { x: 7, y: 18, w: 86, h: 7 }), style.mutedText),
      h1: interiorPlank('h1', placeholderImages.tileWood, 7, 28, 28, 8),
      h2: interiorPlank('h2', placeholderImages.floatingWood, 37, 28, 28, 8),
      h3: interiorPlank('h3', placeholderImages.catalogInteriorWood, 18, 38, 28, 8),
      h4: interiorPlank('h4', placeholderImages.tileWood, 48, 38, 28, 8),
      h5: interiorPlank('h5', placeholderImages.floatingWood, 7, 48, 28, 8),
      h6: interiorPlank('h6', placeholderImages.catalogInteriorWood, 37, 48, 28, 8),
      labelA: styled(text('labelA', 'Название', 'Ёлочка', 'h2', { x: 7, y: 60, w: 28, h: 5 }), style.darkText),
      copyA: styled(text('copyA', 'Описание', 'Смещённый стык ломает длину комнаты и собирает рисунок волокна в зигзаг.', 'small', { x: 7, y: 66, w: 40, h: 10 }), style.mutedText),
      i1: interiorPlank('i1', placeholderImages.tileWood, 52, 60, 41, 6),
      i2: interiorPlank('i2', placeholderImages.floatingWood, 52, 67.5, 41, 6),
      labelB: styled(text('labelB', 'Название', 'Прямой ряд', 'h2', { x: 52, y: 75, w: 41, h: 5 }), style.darkText),
      copyB: styled(text('copyB', 'Описание', 'Прямые ряды, длинный шов, спокойный пол в лофте и общепите.', 'small', { x: 52, y: 80, w: 41, h: 7 }), style.mutedText)
    }
  ),

  template(
    'catalog_wood_companions',
    'catalog_interior',
    'Планка: камень и дерево',
    'Парный разворот: каменный компаньон и древесная планка с короткой связкой.',
    placeholderImages.previewInteriorProducts,
    {
      heading: styled(text('heading', 'Заголовок', 'Камень рядом с деревом', 'h1', { x: 7, y: 9.2, w: 60, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Тёплый дуб держит жилую зону, камень забирает влажные и общественные плоскости.', 'body', { x: 7, y: 18, w: 86, h: 7 }), style.mutedText),
      stone: styled(image('stone', 'Камень', placeholderImages.tile120Stone, 'product', '1:2', { x: 7, y: 28, w: 38, h: 42 }), style.imagePlain),
      wood: styled(image('wood', 'Дерево', placeholderImages.tileWood, 'product', '1:2', { x: 55, y: 28, w: 38, h: 42 }), style.imagePlain),
      n1: styled(text('n1', 'Позиция 1', 'Камень\n60x120 · мат', 'small', { x: 7, y: 72, w: 38, h: 8 }), style.darkText),
      n2: styled(text('n2', 'Позиция 2', 'Дуб\n20x120 · мат', 'small', { x: 55, y: 72, w: 38, h: 8 }), style.darkText),
      note: styled(text('note', 'Примечание', 'Связка для кухни-гостиной: пол из планки, фартук или остров из камня.', 'small', { x: 7, y: 82, w: 86, h: 6 }), style.mutedText)
    }
  ),

  template(
    'catalog_wood_grain_macro',
    'catalog_visual_focus',
    'Планка: макро волокна',
    'Крупный кадр рисунка древесины и короткая подпись фактуры.',
    placeholderImages.previewMoodboard,
    {
      macro: styled(image('macro', 'Макро 1:1', placeholderImages.tileWood, 'product', '1:1', { x: 7, y: 9.2, w: 58, h: 72 }), style.imagePlain),
      heading: styled(text('heading', 'Заголовок', 'Рисунок волокна', 'h1', { x: 70, y: 18, w: 23, h: 12 }), style.darkText),
      story: styled(text('story', 'Описание', 'Спокойные годичные кольца без контрастного сучка. Макро показывает, как планка читается вблизи — на столе и на стене.', 'body', { x: 70, y: 34, w: 23, h: 24 }), style.mutedText),
      caption: styled(text('caption', 'Подпись сцены', 'Натуральный мат\n20x120', 'small', { x: 70, y: 62, w: 23, h: 10 }), style.darkText)
    }
  ),

  template(
    'catalog_wood_usage_icons',
    'catalog_specs',
    'Планка: зоны применения',
    'Иконки применения: пол, стена и влажные зоны — без уличной укладки.',
    placeholderImages.previewTechnicalIcons,
    {
      heading: styled(text('heading', 'Заголовок', 'Где работает планка', 'h1', { x: 7, y: 9.2, w: 60, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Короткий ориентир по зонам. Не заменяет проектную спецификацию.', 'body', { x: 7, y: 18, w: 86, h: 7 }), style.mutedText),
      icons: styled(iconRow('icons', 'Ключевые параметры', { x: 7, y: 28, w: 86, h: 12 }, [
        { id: 'wood-floor', iconId: 'floor', label: 'Пол', value: 'жилые зоны' },
        { id: 'wood-wall', iconId: 'wall', label: 'Стена', value: 'акцент' },
        { id: 'wood-wet', iconId: 'bathroom', label: 'Влажные', value: 'с уклоном' },
        { id: 'wood-thick', iconId: 'thickness', label: 'Толщина', value: '9 мм' }
      ]), style.softPanel),
      c1: styled(text('c1', 'Название', 'Пол', 'h2', { x: 7, y: 46, w: 26, h: 6 }), style.darkText),
      c2: styled(text('c2', 'Название', 'Стена', 'h2', { x: 37, y: 46, w: 26, h: 6 }), style.darkText),
      c3: styled(text('c3', 'Название', 'Влажные зоны', 'h2', { x: 67, y: 46, w: 26, h: 6 }), style.darkText),
      b1: styled(text('b1', 'Описание', 'Гостиная, спальня, коридор. Прямая раскладка или ёлочка. Тёплый пол — по рекомендации производителя.', 'body', { x: 7, y: 54, w: 26, h: 22 }), style.mutedText),
      b2: styled(text('b2', 'Описание', 'Акцентная стена и изголовье. Вертикальный набор удлиняет высоту комнаты, шов читается как ритм.', 'body', { x: 37, y: 54, w: 26, h: 22 }), style.mutedText),
      b3: styled(text('b3', 'Описание', 'Ванная и кухня при правильном уклоне и герметизации швов. Не путать с outdoor 20 мм.', 'body', { x: 67, y: 54, w: 26, h: 22 }), style.mutedText)
    }
  )
];
