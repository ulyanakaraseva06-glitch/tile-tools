import {
  Bath,
  Boxes,
  Building2,
  Calculator,
  ChefHat,
  Clock3,
  Droplets,
  FileCheck2,
  Flame,
  Grid2x2,
  HandCoins,
  Home,
  Layers3,
  LucideIcon,
  Mail,
  MapPinned,
  Package,
  PackageCheck,
  Phone,
  RectangleHorizontal,
  Ruler,
  ScanLine,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Square,
  Truck,
  Warehouse
} from 'lucide-react';

export type CatalogIconCategory = 'tile-tech' | 'surface' | 'usage' | 'packaging' | 'logistics' | 'business';

export type CatalogIconDefinition = {
  id: string;
  label: string;
  category: CatalogIconCategory;
  component: LucideIcon;
};

export const catalogIconCategories: { id: CatalogIconCategory; label: string }[] = [
  { id: 'tile-tech', label: 'Технические' },
  { id: 'surface', label: 'Поверхность' },
  { id: 'usage', label: 'Применение' },
  { id: 'packaging', label: 'Упаковка' },
  { id: 'logistics', label: 'Логистика' },
  { id: 'business', label: 'Бизнес' }
];

export const catalogIcons: CatalogIconDefinition[] = [
  { id: 'size', label: 'Размер', category: 'tile-tech', component: Ruler },
  { id: 'large-format', label: 'Крупный формат', category: 'tile-tech', component: RectangleHorizontal },
  { id: 'square-format', label: 'Квадратный формат', category: 'tile-tech', component: Square },
  { id: 'mosaic', label: 'Мозаика', category: 'tile-tech', component: Grid2x2 },
  { id: 'thickness', label: 'Толщина', category: 'tile-tech', component: Layers3 },
  { id: 'rectified', label: 'Ректификация', category: 'tile-tech', component: ScanLine },
  { id: 'frost', label: 'Морозостойкость', category: 'tile-tech', component: Snowflake },
  { id: 'abrasion', label: 'Износостойкость', category: 'tile-tech', component: ShieldCheck },
  { id: 'water', label: 'Влагостойкость', category: 'tile-tech', component: Droplets },
  { id: 'glossy', label: 'Глянец', category: 'surface', component: Sparkles },
  { id: 'matte', label: 'Матовая', category: 'surface', component: Square },
  { id: 'structured', label: 'Структурная', category: 'surface', component: Grid2x2 },
  { id: 'wall', label: 'Для стен', category: 'usage', component: Building2 },
  { id: 'floor', label: 'Для пола', category: 'usage', component: Home },
  { id: 'bathroom', label: 'Санузел', category: 'usage', component: Bath },
  { id: 'kitchen', label: 'Кухня', category: 'usage', component: ChefHat },
  { id: 'heated-floor', label: 'Теплый пол', category: 'usage', component: Flame },
  { id: 'box', label: 'Коробка', category: 'packaging', component: Package },
  { id: 'pallet', label: 'Палета', category: 'packaging', component: Boxes },
  { id: 'pack-check', label: 'Контроль упаковки', category: 'packaging', component: PackageCheck },
  { id: 'warehouse', label: 'Склад', category: 'logistics', component: Warehouse },
  { id: 'delivery', label: 'Доставка', category: 'logistics', component: Truck },
  { id: 'lead-time', label: 'Срок поставки', category: 'logistics', component: Clock3 },
  { id: 'location', label: 'Локация', category: 'logistics', component: MapPinned },
  { id: 'price', label: 'Цена', category: 'business', component: HandCoins },
  { id: 'calculation', label: 'Расчет', category: 'business', component: Calculator },
  { id: 'approved', label: 'Согласование', category: 'business', component: FileCheck2 },
  { id: 'phone', label: 'Телефон', category: 'business', component: Phone },
  { id: 'email', label: 'Email', category: 'business', component: Mail }
];

const catalogIconMap = Object.fromEntries(catalogIcons.map((icon) => [icon.id, icon])) as Record<string, CatalogIconDefinition>;

export function getCatalogIcon(id?: string): CatalogIconDefinition | null {
  if (!id) return null;
  return catalogIconMap[id] ?? null;
}

export function CatalogIconGlyph({ id, size = 18, strokeWidth = 1.7 }: { id?: string; size?: number; strokeWidth?: number }) {
  const icon = getCatalogIcon(id) ?? catalogIcons[0];
  const Component = icon.component;
  return <Component size={size} strokeWidth={strokeWidth} />;
}
