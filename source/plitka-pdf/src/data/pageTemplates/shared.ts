import { PageCategory, PageTemplate } from '../../types/templates';
import { DividerZone, EditableZone, FeatureZone, IconZone, ImageZone, PanelZone, TableZone, TextZone, ZoneLayout } from '../../types/project';
import { placeholderImages } from '../defaultTexts';
export { placeholderImages };

export const catalogRows = [
  { article: 'ST-601', title: 'Sierra Stone Warm', format: '60x60', surface: 'матовая', thickness: '9 мм', quantity: 42, price: 2450, total: '' },
  { article: 'ST-612', title: 'Sierra Stone Large', format: '60x120', surface: 'матовая', thickness: '9 мм', quantity: 28, price: 3290, total: '' },
  { article: 'MR-601', title: 'Linea Marmo Ivory', format: '60x60', surface: 'сатин', thickness: '9 мм', quantity: 24, price: 2690, total: '' },
  { article: 'MR-612', title: 'Linea Marmo Vein', format: '60x120', surface: 'сатин', thickness: '9 мм', quantity: 18, price: 3540, total: '' },
  { article: 'WD-212', title: 'Oakline Soft', format: '20x120', surface: 'матовая', thickness: '9 мм', quantity: 35, price: 2980, total: '' }
];

export const rangeRows = [
  { article: 'ST-601', title: 'Stone Warm', format: '60x60', surface: 'матовая', thickness: '9 мм', usage: 'пол / стены' },
  { article: 'ST-612', title: 'Stone Large', format: '60x120', surface: 'матовая', thickness: '9 мм', usage: 'пол / стены' },
  { article: 'MR-601', title: 'Marmo Ivory', format: '60x60', surface: 'сатин', thickness: '9 мм', usage: 'стены / акцент' },
  { article: 'MR-612', title: 'Marmo Vein', format: '60x120', surface: 'сатин', thickness: '9 мм', usage: 'пол / стены' },
  { article: 'WD-212', title: 'Oakline Soft', format: '20x120', surface: 'матовая', thickness: '9 мм', usage: 'пол' }
];

export const priceColumns: TableZone['columns'] = [
  { id: 'article', label: 'Артикул' },
  { id: 'title', label: 'Название' },
  { id: 'format', label: 'Формат' },
  { id: 'quantity', label: 'Кол-во', type: 'quantity' },
  { id: 'price', label: 'Цена', type: 'price' },
  { id: 'total', label: 'Итого', type: 'total' }
];

export const productColumns: TableZone['columns'] = [
  { id: 'article', label: 'Артикул' },
  { id: 'format', label: 'Формат' },
  { id: 'surface', label: 'Поверхность' },
  { id: 'thickness', label: 'Толщина' }
];

export const rangeColumns: TableZone['columns'] = [
  { id: 'article', label: 'Артикул' },
  { id: 'title', label: 'Название' },
  { id: 'format', label: 'Формат' },
  { id: 'surface', label: 'Финиш' },
  { id: 'usage', label: 'Применение' }
];

export const packagingColumns: TableZone['columns'] = [
  { id: 'article', label: 'Артикул' },
  { id: 'format', label: 'Формат' },
  { id: 'quantity', label: 'м2' },
  { id: 'price', label: 'Цена', type: 'price' },
  { id: 'total', label: 'Итого', type: 'total' }
];

export const techIcons: NonNullable<IconZone['items']> = [
  { id: 'tech-size', iconId: 'size', label: 'Формат', value: '60x120' },
  { id: 'tech-finish', iconId: 'matte', label: 'Финиш', value: 'матовый' },
  { id: 'tech-thickness', iconId: 'thickness', label: 'Толщина', value: '9 мм' },
  { id: 'tech-usage', iconId: 'floor', label: 'Зоны', value: 'пол / стены' }
];

export const style = {
  darkText: { textColor: '#242321', borderRadius: 0 },
  mutedText: { textColor: '#6f6a63', borderRadius: 0 },
  lightText: { textColor: '#f7f3ec', borderRadius: 0 },
  accentBadge: { textColor: '#ffffff', borderRadius: 0 },
  softPanel: { backgroundColor: '#f7f4ef', borderRadius: 0 },
  whitePanel: { backgroundColor: '#ffffff', borderRadius: 0 },
  darkPanel: { backgroundColor: '#292724', textColor: '#f7f3ec', borderRadius: 0 },
  imageShadow: { borderRadius: 0, shadow: 'none' as const },
  imagePlain: { borderRadius: 0 }
};

export const defaultDividerColor = '#B7B7B7';
export const defaultDividerThickness = 0.075;

export function styled<T extends EditableZone>(zone: T, zoneStyle: NonNullable<EditableZone['style']>): T {
  return { ...zone, style: zoneStyle };
}

