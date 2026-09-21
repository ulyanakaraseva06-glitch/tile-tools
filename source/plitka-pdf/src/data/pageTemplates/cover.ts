import { placeholderImages, style, styled, text, badge, image, logo, iconRow, productCell, template } from './shared';

export const coverTemplates = [
  template('cover_architectural_catalog', 'cover', 'Обложка: архитектурный каталог', 'Солидная обложка каталога с интерьером, логотипом, серией и выпуском.', placeholderImages.previewCoverHero, {
    logo: logo({ x: 82, y: 2.0, w: 11, h: 5.2 }),
    heroImage: styled(image('heroImage', 'Интерьер 16:9', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 7, y: 8, w: 86, h: 43 }), style.imageShadow),
    brandBadge: styled(badge('brandBadge', 'Architectural catalog', { x: 8, y: 59, w: 31, h: 4.6 }), style.accentBadge),
    title: styled(text('title', 'Название каталога', 'Stone Systems', 'hero', { x: 8, y: 69, w: 48, h: 10 }), style.darkText),
    subtitle: styled(text('subtitle', 'Описание', 'Коллекции керамогранита для жилых и коммерческих интерьеров.', 'body', { x: 8, y: 84, w: 48, h: 8 }), style.mutedText),
    issue: styled(text('issue', 'Выпуск', 'CATALOG 2026\nformats / finishes / applications', 'small', { x: 65, y: 74, w: 25, h: 7 }), style.mutedText),
    formatChip: styled(text('formatChip', 'Форматы', '60x60 / 60x120', 'small', { x: 65, y: 62, w: 25, h: 4.6 }, 'center'), style.softPanel),
    finishChip: styled(text('finishChip', 'Финиш', 'матовая / сатин', 'small', { x: 65, y: 67.5, w: 25, h: 4.6 }, 'center'), style.softPanel),
    accentTile: styled(image('accentTile', 'Образец', placeholderImages.floatingStone, 'product', '1:1', { x: 66, y: 83, w: 16, h: 11.4 }), style.imagePlain)
  }),

  template('cover_catalog_hero', 'cover', 'Обложка: крупный интерьер', 'Обложка коллекции с отдельной зоной заголовка, логотипом и плиточным акцентом.', placeholderImages.previewCoverHero, {
    heroImage: styled(image('heroImage', 'Интерьер 16:9', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 43, y: 17, w: 49, h: 36 }), style.imageShadow),
    brandBadge: styled(badge('brandBadge', 'Коллекция', { x: 7, y: 8, w: 19, h: 4.6 }), style.accentBadge),
    title: styled(text('title', 'Название коллекции', 'Sierra Stone', 'hero', { x: 7, y: 19, w: 34, h: 12 }), style.darkText),
    subtitle: styled(text('subtitle', 'Короткое описание', 'Нейтральный керамогранит для спокойных современных интерьеров.', 'body', { x: 7, y: 35, w: 32, h: 10 }), style.mutedText),
    issue: styled(text('issue', 'Выпуск', 'CATALOG 2026', 'small', { x: 7, y: 50, w: 20, h: 4.4 }, 'center'), style.softPanel),
    accentTile: productCell('accentTile', placeholderImages.floatingStone, 10, 58, 18),
    formatNote: styled(text('formatNote', 'Форматы', '60x60 / 60x120\nматовая поверхность\nректифицированный край', 'small', { x: 33, y: 66, w: 35, h: 9 }), style.mutedText),
    quickIcons: styled(iconRow('quickIcons', 'Иконки характеристик', { x: 33, y: 79, w: 48, h: 12 }, [
      { id: 'cover-size', iconId: 'large-format', label: 'Форматы', value: '2 размера' },
      { id: 'cover-matte', iconId: 'matte', label: 'Финиш', value: 'матовый' },
      { id: 'cover-floor', iconId: 'floor', label: 'Зоны', value: 'пол / стены' }
    ]), style.softPanel)
  }),

  template('cover_materials_intro', 'cover', 'Обложка: материалы и фактуры', 'Спокойная обложка с фактурной композицией и местом под логотип.', placeholderImages.previewCoverHero, {
    brandBadge: styled(badge('brandBadge', 'Материалы', { x: 7, y: 8, w: 19, h: 4.6 }), style.accentBadge),
    title: styled(text('title', 'Название документа', 'Подборка плитки\nдля проекта', 'hero', { x: 7, y: 20, w: 40, h: 14 }), style.darkText),
    subtitle: styled(text('subtitle', 'Описание', 'Готовый набор форматов, поверхностей и интерьерных решений для согласования.', 'body', { x: 7, y: 39, w: 38, h: 10 }), style.mutedText),
    specChip: styled(text('specChip', 'Состав', 'stone / marble / wood', 'small', { x: 7, y: 52, w: 31, h: 4.6 }, 'center'), style.softPanel),
    interior: styled(image('interior', 'Интерьер 4:3', placeholderImages.catalogInteriorWarm, 'interior', '4:3', { x: 52, y: 18, w: 40, h: 30 }), style.imageShadow),
    tile1: productCell('tile1', placeholderImages.tile60Stone, 9, 62, 18),
    tile2: productCell('tile2', placeholderImages.tile120Marble, 31, 62, 18),
    tile3: productCell('tile3', placeholderImages.tileWood, 53, 62, 18),
    note: styled(text('note', 'Техническая подпись', 'Камень / мрамор / дерево\nПалитра проекта', 'small', { x: 75, y: 64, w: 17, h: 9 }), style.mutedText)
  }),

  template('cover_dark_statement', 'cover', 'Обложка: темный акцент', 'Контрастная обложка для премиальной подборки с крупным интерьером.', placeholderImages.previewCoverHero, {
    logo: logo({ x: 82, y: 2.0, w: 11, h: 5.2 }),
    background: styled(image('background', 'Интерьер 16:9', placeholderImages.catalogInteriorDark, 'interior', '16:9', { x: 7, y: 8, w: 86, h: 44 }), style.imageShadow),
    brandBadge: styled(badge('brandBadge', 'Premium selection', { x: 9, y: 59, w: 28, h: 4.6 }), style.accentBadge),
    title: styled(text('title', 'Название документа', 'Stone & Marble', 'hero', { x: 9, y: 69, w: 48, h: 11 }), style.darkText),
    subtitle: styled(text('subtitle', 'Описание', 'Подборка керамогранита под камень и мрамор для проекта.', 'body', { x: 9, y: 84, w: 52, h: 8 }), style.mutedText),
    formatChip: styled(text('formatChip', 'Форматы', 'large format / porcelain', 'small', { x: 64, y: 58, w: 25, h: 4.6 }, 'center'), style.softPanel),
    accentTile: productCell('accentTile', placeholderImages.floatingMarble, 70, 64, 17)
  })
];
