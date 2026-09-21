import { placeholderImages, style, styled, text, badge, productCell, template } from './shared';

export const catalogMoodboardTemplates = [
  template('catalog_moodboard_modern', 'catalog_moodboard', 'Moodboard: фактуры', 'Материальная страница с несколькими фактурами и заметкой по применению.', placeholderImages.previewMoodboard, {
    brandBadge: styled(badge('brandBadge', 'Moodboard', { x: 8, y: 8, w: 21, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Палитра материалов', 'h1', { x: 8, y: 19, w: 39, h: 8 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Камень, мрамор и дерево в одном спокойном направлении для проекта.', 'body', { x: 8, y: 31, w: 33, h: 10 }), style.mutedText),
    material1: productCell('material1', placeholderImages.tile60Stone, 8, 51),
    material2: productCell('material2', placeholderImages.tile120Marble, 39, 51),
    material3: productCell('material3', placeholderImages.tileWood, 70, 51),
    material4: productCell('material4', placeholderImages.tile60Marble, 39, 74),
    note: styled(text('note', 'Примечание', 'Используйте страницу как визуальное направление перед точным подбором SKU.', 'small', { x: 8, y: 80, w: 28, h: 10 }), style.mutedText)
  })
];