export function textStyleRole(id: string, label: string, size?: TextZone['size']): string {
  const marker = `${id} ${label}`.toLowerCase();
  if (marker.includes('pagetop') || marker.includes('pagebottom') || marker.includes('микроподпись') || marker.includes('выпуск')) return 'header-footer';
  if (marker.includes('heading') || marker.includes('заголовок')) return 'page-heading';
  if (marker.includes('title') || marker.includes('название каталога') || marker.includes('название коллекции') || marker.includes('название документа')) return 'document-title';
  if (marker.includes('intro') || marker.includes('subtitle') || marker.includes('description') || marker.includes('описание')) return 'collection-description';
  if (marker.includes('note') || marker.includes('notes') || marker.includes('примечание') || marker.includes('подпись')) return 'note';
  if (marker.includes('sku') || /^l\d+$/i.test(id) || /^text\d+$/i.test(id)) return 'sku-caption';
  if (marker.includes('product') || marker.includes('tiletext') || marker.includes('caption') || marker.includes('позиция') || marker.includes('образец')) return 'product-caption';
  if (marker.includes('company') || marker.includes('manager') || marker.includes('address') || marker.includes('website') || marker.includes('сайт') || marker.includes('адрес')) return 'contact-text';
  if (marker.includes('summary') || marker.includes('total') || marker.includes('итог') || marker.includes('next')) return 'summary';
  if (size === 'hero' || size === 'h1') return 'page-heading';
  return 'collection-description';
}

export function text(id: string, label: string, value: string, size: TextZone['size'], layout: ZoneLayout, align?: TextZone['align']): TextZone {
  return { id, kind: 'text', label, value, size, align, layout, styleRole: textStyleRole(id, label, size) };
}

export function badge(id: string, value: string, layout: ZoneLayout): TextZone {
  return text(id, 'Акцентная плашка', value, 'badge', layout, 'center');
}

export function image(
  id: string,
  label: string,
  src: string,
  imageRole: NonNullable<ImageZone['imageRole']>,
  aspectRatio: NonNullable<ImageZone['aspectRatio']>,
  layout: ZoneLayout
): ImageZone {
  const fit = imageRole === 'interior' ? 'cover' : 'contain';
  return { id, kind: 'image', label, src, alt: label, imageRole, aspectRatio, fit, layout };
}

export function logo(layout: ZoneLayout): ImageZone {
  return styled(image('logo', 'Логотип', '', 'decorative', '2:1', layout), {
    backgroundColor: 'transparent',
    borderRadius: 0
  });
}

export function table(id: string, label: string, columns: TableZone['columns'], rows: TableZone['rows'], layout: ZoneLayout): TableZone {
  return { id, kind: 'table', label, columns, rows, layout };
}

export function features(id: string, label: string, items: string[], layout: ZoneLayout): FeatureZone {
  return { id, kind: 'features', label, items, layout };
}

export function iconRow(id: string, label: string, layout: ZoneLayout, items: IconZone['items']): IconZone {
  return { id, kind: 'icon', label, mode: 'row', size: 'sm', align: 'left', items, layout };
}

export function productCell(id: string, src: string, x: number, y: number, size = 22): ImageZone {
  return styled(image(id, 'Квадратная зона плитки', src, 'product', '1:1', { x, y, w: size, h: size * 0.71 }), style.imagePlain);
}

export function divider(id: string, layout: ZoneLayout): DividerZone {
  const marker = id.toLowerCase();
  const styleRole = marker.includes('page') ? 'page-rule' : marker.includes('product') || marker.includes('sku') || marker.includes('sample') ? 'product-rule' : 'content-rule';
  const normalizedLayout = layout.w <= layout.h
    ? { ...layout, w: defaultDividerThickness }
    : { ...layout, h: defaultDividerThickness };
  return styled({ id, kind: 'divider', label: 'Полоска', layout: normalizedLayout, styleRole }, {
    backgroundColor: defaultDividerColor,
    borderRadius: 0,
    shadow: 'none'
  });
}

export function panel(id: string, layout: ZoneLayout): PanelZone {
  const marker = id.toLowerCase();
  const styleRole = marker.includes('product') ? 'product-panel' : 'content-panel';
  return styled({ id, kind: 'panel', label: 'Плашка', layout, styleRole }, {
    borderRadius: 0
  });
}

export function microText(id: string, value: string, layout: ZoneLayout, align?: TextZone['align']): TextZone {
  return styled(text(id, 'Микроподпись', value, 'small', layout, align), style.mutedText);
}

export function pageKindLabel(category: PageCategory) {
  if (category === 'cover') return 'Каталог плитки';
  if (category === 'catalog') return 'Каталог / коллекция';
  if (category === 'catalog_overview') return 'Каталог / обзор серии';
  if (category === 'catalog_grid') return 'Каталог / товарная сетка';
  if (category === 'catalog_interior') return 'Каталог / интерьер и товары';
  if (category === 'catalog_visual_focus') return 'Каталог / интерьер + крупная плитка';
  if (category === 'catalog_specs') return 'Каталог / форматы и техданные';
  if (category === 'catalog_moodboard') return 'Каталог / moodboard';
  if (category === 'table') return 'Технические данные';
  if (category === 'price') return 'Коммерческий блок';
  if (category === 'contacts') return 'Контакты и следующий шаг';
  return 'Страница каталога';
}

