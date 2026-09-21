import { placeholderImages, catalogRows, productColumns, style, styled, text, badge, image, table, features, iconRow, productCell, template } from './shared';

export const catalogSpecsTemplates = [
  template('catalog_format_comparison', 'catalog_specs', 'Каталог: сравнение форматов', 'Сравнение 60x60, 60x120 и 20x120 с масштабной подачей.', placeholderImages.previewSampleGrid, {
    brandBadge: styled(badge('brandBadge', 'Formats', { x: 7, y: 8, w: 17, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Сравнение форматов', 'h1', { x: 29, y: 8, w: 43, h: 7 }), style.darkText),
    tile60: productCell('tile60', placeholderImages.tile60Stone, 8, 31, 19),
    tile120: productCell('tile120', placeholderImages.tile120Marble, 37, 31, 19),
    plank: productCell('plank', placeholderImages.tileWood, 66, 31, 19),
    label60: styled(text('label60', '60x60', '60x60\nуниверсальный пол\nи стены', 'small', { x: 8, y: 53, w: 20, h: 9 }), style.darkText),
    label120: styled(text('label120', '60x120', '60x120\nкрупная плоскость\nменьше швов', 'small', { x: 37, y: 53, w: 20, h: 9 }), style.darkText),
    labelWood: styled(text('labelWood', '20x120', '20x120\nформат планки\nпод дерево', 'small', { x: 66, y: 53, w: 20, h: 9 }), style.darkText),
    icons: styled(iconRow('icons', 'Иконки', { x: 8, y: 76, w: 84, h: 12 }, [
      { id: 'format-size', iconId: 'large-format', label: 'Крупный формат', value: '60x120' },
      { id: 'format-square', iconId: 'square-format', label: 'Квадрат', value: '60x60' },
      { id: 'format-floor', iconId: 'floor', label: 'Пол', value: 'все форматы' }
    ]), style.softPanel)
  }),

  template('catalog_surface_finish_detail', 'catalog_specs', 'Каталог: поверхность и финиш', 'Макро-фактура, финиши, иконки и технические подписи.', placeholderImages.previewMoodboard, {
    heading: styled(text('heading', 'Заголовок', 'Поверхность и финиш', 'h1', { x: 7, y: 8, w: 45, h: 7 }), style.darkText),
    macro: styled(image('macro', 'Макро-фактура', placeholderImages.textureGreige, 'product', '1:1', { x: 8, y: 25, w: 31, h: 22 }), style.imagePlain),
    slab: productCell('slab', placeholderImages.floatingStone, 50, 25, 18),
    finishText: styled(text('finishText', 'Описание финиша', 'Матовая поверхность снижает блики и делает коллекцию спокойной в больших пространствах.', 'body', { x: 8, y: 57, w: 45, h: 11 }), style.mutedText),
    icons: styled(iconRow('icons', 'Иконки финиша', { x: 8, y: 78, w: 84, h: 11 }, [
      { id: 'finish-matte', iconId: 'matte', label: 'Матовая', value: 'да' },
      { id: 'finish-rectified', iconId: 'rectified', label: 'Край', value: 'ректиф.' },
      { id: 'finish-water', iconId: 'water', label: 'Влажные зоны', value: 'да' }
    ]), style.softPanel),
    note: styled(text('note', 'Техническая подпись', 'Доступность финиша уточняется по конкретному артикулу и партии.', 'small', { x: 70, y: 33, w: 20, h: 10 }), style.mutedText)
  }),

  template('catalog_application_spec', 'catalog_specs', 'Каталог: применение и спецификация', 'Интерьерная сцена и спецификация применения для серии.', placeholderImages.previewInteriorProducts, {
    interior: styled(image('interior', 'Интерьер 9:16', placeholderImages.catalogInteriorWood, 'interior', '9:16', { x: 7, y: 8, w: 33, h: 52 }), style.imageShadow),
    heading: styled(text('heading', 'Заголовок', 'Применение серии', 'h1', { x: 49, y: 10, w: 38, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Страница помогает связать интерьерный образ с техническими зонами применения.', 'body', { x: 49, y: 21, w: 39, h: 10 }), style.mutedText),
    icons: styled(iconRow('icons', 'Применение', { x: 49, y: 39, w: 43, h: 16 }, [
      { id: 'app-floor', iconId: 'floor', label: 'Пол', value: 'да' },
      { id: 'app-wall', iconId: 'wall', label: 'Стены', value: 'да' },
      { id: 'app-bath', iconId: 'bathroom', label: 'Санузел', value: 'да' },
      { id: 'app-heat', iconId: 'heated-floor', label: 'Теплый пол', value: 'да' }
    ]), style.softPanel),
    table: styled(table('table', 'Спецификация', productColumns, catalogRows.slice(0, 3), { x: 49, y: 66, w: 43, h: 18 }), style.whitePanel)
  }),

  template('catalog_installation_patterns', 'catalog_specs', 'Каталог: варианты раскладки', 'Варианты раскладки и паттернов через простые блоки и подписи.', placeholderImages.previewSampleGrid, {
    heading: styled(text('heading', 'Заголовок', 'Варианты раскладки', 'h1', { x: 7, y: 8, w: 44, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Схемы помогают показать разницу между квадратным, крупным и планочным форматами.', 'body', { x: 7, y: 19, w: 54, h: 8 }), style.mutedText),
    pattern1: styled(features('pattern1', 'Раскладка 1', ['60x60', 'шов', 'пол', 'стены'], { x: 8, y: 35, w: 24, h: 22 }), style.whitePanel),
    pattern2: styled(features('pattern2', 'Раскладка 2', ['60x120', 'смещение', 'крупная', 'плоскость'], { x: 38, y: 35, w: 24, h: 22 }), style.whitePanel),
    pattern3: styled(features('pattern3', 'Раскладка 3', ['20x120', 'планка', 'теплый', 'пол'], { x: 68, y: 35, w: 24, h: 22 }), style.whitePanel),
    sample1: productCell('sample1', placeholderImages.tile60Stone, 10, 68, 14),
    sample2: productCell('sample2', placeholderImages.tile120Marble, 40, 68, 14),
    sample3: productCell('sample3', placeholderImages.tileWood, 70, 68, 14),
    note: styled(text('note', 'Примечание', 'Для финального проекта раскладку нужно проверять по реальным размерам помещения и швам.', 'small', { x: 8, y: 86.8, w: 70, h: 4.8 }), style.mutedText)
  })
];
