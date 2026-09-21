export type PresetId =
  | 'mini_catalog'
  | 'commercial_offer'
  | 'price_list'
  | 'selection'
  | 'technical_package'
  | 'moodboard_presentation'
  | 'premium_catalog'
  | 'outdoor_collection'
  | 'slab_catalog'
  | 'wood_catalog'
  | 'editorial_catalog'
  | 'dealer_presentation'
  | 'client_offer'
  | 'empty';

export type ThemeMode = 'light' | 'dark' | 'beige';
export type Accent = 'purple' | 'gold' | 'graphite' | 'beige' | 'blueGray';
export type PageFormat = 'a4_portrait' | 'a4_landscape';
export type TextPalette = 'classic' | 'warm' | 'contrast' | 'muted' | 'graphite';

export type Theme = {
  mode: ThemeMode;
  accent: Accent;
};

export type CompanyProfile = {
  companyName: string;
  managerName: string;
  phone: string;
  messenger: string;
  email: string;
  website: string;
  address: string;
  logoSrc?: string;
};

export type MediaAsset = {
  id: string;
  name: string;
  src: string;
  createdAt: string;
};

export type ZoneLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ZoneStyle = {
  textColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  shadow?: 'none' | 'soft' | 'medium';
};

export type ZoneStyleOverrideKey =
  | 'textColor'
  | 'backgroundColor'
  | 'borderRadius'
  | 'shadow'
  | 'fit'
  | 'align'
  | 'size'
  | 'dividerThickness'
  | 'fontFamily'
  | 'fontSizePt'
  | 'fontWeight'
  | 'fontStyle'
  | 'underline'
  | 'highlightColor';

export type TextFontFamily =
  | 'sans'
  | 'serif'
  | 'times'
  | 'arial'
  | 'calibri'
  | 'cambria'
  | 'palatino'
  | 'trebuchet'
  | 'verdana'
  | 'garamond';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextSizePreset = 'hero' | 'h1' | 'h2' | 'body' | 'small' | 'badge';

export type BaseZone = {
  id: string;
  label: string;
  layout: ZoneLayout;
  styleRole?: string;
  visible?: boolean;
  style?: ZoneStyle;
  styleOverrides?: Partial<Record<ZoneStyleOverrideKey, boolean>>;
};

export type TextZone = BaseZone & {
  kind: 'text';
  value: string;
  size?: TextSizePreset;
  align?: TextAlign;
  fontFamily?: TextFontFamily;
  fontSizePt?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  highlightColor?: string;
};

export type DividerZone = BaseZone & {
  kind: 'divider';
};

export type PanelZone = BaseZone & {
  kind: 'panel';
};

export type ImageZone = BaseZone & {
  kind: 'image';
  src: string;
  alt: string;
  imageRole?: 'interior' | 'product' | 'decorative';
  aspectRatio?: '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '1:2' | '2:1' | '5:2';
  fit?: 'cover' | 'contain' | 'fill';
};

export type TableColumn = {
  id: string;
  label: string;
  type?: 'text' | 'number' | 'price' | 'quantity' | 'total';
};

export type TableRow = Record<string, string | number>;

export type TableZone = BaseZone & {
  kind: 'table';
  columns: TableColumn[];
  rows: TableRow[];
  note?: string;
};

export type FeatureZone = BaseZone & {
  kind: 'features';
  items: string[];
};

export type IconZoneItem = {
  id: string;
  iconId: string;
  label?: string;
  value?: string;
};

export type IconZone = BaseZone & {
  kind: 'icon';
  mode?: 'single' | 'row';
  iconId?: string;
  caption?: string;
  value?: string;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center' | 'right';
  items?: IconZoneItem[];
};

export type EditableZone = TextZone | DividerZone | PanelZone | ImageZone | TableZone | FeatureZone | IconZone;

export type Page = {
  id: string;
  templateId: string;
  title: string;
  order: number;
  zones: Record<string, EditableZone>;
};

export type Project = {
  id: string;
  title: string;
  preset: PresetId;
  pageFormat: PageFormat;
  documentTheme: ThemeMode;
  documentAccent: Accent;
  documentAccentColor?: string;
  documentBackgroundColor?: string;
  documentTextPalette: TextPalette;
  documentTextPrimaryColor?: string;
  documentTextSecondaryColor?: string;
  documentDividerColor?: string;
  showLogos: boolean;
  showPageNumbers: boolean;
  showDividers: boolean;
  theme: Theme;
  pages: Page[];
  mediaAssets: MediaAsset[];
  companyProfile: CompanyProfile;
  createdAt: string;
  updatedAt: string;
};

export type DocumentRenderSettings = Pick<Project,
  | 'pageFormat'
  | 'documentTheme'
  | 'documentAccent'
  | 'documentAccentColor'
  | 'documentBackgroundColor'
  | 'documentTextPalette'
  | 'documentTextPrimaryColor'
  | 'documentTextSecondaryColor'
  | 'documentDividerColor'
  | 'showLogos'
  | 'showPageNumbers'
  | 'showDividers'
>;

export type SavedProjectMeta = {
  id: string;
  title: string;
  preset: PresetId;
  pageCount: number;
  updatedAt: string;
};

export type SavedTemplateMeta = {
  id: string;
  title: string;
  pageCount: number;
  updatedAt: string;
};

export type ServiceSettings = {
  interfaceTheme: ThemeMode;
  companyProfile: CompanyProfile;
  recentCustomColors?: string[];
  defaultDocumentScheme?: string;
  showVilrayPromo?: boolean;
};