export function bottomMetaLabel(category: PageCategory) {
  if (category === 'catalog_grid') return 'Коллекция · Форматы и поверхности';
  if (category === 'catalog_interior') return 'Материалы в пространстве · Интерьерные решения';
  if (category === 'catalog_visual_focus') return 'Фактура, свет и масштаб';
  if (category === 'catalog_specs') return 'Форматы, финиши, толщина и применение уточняются по конкретной партии';
  if (category === 'catalog_overview') return 'Коллекция · Материалы для вашего проекта';
  if (category === 'catalog_moodboard') return 'Материальные сочетания служат направлением перед точным подбором SKU';
  if (category === 'price') return 'Цены, наличие и сроки поставки уточняются по конкретному заказу';
  if (category === 'table') return 'Форматы, финиши, упаковка и применение проверяются по партии';
  if (category === 'contacts') return 'От первого образца до готового пространства';
  return 'Форматы 60x60 / 60x120 / 20x120 · поверхности: матовая / сатин · применение: пол / стены';
}

export function clampLayout(layout: ZoneLayout): ZoneLayout {
  return {
    x: Math.max(5, Math.min(92, layout.x)),
    y: Math.max(5, Math.min(92, layout.y)),
    w: Math.max(6, Math.min(88, layout.w)),
    h: Math.max(2, Math.min(34, layout.h))
  };
}

export function productPanelZones(category: PageCategory, zones: Record<string, EditableZone>): Record<string, EditableZone> {
  const catalogCategories = new Set<PageCategory>([
    'catalog',
    'catalog_overview',
    'catalog_grid',
    'catalog_interior',
    'catalog_visual_focus',
    'catalog_specs',
    'catalog_moodboard'
  ]);
  if (!catalogCategories.has(category)) return {};
  const entries = Object.values(zones);
  const productImages = entries.filter((zone): zone is ImageZone =>
    zone.kind === 'image' &&
    zone.imageRole === 'product'
  );
  const textZones = entries.filter((zone): zone is TextZone => zone.kind === 'text' && zone.value.trim().length > 0);
  const panels: Record<string, EditableZone> = {};

  productImages.slice(0, 8).forEach((imageZone, index) => {
    const imageRight = imageZone.layout.x + imageZone.layout.w;
    const imageBottom = imageZone.layout.y + imageZone.layout.h;
    const pairedText = textZones.find((candidate) => {
      const sameRow = Math.abs(candidate.layout.y - imageZone.layout.y) <= 4 && candidate.layout.x >= imageRight - 1 && candidate.layout.x <= imageRight + 18;
      const below = candidate.layout.y >= imageBottom - 1 && candidate.layout.y <= imageBottom + 8 && Math.abs(candidate.layout.x - imageZone.layout.x) <= 5;
      return sameRow || below;
    });

    const x = Math.min(imageZone.layout.x, pairedText?.layout.x ?? imageZone.layout.x) - 1.2;
    const y = Math.min(imageZone.layout.y, pairedText?.layout.y ?? imageZone.layout.y) - 1.2;
    const right = Math.max(imageRight, pairedText ? pairedText.layout.x + pairedText.layout.w : imageRight) + 1.2;
    const bottom = Math.max(imageBottom, pairedText ? pairedText.layout.y + pairedText.layout.h : imageBottom) + 1.2;
    panels[`productPanel${index + 1}`] = panel(`productPanel${index + 1}`, clampLayout({ x, y, w: right - x, h: bottom - y }));
  });

  return panels;
}

export function structureZones(category: PageCategory, zones: Record<string, EditableZone>): Record<string, EditableZone> {
  if (category === 'cover') {
    return {};
  }

  return {
    pageTopMeta: microText('pageTopMeta', pageKindLabel(category), { x: 7, y: 3.4, w: 70, h: 3 }),
    pageTopRule: divider('pageTopRule', { x: 7, y: 7.1, w: 86, h: 0.22 }),
    ...productPanelZones(category, zones),
    pageBottomRule: divider('pageBottomRule', { x: 7, y: 92.8, w: 86, h: 0.22 }),
    pageBottomMeta: microText('pageBottomMeta', bottomMetaLabel(category), { x: 7, y: 94, w: 78, h: 3.4 })
  };
}

export function template(
  id: string,
  category: PageCategory,
  title: string,
  description: string,
  thumbnail: string,
  defaultZones: Record<string, EditableZone>
): PageTemplate {
  return {
    id,
    category,
    title,
    description,
    thumbnail,
    defaultZones: {
      ...structureZones(category, defaultZones),
      logo: logo({ x: 82, y: 2.0, w: 11, h: 5.2 }),
      ...defaultZones
    }
  };
}

