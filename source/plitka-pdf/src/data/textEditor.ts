import type { Accent, TextAlign, TextFontFamily, TextPalette, TextSizePreset, TextZone, ThemeMode } from '../types/project';

export type TextEditorDocumentColors = {
  documentTheme: ThemeMode;
  documentAccent: Accent;
  documentAccentColor?: string;
  documentBackgroundColor?: string;
  documentTextPalette?: TextPalette;
  documentTextPrimaryColor?: string;
  documentTextSecondaryColor?: string;
};

export const TEXT_FONTS: { id: TextFontFamily; label: string; css: string }[] = [
  { id: 'sans', label: 'Современный', css: '"Segoe UI", ui-sans-serif, system-ui, sans-serif' },
  { id: 'serif', label: 'Классика', css: 'Georgia, "Times New Roman", serif' },
  { id: 'times', label: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { id: 'arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { id: 'calibri', label: 'Calibri', css: 'Calibri, "Segoe UI", sans-serif' },
  { id: 'cambria', label: 'Cambria', css: 'Cambria, Georgia, serif' },
  { id: 'palatino', label: 'Palatino', css: '"Palatino Linotype", Palatino, "Book Antiqua", serif' },
  { id: 'trebuchet', label: 'Trebuchet', css: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { id: 'verdana', label: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { id: 'garamond', label: 'Garamond', css: 'Garamond, Georgia, serif' }
];

export const TEXT_FONT_SIZE_PTS = [8, 9, 10, 11, 12, 14, 15, 16, 18, 20, 22, 24, 28, 32, 33, 36, 42, 48];
export const MIN_FONT_SIZE_PT = 6;
export const MAX_FONT_SIZE_PT = 72;

export const TEXT_ALIGNS: { id: TextAlign; label: string }[] = [
  { id: 'left', label: 'Слева' },
  { id: 'center', label: 'По центру' },
  { id: 'right', label: 'Справа' },
  { id: 'justify', label: 'По ширине' }
];

export const TEXT_STYLE_PRESETS: { id: TextSizePreset; label: string }[] = [
  { id: 'hero', label: 'Крупный' },
  { id: 'h1', label: 'Заголовок' },
  { id: 'h2', label: 'Подзаголовок' },
  { id: 'body', label: 'Обычный' },
  { id: 'small', label: 'Мелкий' },
  { id: 'badge', label: 'Плашка' }
];

const ACCENT_HEX: Record<Accent, string> = {
  purple: '#9b79c6',
  gold: '#d0a43a',
  graphite: '#2f3338',
  beige: '#8f5f3b',
  blueGray: '#6e8aa1'
};

const THEME_BACKGROUND: Record<ThemeMode, string> = {
  light: '#ffffff',
  beige: '#fff8ed',
  dark: '#24262a'
};

const PALETTE_TEXT: Record<TextPalette, { primary: string; secondary: string }> = {
  classic: { primary: '#1f2227', secondary: '#8a8d8f' },
  warm: { primary: '#111111', secondary: '#704a32' },
  contrast: { primary: '#050505', secondary: '#ffffff' },
  muted: { primary: '#3f4246', secondary: '#d8cab8' },
  graphite: { primary: '#f3eee6', secondary: '#2c3035' }
};

const DEFAULT_FONT_SIZE_PT: Record<TextSizePreset, number> = {
  hero: 33,
  h1: 22,
  h2: 15,
  body: 11,
  small: 8,
  badge: 9
};

export function defaultFontSizePt(size?: TextSizePreset) {
  return DEFAULT_FONT_SIZE_PT[size ?? 'body'];
}

export function sizeFromFontSizePt(pt: number, current?: TextSizePreset): TextSizePreset {
  if (current === 'badge') return 'badge';
  if (pt >= 28) return 'hero';
  if (pt >= 20) return 'h1';
  if (pt >= 15) return 'h2';
  if (pt >= 10) return 'body';
  return 'small';
}

export function clampFontSizePt(pt: number) {
  if (!Number.isFinite(pt)) return defaultFontSizePt('body');
  return Math.min(MAX_FONT_SIZE_PT, Math.max(MIN_FONT_SIZE_PT, Math.round(pt * 2) / 2));
}

export function parseFontSizePt(value: string) {
  const normalized = value.trim().replace(',', '.').replace(/[^\d.]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return clampFontSizePt(parsed);
}

export function inferredFontFamily(zone: Pick<TextZone, 'fontFamily' | 'size'>): TextFontFamily {
  return zone.fontFamily ?? (zone.size === 'hero' || zone.size === 'h1' ? 'serif' : 'sans');
}

export function fontCss(family?: TextFontFamily) {
  return TEXT_FONTS.find((font) => font.id === family)?.css ?? TEXT_FONTS[0].css;
}

export function isTextBold(zone: Pick<TextZone, 'fontWeight' | 'size'>) {
  if (zone.fontWeight === 'bold') return true;
  if (zone.fontWeight === 'normal') return false;
  return zone.size === 'hero' || zone.size === 'h1' || zone.size === 'h2' || zone.size === 'badge';
}

export function isTextItalic(zone: Pick<TextZone, 'fontStyle'>) {
  return zone.fontStyle === 'italic';
}

export function parseHexColor(color?: string) {
  if (!color) return null;
  const normalized = color.trim().toLowerCase();
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split('').map((char) => `${char}${char}`).join('')
    : match[1];
  return {
    hex: `#${hex}`,
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  };
}

export function mixHex(left: string, right: string, amount: number) {
  const start = parseHexColor(left);
  const end = parseHexColor(right);
  if (!start || !end) return left;
  const mix = (from: number, to: number) => Math.round(from + (to - from) * amount);
  return `#${[mix(start.r, end.r), mix(start.g, end.g), mix(start.b, end.b)]
    .map((value) => Math.min(255, Math.max(0, value)).toString(16).padStart(2, '0'))
    .join('')}`;
}

function uniqueColors(colors: Array<string | undefined>) {
  const seen = new Set<string>();
  return colors.flatMap((color) => {
    const parsed = parseHexColor(color);
    if (!parsed) return [];
    if (seen.has(parsed.hex)) return [];
    seen.add(parsed.hex);
    return [parsed.hex];
  });
}

export function resolvedDocumentAccent(colors: TextEditorDocumentColors) {
  return parseHexColor(colors.documentAccentColor)?.hex ?? ACCENT_HEX[colors.documentAccent];
}

export function resolvedDocumentBackground(colors: TextEditorDocumentColors) {
  return parseHexColor(colors.documentBackgroundColor)?.hex ?? THEME_BACKGROUND[colors.documentTheme];
}

export function resolvedDocumentTextColors(colors: TextEditorDocumentColors) {
  const palette = PALETTE_TEXT[colors.documentTextPalette ?? 'classic'];
  return {
    primary: parseHexColor(colors.documentTextPrimaryColor)?.hex ?? palette.primary,
    secondary: parseHexColor(colors.documentTextSecondaryColor)?.hex ?? palette.secondary
  };
}

export function textColorSwatches(colors: TextEditorDocumentColors) {
  const accent = resolvedDocumentAccent(colors);
  const text = resolvedDocumentTextColors(colors);
  return uniqueColors([
    text.primary,
    text.secondary,
    accent,
    '#242321',
    '#6f6a63',
    '#f7f3ec',
    '#ffffff',
    '#050505',
    '#2f3338',
    '#d0a43a'
  ]);
}

export function highlightSwatches(colors: TextEditorDocumentColors) {
  const accent = resolvedDocumentAccent(colors);
  const background = resolvedDocumentBackground(colors);
  const paper = colors.documentTheme === 'dark' ? '#2c3035' : '#fff8ed';
  const ink = colors.documentTheme === 'dark' ? '#1a1c1f' : '#ffffff';

  if (colors.documentTheme === 'dark') {
    return uniqueColors([
      mixHex(accent, ink, 0.62),
      mixHex(accent, ink, 0.42),
      mixHex(accent, paper, 0.55),
      '#3a342c',
      '#2c3035',
      '#4a3f32',
      mixHex('#f7f2ea', accent, 0.38),
      mixHex(background, accent, 0.28)
    ]);
  }

  return uniqueColors([
    mixHex(accent, ink, 0.86),
    mixHex(accent, ink, 0.74),
    mixHex(accent, ink, 0.6),
    '#f7f4ef',
    '#fff8ed',
    '#f7f2ea',
    '#ede5db',
    mixHex(background, accent, 0.18),
    mixHex('#fff8ed', accent, 0.22)
  ]);
}

export function availableFontSizes(currentPt: number) {
  if (TEXT_FONT_SIZE_PTS.includes(currentPt)) return TEXT_FONT_SIZE_PTS;
  return [...TEXT_FONT_SIZE_PTS, currentPt].sort((left, right) => left - right);
}
