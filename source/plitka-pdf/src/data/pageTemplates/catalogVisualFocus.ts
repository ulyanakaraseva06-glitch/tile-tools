import { placeholderImages, catalogRows, productColumns, style, styled, text, badge, image, table, iconRow, productCell, divider, template } from './shared';

export const catalogVisualFocusTemplates = [
  template('catalog_interior_large_tile_focus', 'catalog_visual_focus', 'Каталог: интерьер + крупная плитка', 'Один интерьер, одна крупная плита, артикул и компактные характеристики.', placeholderImages.previewProductHero, {
    brandBadge: styled(badge('brandBadge', 'Visual focus', { x: 7, y: 10, w: 24, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Интерьер и плита', 'h1', { x: 36, y: 10, w: 38, h: 7 }), style.darkText),
    interior: styled(image('interior', 'Интерьер 16:9', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 7, y: 22, w: 55, h: 39 }), style.imageShadow),
    product: productCell('product', placeholderImages.tile120Stone, 68, 28, 24),
    productText: styled(text('productText', 'Позиция', 'ST-612\\n60x120 / матовая\\nкерамогранит под камень', 'small', { x: 68, y: 47, w: 24, h: 10 }), style.darkText),
    specRule: divider('specRule', { x: 68, y: 62.5, w: 24, h: 0.22 }),
    icons: styled(iconRow('icons', 'Характеристики', { x: 8, y: 72, w: 58, h: 9 }, [
      { id: 'focus-size', iconId: 'large-format', label: 'Формат', value: '60x120' },
      { id: 'focus-finish', iconId: 'matte', label: 'Финиш', value: 'матовый' },
      { id: 'focus-floor', iconId: 'floor', label: 'Зоны', value: 'пол / стены' }
    ]), style.softPanel),
    note: styled(text('note', 'Примечание', 'Страница подходит для первого листа коллекции или презентации ключевого артикула.', 'small', { x: 8, y: 85, w: 65, h: 5 }), style.mutedText)
  }),

  template('catalog_interior_two_large_tiles', 'catalog_visual_focus', 'Каталог: интерьер + две большие плитки', 'Интерьерная сцена и две крупные товарные позиции с описаниями.', placeholderImages.previewProductHero, {
    heading: styled(text('heading', 'Заголовок', 'Две позиции серии', 'h1', { x: 7, y: 10, w: 42, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Базовая и акцентная плита в одном интерьерном сценарии.', 'body', { x: 52, y: 11, w: 37, h: 8 }), style.mutedText),
    interior: styled(image('interior', 'Интерьер 4:3', placeholderImages.catalogInteriorWarm, 'interior', '4:3', { x: 7, y: 24, w: 46, h: 34 }), style.imageShadow),
    tile1: productCell('tile1', placeholderImages.tile60Stone, 61, 27, 22),
    tileText1: styled(text('tileText1', 'Позиция 1', 'ST-601\\n60x60 / матовая\\nбазовый тон', 'small', { x: 61, y: 44, w: 28, h: 9 }), style.darkText),
    tile2: productCell('tile2', placeholderImages.tile120Marble, 61, 62, 22),
    tileText2: styled(text('tileText2', 'Позиция 2', 'MR-612\\n60x120 / сатин\\nмраморный акцент', 'small', { x: 61, y: 79, w: 28, h: 9 }), style.darkText),
    lowerRule: divider('lowerRule', { x: 7, y: 66, w: 46, h: 0.22 }),
    note: styled(text('note', 'Примечание', 'Формат удобен, когда нужно показать основную плитку и акцент без перегруза таблицами.', 'small', { x: 7, y: 72, w: 43, h: 8 }), style.mutedText)
  }),

  template('catalog_two_interiors_large_tile', 'catalog_visual_focus', 'Каталог: два интерьера + крупная плитка', 'Две интерьерные сцены и одна ключевая плита с технической выжимкой.', placeholderImages.previewInteriorProducts, {
    brandBadge: styled(badge('brandBadge', 'Scenes', { x: 7, y: 10, w: 17, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Один материал в двух сценах', 'h1', { x: 29, y: 10, w: 48, h: 7 }), style.darkText),
    interior1: styled(image('interior1', 'Интерьер 16:9', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 7, y: 24, w: 39, h: 25 }), style.imageShadow),
    interior2: styled(image('interior2', 'Интерьер 4:3', placeholderImages.catalogInteriorDark, 'interior', '4:3', { x: 7, y: 58, w: 39, h: 29 }), style.imageShadow),
    product: productCell('product', placeholderImages.tile120Stone, 58, 31, 27),
    productText: styled(text('productText', 'Позиция', 'ST-612 Sierra Stone Large\\n60x120 / матовая / 9 мм\\nпол и стены', 'small', { x: 58, y: 53, w: 32, h: 12 }), style.darkText),
    icons: styled(iconRow('icons', 'Иконки', { x: 58, y: 74, w: 34, h: 9 }, [
      { id: 'scene-wall', iconId: 'wall', label: 'Стены', value: 'да' },
      { id: 'scene-floor', iconId: 'floor', label: 'Пол', value: 'да' }
    ]), style.softPanel)
  }),

  template('catalog_two_interiors_two_tiles', 'catalog_visual_focus', 'Каталог: два интерьера + две плитки', 'Две интерьерные зоны и две крупные позиции-компаньона.', placeholderImages.previewInteriorProducts, {
    heading: styled(text('heading', 'Заголовок', 'Сцены и материалы', 'h1', { x: 7, y: 10, w: 42, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Покажите, как базовая и акцентная плитка работают в разных помещениях.', 'body', { x: 50, y: 11, w: 41, h: 8 }), style.mutedText),
    interior1: styled(image('interior1', 'Интерьер 16:9', placeholderImages.catalogInteriorWarm, 'interior', '16:9', { x: 7, y: 24, w: 40, h: 25 }), style.imageShadow),
    interior2: styled(image('interior2', 'Интерьер 16:9', placeholderImages.catalogInteriorMarble, 'interior', '16:9', { x: 52, y: 24, w: 40, h: 25 }), style.imageShadow),
    tile1: productCell('tile1', placeholderImages.tile60Stone, 8, 62, 20),
    tileText1: styled(text('tileText1', 'Плитка 1', 'ST-601\\n60x60 / матовая\\nтеплый камень', 'small', { x: 31, y: 63, w: 18, h: 9 }), style.darkText),
    tile2: productCell('tile2', placeholderImages.tile120Marble, 54, 62, 20),
    tileText2: styled(text('tileText2', 'Плитка 2', 'MR-612\\n60x120 / сатин\\nсветлый мрамор', 'small', { x: 77, y: 63, w: 15, h: 9 }), style.darkText),
    bottomNote: styled(text('bottomNote', 'Примечание', 'Вариант для каталога, где важны и реальные сцены, и конкретные SKU.', 'small', { x: 8, y: 84, w: 66, h: 5 }), style.mutedText)
  }),

  template('catalog_full_interior_slab_specs', 'catalog_visual_focus', 'Каталог: полный интерьер + плита', 'Большая интерьерная сцена, крупная плита и компактная техническая выжимка.', placeholderImages.previewProductHero, {
    interior: styled(image('interior', 'Интерьер 16:9', placeholderImages.catalogInteriorDark, 'interior', '16:9', { x: 7, y: 10, w: 86, h: 42 }), style.imageShadow),
    brandBadge: styled(badge('brandBadge', 'Focus SKU', { x: 8, y: 58, w: 20, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Крупная плита в интерьере', 'h1', { x: 8, y: 68, w: 42, h: 7 }), style.darkText),
    product: productCell('product', placeholderImages.tile120Marble, 59, 61, 25),
    productText: styled(text('productText', 'Позиция', 'MR-612\\n60x120 / сатин\\nкерамогранит под мрамор', 'small', { x: 59, y: 81, w: 30, h: 8 }), style.darkText),
    icons: styled(iconRow('icons', 'Характеристики', { x: 8, y: 80, w: 38, h: 9 }, [
      { id: 'full-size', iconId: 'large-format', label: 'Формат', value: '60x120' },
      { id: 'full-finish', iconId: 'matte', label: 'Финиш', value: 'сатин' }
    ]), style.softPanel)
  }),

  template('catalog_split_scene_tile_table', 'catalog_visual_focus', 'Каталог: интерьер + плита + SKU', 'Интерьер, крупная плитка и мини-таблица ассортиментных позиций.', placeholderImages.previewProductHero, {
    heading: styled(text('heading', 'Заголовок', 'Сцена и SKU', 'h1', { x: 7, y: 10, w: 34, h: 7 }), style.darkText),
    interior: styled(image('interior', 'Интерьер 4:3', placeholderImages.catalogInteriorLiving, 'interior', '4:3', { x: 7, y: 24, w: 43, h: 32 }), style.imageShadow),
    product: productCell('product', placeholderImages.tile120Stone, 60, 24, 25),
    productText: styled(text('productText', 'Позиция', 'ST-612\\n60x120 / матовая\\nосновной формат серии', 'small', { x: 60, y: 45, w: 28, h: 9 }), style.darkText),
    table: styled(table('table', 'Мини-таблица SKU', productColumns, catalogRows.slice(0, 3), { x: 7, y: 67, w: 86, h: 18 }), style.whitePanel),
    note: styled(text('note', 'Примечание', 'Мини-таблица помогает быстро связать визуальную подачу и коммерческие позиции.', 'small', { x: 7, y: 88, w: 67, h: 4 }), style.mutedText)
  }),

  template('catalog_vertical_room_slab', 'catalog_visual_focus', 'Каталог: вертикальный интерьер + плита', 'Вертикальная интерьерная сцена и крупная плита для страниц с ванной или узким пространством.', placeholderImages.previewInteriorProducts, {
    interior: styled(image('interior', 'Интерьер 9:16', placeholderImages.catalogInteriorWood, 'interior', '9:16', { x: 7, y: 10, w: 35, h: 58 }), style.imageShadow),
    brandBadge: styled(badge('brandBadge', 'Room focus', { x: 50, y: 11, w: 21, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Вертикальная сцена', 'h1', { x: 50, y: 22, w: 39, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Подходит для санузла, кухни, коридора или страницы по отдельному помещению.', 'body', { x: 50, y: 33, w: 38, h: 9 }), style.mutedText),
    product: productCell('product', placeholderImages.tileWood, 53, 53, 24),
    productText: styled(text('productText', 'Позиция', 'WD-212\\n20x120 / матовая\\nкерамогранит под дерево', 'small', { x: 53, y: 72, w: 31, h: 9 }), style.darkText),
    note: styled(text('note', 'Примечание', 'Вертикальный интерьер можно заменить на фото узкого помещения без потери структуры страницы.', 'small', { x: 7, y: 82, w: 43, h: 7 }), style.mutedText)
  }),

  template('catalog_scene_companion_products', 'catalog_visual_focus', 'Каталог: сцена + компаньоны', 'Интерьерная сцена, базовая плитка и сопутствующий материал.', placeholderImages.previewInteriorProducts, {
    heading: styled(text('heading', 'Заголовок', 'Сцена и компаньоны', 'h1', { x: 7, y: 10, w: 42, h: 7 }), style.darkText),
    interior: styled(image('interior', 'Интерьер 16:9', placeholderImages.catalogInteriorWarm, 'interior', '16:9', { x: 7, y: 24, w: 54, h: 34 }), style.imageShadow),
    base: productCell('base', placeholderImages.tile60Stone, 68, 25, 21),
    baseText: styled(text('baseText', 'База', 'ST-601\\n60x60 / матовая\\nосновной фон', 'small', { x: 68, y: 42, w: 24, h: 9 }), style.darkText),
    companion: productCell('companion', placeholderImages.tileWood, 68, 61, 21),
    companionText: styled(text('companionText', 'Компаньон', 'WD-212\\n20x120 / матовая\\nтеплый акцент', 'small', { x: 68, y: 78, w: 24, h: 9 }), style.darkText),
    usage: styled(iconRow('usage', 'Применение', { x: 8, y: 72, w: 50, h: 9 }, [
      { id: 'comp-floor', iconId: 'floor', label: 'Пол', value: 'да' },
      { id: 'comp-wall', iconId: 'wall', label: 'Стены', value: 'да' }
    ]), style.softPanel)
  })
];
