import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useState
} from 'react';
import { Accent, DocumentRenderSettings, EditableZone, IconZone, ImageZone, Page, PageFormat, TableZone, TextPalette, TextZone, ThemeMode, ZoneStyleOverrideKey } from '../../types/project';
import { fontCss } from '../../data/textEditor';
import { CatalogIconGlyph } from '../../data/iconLibrary';
import { formatMoney, rowTotal } from '../../utils/calculations';
import { getTemplate } from '../../data/pageTemplates';
import { resizeDirections, resizeZone, type ResizeDirection } from '../../utils/resizeZone';
import { resolvePublicAssetUrl } from '../../utils/publicAsset';

type PdfPageRendererProps = {
  page: Page;
  renderSettings?: DocumentRenderSettings;
  pageFormat?: PageFormat;
  documentTheme?: ThemeMode;
  documentAccent?: Accent;
  documentAccentColor?: string;
  documentBackgroundColor?: string;
  documentTextPalette?: TextPalette;
  documentTextPrimaryColor?: string;
  documentTextSecondaryColor?: string;
  documentDividerColor?: string;
  showLogos?: boolean;
  showPageNumbers?: boolean;
  showDividers?: boolean;
  forcePageNumber?: boolean;
  selectedZoneId?: string | null;
  editorMode?: boolean;
  isLastPage?: boolean;
  exportMode?: boolean;
  onSelectZone?: (zoneId: string) => void;
  onImageDrop?: (zoneId: string, file: File) => void;
  layoutEditMode?: boolean;
  onZoneLayoutChange?: (zoneId: string, layout: EditableZone['layout']) => void;
  onZoneChange?: (zoneId: string, zone: EditableZone) => void;
  onZoneDelete?: (zoneId: string) => void;
};

const templatePrimaryTextColors = new Set(['#242321', '#1f2227', '#111111', '#3f4246', '#f3eee6']);
const templateMutedTextColors = new Set(['#6f6a63', '#8a8d8f', '#704a32', '#d8cab8', '#2c3035', '#c9c9d2']);
const defaultDividerColor = '#B7B7B7';

function normalizedColor(color?: string) {
  return color?.trim().toLowerCase();
}

function textTone(zone: EditableZone) {
  const color = normalizedColor(zone.style?.textColor);
  if (!color) return 'primary';
  if (templateMutedTextColors.has(color)) return 'muted';
  return 'primary';
}

function templateZone(page: Page, zone: EditableZone) {
  try {
    return getTemplate(page.templateId).defaultZones[zone.id];
  } catch {
    return undefined;
  }
}

function styleOverride(page: Page, zone: EditableZone, key: ZoneStyleOverrideKey) {
  if (zone.styleOverrides?.[key]) return true;
  const template = templateZone(page, zone);
  if (!template) return false;
  if (key === 'textColor' || key === 'backgroundColor' || key === 'borderRadius' || key === 'shadow') {
    return zone.style?.[key] !== template.style?.[key];
  }
  if (key === 'fit' && zone.kind === 'image' && template.kind === 'image') return zone.fit !== template.fit;
  if (key === 'align' && zone.kind === 'text' && template.kind === 'text') return zone.align !== template.align;
  if (key === 'size' && zone.kind === 'text' && template.kind === 'text') return zone.size !== template.size;
  if (zone.kind === 'text' && template.kind === 'text') {
    if (key === 'fontFamily') return zone.fontFamily !== template.fontFamily;
    if (key === 'fontSizePt') return zone.fontSizePt !== template.fontSizePt;
    if (key === 'fontWeight') return zone.fontWeight !== template.fontWeight;
    if (key === 'fontStyle') return zone.fontStyle !== template.fontStyle;
    if (key === 'underline') return zone.underline !== template.underline;
    if (key === 'highlightColor') return zone.highlightColor !== template.highlightColor;
  }
  if (key === 'dividerThickness' && zone.kind === 'divider' && template.kind === 'divider') {
    return zone.layout.h !== template.layout.h || zone.layout.w !== template.layout.w;
  }
  return false;
}

function isLightTemplatePanelBackground(color?: string) {
  const normalized = normalizedColor(color);
  return normalized === '#ffffff' || normalized === '#fff' || normalized === '#f7f4ef' || normalized === '#fff8ed';
}

function shouldUseInlineTextColor(page: Page, zone: EditableZone, hasDocumentTextOverride: boolean) {
  const color = normalizedColor(zone.style?.textColor);
  if (!color) return false;
  if (zone.kind === 'image') return true;
  if (zone.kind === 'divider') return false;
  if (zone.kind === 'panel') return false;
  if (zone.kind === 'text' && styleOverride(page, zone, 'textColor')) return true;
  // Light lettering is intentional on photographs and dark template panels.
  if (zone.kind === 'text' && ['#f7f3ec', '#ffffff', '#fff'].includes(color)) return true;
  if (zone.kind === 'text' && hasDocumentTextOverride) return false;
  return !templatePrimaryTextColors.has(color) && !templateMutedTextColors.has(color);
}

export function isLogoZone(zone: EditableZone): zone is ImageZone {
  return `${zone.id} ${zone.label}`.toLowerCase().includes('logo') || `${zone.id} ${zone.label}`.toLowerCase().includes('логотип');
}

function zoneStyle(page: Page, zone: EditableZone, documentTheme: ThemeMode, documentDividerColor?: string, hasDocumentTextOverride = false): CSSProperties {
  const shadow = zone.style?.shadow;
  const hasLocalBackground = styleOverride(page, zone, 'backgroundColor');
  const resolvedBackgroundColor = zone.kind === 'divider'
    ? hasLocalBackground
      ? zone.style?.backgroundColor ?? defaultDividerColor
      : documentDividerColor ?? zone.style?.backgroundColor ?? defaultDividerColor
    : documentTheme === 'dark' && !hasLocalBackground && isLightTemplatePanelBackground(zone.style?.backgroundColor)
      ? 'rgba(42, 45, 49, 0.92)'
      : zone.style?.backgroundColor;
  return {
    left: `${zone.layout.x}%`,
    top: `${zone.layout.y}%`,
    width: `${zone.layout.w}%`,
    height: `${zone.layout.h}%`,
    color: shouldUseInlineTextColor(page, zone, hasDocumentTextOverride) ? zone.style?.textColor : undefined,
    backgroundColor: zone.kind === 'divider' ? undefined : resolvedBackgroundColor,
    ...(zone.kind === 'divider' ? { '--divider-color': resolvedBackgroundColor } : {}),
    borderRadius: zone.style?.borderRadius ? `${zone.style.borderRadius}px` : undefined,
    boxShadow: shadow === 'soft'
      ? '0 10px 24px rgba(0, 0, 0, 0.12)'
      : shadow === 'medium'
        ? '0 18px 42px rgba(0, 0, 0, 0.18)'
        : undefined
  };
}

function hexToSoftAccent(color?: string) {
  if (!color?.startsWith('#')) return undefined;
  const hex = color.slice(1);
  const normalized = hex.length === 3
    ? hex.split('').map((char) => `${char}${char}`).join('')
    : hex;
  if (normalized.length !== 6) return undefined;
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return undefined;
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, 0.18)`;
}

function renderTable(zone: TableZone) {
  return (
    <table className="pdf-table">
      <thead>
        <tr>
          {zone.columns.map((column) => <th key={column.id}>{column.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {zone.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {zone.columns.map((column) => {
              const value = column.type === 'total' ? formatMoney(rowTotal(row)) : row[column.id];
              return <td key={column.id}>{String(value ?? '')}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function imageFit(zone: ImageZone) {
  if (zone.fit === 'contain') return 'contain';
  if (zone.fit === 'cover' || zone.fit === 'fill') return zone.fit;
  if (zone.imageRole === 'product') return 'contain';
  return 'cover';
}

function iconPixelSize(zone: IconZone) {
  if (zone.size === 'sm') return 16;
  if (zone.size === 'lg') return 28;
  return 21;
}

function renderIconZone(zone: IconZone) {
  const size = iconPixelSize(zone);
  const align = zone.align ?? 'left';

  if (zone.mode === 'row') {
    return (
      <div className={`icon-zone icon-row align-${align}`}>
        {(zone.items ?? []).map((item) => (
          <div key={item.id} className="icon-row-item">
            <div className="icon-glyph-wrap"><CatalogIconGlyph id={item.iconId} size={size} /></div>
            {item.label && <strong>{item.label}</strong>}
            {item.value && <span>{item.value}</span>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`icon-zone icon-single align-${align}`}>
      <div className="icon-glyph-wrap"><CatalogIconGlyph id={zone.iconId} size={size + 4} /></div>
      {zone.caption && <strong>{zone.caption}</strong>}
      {zone.value && <span>{zone.value}</span>}
    </div>
  );
}

function ZoneView({
  zone,
  editing,
  onTextChange,
  onFinishTextEditing,
  onTableChange,
  onFeaturesChange
}: {
  zone: EditableZone;
  editing?: boolean;
  onTextChange?: (value: string) => void;
  onFinishTextEditing?: () => void;
  onTableChange?: (zone: TableZone) => void;
  onFeaturesChange?: (items: string[]) => void;
}) {
  if (zone.kind === 'divider') {
    return <div className="divider-zone" aria-hidden="true" />;
  }

  if (zone.kind === 'panel') {
    return <div className="panel-zone" aria-hidden="true" />;
  }

  if (zone.kind === 'image') {
    if (!zone.src) {
      return <div className={`zone-image fit-${imageFit(zone)}`} role="img" aria-label={zone.alt} />;
    }
    return (
      <img
        className={`zone-image fit-${imageFit(zone)}`}
        src={resolvePublicAssetUrl(zone.src)}
        alt={zone.alt}
        draggable={false}
      />
    );
  }

  if (zone.kind === 'table') {
  if (!editing) {
    return renderTable(zone);
  }

  return (
    <div className="editable-table">
      <table className="pdf-table">
        <thead>
          <tr>
            {zone.columns.map((column) => (
              <th key={column.id}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {zone.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {zone.columns.map((column) => {
                const value =
                  column.type === 'total'
                    ? formatMoney(rowTotal(row))
                    : row[column.id];

                return (
                  <td key={column.id}>
                    <input
                      value={String(value ?? '')}
                      onChange={(event) => {
                        const rows = [...zone.rows];

                        rows[rowIndex] = {
                          ...rows[rowIndex],
                          [column.id]: event.target.value
                        };

                        onTableChange?.({
                          ...zone,
                          rows
                        });
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

  if (zone.kind === 'icon') {
    return renderIconZone(zone);
  }

  if (zone.kind === 'features') {
    if (!editing) {
      return (
        <div className="feature-list">
          {zone.items.map((item, index) => (
            <div key={`${item}-${index}`}>
              <span>{index + 1}</span>
              {item}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div
        className="feature-list editable-features"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {zone.items.map((item, index) => (
          <div key={`${zone.id}-${index}`}>
            <span>{index + 1}</span>
            <input
              value={item}
              onChange={(event) => {
                const items = [...zone.items];
                items[index] = event.target.value;
                onFeaturesChange?.(items);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onBlur={() => onFinishTextEditing?.()}
            />
          </div>
        ))}
      </div>
    );
  }

  if (editing && zone.kind === 'text') {
    return (
      <textarea
        className={`zone-text-editor ${textZoneClassName(zone)}`}
        style={textZoneStyle(zone)}
        value={zone.value}
        autoFocus
        onChange={(event) => onTextChange?.(event.target.value)}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onBlur={() => onFinishTextEditing?.()}
      />
    );
  }

  return renderTextZone(zone);
}

function textZoneClassName(zone: TextZone) {
  const classes = [
    'text-zone',
    `text-${zone.size ?? 'body'}`,
    `text-tone-${textTone(zone)}`,
    `align-${zone.align ?? 'left'}`
  ];
  if (zone.fontFamily) classes.push(`font-${zone.fontFamily}`);
  if (zone.fontWeight === 'bold') classes.push('text-bold');
  if (zone.fontWeight === 'normal') classes.push('text-regular');
  if (zone.fontStyle === 'italic') classes.push('text-italic');
  if (zone.underline) classes.push('text-underline');
  if (zone.highlightColor && zone.highlightColor !== 'transparent') classes.push('has-highlight');
  return classes.join(' ');
}

function textZoneStyle(zone: TextZone): CSSProperties {
  return {
    fontFamily: zone.fontFamily ? fontCss(zone.fontFamily) : undefined,
    fontSize: zone.fontSizePt ? `${zone.fontSizePt}pt` : undefined,
    fontWeight: zone.fontWeight === 'bold' ? 700 : zone.fontWeight === 'normal' ? 400 : undefined,
    fontStyle: zone.fontStyle === 'italic' ? 'italic' : zone.fontStyle === 'normal' ? 'normal' : undefined,
    textDecoration: zone.underline ? 'underline' : undefined
  };
}

function renderTextZone(zone: TextZone) {
  const highlight = zone.highlightColor && zone.highlightColor !== 'transparent' ? zone.highlightColor : undefined;
  const content = highlight
    ? <span className="text-highlight-mark" style={{ backgroundColor: highlight }}>{zone.value}</span>
    : zone.value;

  return (
    <div className={textZoneClassName(zone)} style={textZoneStyle(zone)}>
      {content}
    </div>
  );
}

export function PdfPageRenderer(props: PdfPageRendererProps) {
    const [editingTextZoneId, setEditingTextZoneId] = useState<string | null>(null);
    function finishTextEditing() {
  setEditingTextZoneId(null);
}
const {
    page,
    renderSettings,
    pageFormat = 'a4_portrait',
    documentTheme = 'light',
    documentAccent = 'purple',
    documentAccentColor,
    documentBackgroundColor,
    documentTextPalette = 'classic',
    documentTextPrimaryColor,
    documentTextSecondaryColor,
    documentDividerColor,
    showLogos = true,
    showPageNumbers = true,
    showDividers = true,
    forcePageNumber = false,
    selectedZoneId,
    editorMode,
    isLastPage,
    exportMode,
    onSelectZone,
    onImageDrop,
    layoutEditMode = false,
    onZoneLayoutChange,
    onZoneChange,
    onZoneDelete
  } = props;
  const resolvedPageFormat = renderSettings?.pageFormat ?? pageFormat;
  const resolvedDocumentTheme = renderSettings?.documentTheme ?? documentTheme;
  const resolvedDocumentAccent = renderSettings?.documentAccent ?? documentAccent;
  const resolvedDocumentAccentColor = renderSettings?.documentAccentColor ?? documentAccentColor;
  const resolvedDocumentBackgroundColor = renderSettings?.documentBackgroundColor ?? documentBackgroundColor;
  const resolvedDocumentTextPalette = renderSettings?.documentTextPalette ?? documentTextPalette;
  const resolvedDocumentTextPrimaryColor = renderSettings?.documentTextPrimaryColor ?? documentTextPrimaryColor;
  const resolvedDocumentTextSecondaryColor = renderSettings?.documentTextSecondaryColor ?? documentTextSecondaryColor;
  const resolvedDocumentDividerColor = renderSettings?.documentDividerColor ?? documentDividerColor;
  const resolvedShowLogos = renderSettings?.showLogos ?? showLogos;
  const resolvedShowPageNumbers = renderSettings?.showPageNumbers ?? showPageNumbers;
  const resolvedShowDividers = renderSettings?.showDividers ?? showDividers;
  const showPageNumber = resolvedShowPageNumbers && (forcePageNumber || page.order > 0);
  const hasDocumentTextOverride = Boolean(resolvedDocumentTextPrimaryColor || resolvedDocumentTextSecondaryColor);
  const documentStyle = {
    ...(resolvedDocumentAccentColor ? { '--document-accent': resolvedDocumentAccentColor } : {}),
    ...(resolvedDocumentAccentColor ? { '--document-accent-soft': hexToSoftAccent(resolvedDocumentAccentColor) } : {}),
    ...(resolvedDocumentBackgroundColor ? { '--document-bg': resolvedDocumentBackgroundColor } : {}),
    ...(resolvedDocumentTextPrimaryColor ? { '--document-text': resolvedDocumentTextPrimaryColor } : {}),
    ...(resolvedDocumentTextSecondaryColor ? { '--document-text-muted': resolvedDocumentTextSecondaryColor } : {})
  } as CSSProperties;

  return (
    <article
      className={`pdf-page template-${page.templateId} format-${resolvedPageFormat} ${layoutEditMode ? 'layout-grid-active' : ''}`}
      data-document-theme={resolvedDocumentTheme}
      data-document-accent={resolvedDocumentAccent}
      data-text-palette={resolvedDocumentTextPalette}
      data-export-page={exportMode ? 'true' : undefined}
      style={documentStyle}
    >
      <div className="page-watermark" />
      {Object.values(page.zones).filter((zone) => zone.id !== 'footerBrand' && zone.visible !== false && (resolvedShowDividers || zone.kind !== 'divider') && (resolvedShowLogos || !isLogoZone(zone))).map((zone) => {
        const className = `page-zone zone-${zone.kind} text-tone-${textTone(zone)} ${editorMode ? 'editable' : ''} ${layoutEditMode ? 'layout-editable' : ''} ${selectedZoneId === zone.id ? 'selected' : ''}`;
        const style = zoneStyle(page, zone, resolvedDocumentTheme, resolvedDocumentDividerColor, hasDocumentTextOverride);

        if (!editorMode) {
          return (
            <div key={zone.id} className={className} style={style}>
              <ZoneView zone={zone} />
            </div>
          );
        }

        return (
          <button
            key={zone.id}
            type="button"
            className={className}
            style={style}
            onClick={(event) => {
  if (!onSelectZone) return;

  event.stopPropagation();
  onSelectZone(zone.id);
}}
onDoubleClick={(event) => {
  if (
    layoutEditMode &&
    onZoneChange &&
    (
      zone.kind === 'text' ||
      zone.kind === 'table' ||
      zone.kind === 'features'
    )
  ) {
    event.preventDefault();
    event.stopPropagation();
    setEditingTextZoneId(zone.id);
  }
}}
            onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
  if (!layoutEditMode || !onZoneLayoutChange) return;

  event.preventDefault();
  event.stopPropagation();
  onSelectZone?.(zone.id);

  const pageElement = event.currentTarget.closest('.pdf-page');
  if (!(pageElement instanceof HTMLElement)) return;

  // Реальный размер страницы без учёта CSS transform: scale()
  const pageWidth = pageElement.offsetWidth;
  const pageHeight = pageElement.offsetHeight;

  // Размер одной квадратной клетки
  const GRID_SIZE = 20;

  // Шаг сетки в процентах относительно страницы
  const gridStepX = (GRID_SIZE / pageWidth) * 100;
  const gridStepY = (GRID_SIZE / pageHeight) * 100;

  const snapX = (value: number) =>
    Math.round(value / gridStepX) * gridStepX;

  const snapY = (value: number) =>
    Math.round(value / gridStepY) * gridStepY;

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  // Размер страницы на экране с учётом zoom
  const rect = pageElement.getBoundingClientRect();

  const startX = event.clientX;
  const startY = event.clientY;
  const initial = { ...zone.layout };

  const target = event.target as HTMLElement;
  const resizeDirection = target.closest<HTMLElement>('[data-resize-direction]')?.dataset.resizeDirection as ResizeDirection | undefined;

  const move = (moveEvent: PointerEvent) => {
    const dx =
      ((moveEvent.clientX - startX) / rect.width) * 100;

    const dy =
      ((moveEvent.clientY - startY) / rect.height) * 100;

    if (resizeDirection) {
      onZoneLayoutChange(zone.id, resizeZone(initial, resizeDirection, dx, dy, gridStepX, gridStepY));
    } else {
      const x = snapX(initial.x + dx);
      const y = snapY(initial.y + dy);

      onZoneLayoutChange(zone.id, {
        ...initial,
        x: clamp(
          x,
          0,
          100 - initial.w
        ),
        y: clamp(
          y,
          0,
          100 - initial.h
        )
      });
    }
  };

  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up, { once: true });
  window.addEventListener('pointercancel', up, { once: true });
}}
onDragOver={(event) => {
  if (zone.kind !== 'image' || !onImageDrop) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}}

onDrop={(event) => {
  if (zone.kind !== 'image' || !onImageDrop) return;

  const file = event.dataTransfer.files?.[0];
  if (!file) return;

  event.preventDefault();
  event.stopPropagation();

  onImageDrop(zone.id, file);
}}
          >
            <ZoneView
  zone={zone}
  editing={editingTextZoneId === zone.id}

  onTextChange={(value) => {
    if (zone.kind !== 'text' || !onZoneChange) return;

    onZoneChange(zone.id, {
      ...zone,
      value
    });
  }}

  onTableChange={(updatedZone) => {
    if (zone.kind !== 'table' || !onZoneChange) return;

    onZoneChange(zone.id, updatedZone);
  }}

  onFeaturesChange={(items) => {
    if (zone.kind !== 'features' || !onZoneChange) return;

    onZoneChange(zone.id, {
      ...zone,
      items
    });
  }}

  onFinishTextEditing={finishTextEditing}
/>

{layoutEditMode && (
  <>
    <span
  className="zone-delete-button"
  role="button"
  tabIndex={0}
  aria-label="Удалить элемент"
  onPointerDown={(event) => {
    event.preventDefault();
    event.stopPropagation();

    onZoneDelete?.(zone.id);

    if (editingTextZoneId === zone.id) {
      setEditingTextZoneId(null);
    }
  }}
  onClick={(event) => {
    event.preventDefault();
    event.stopPropagation();
  }}
  onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();

      onZoneDelete?.(zone.id);
      setEditingTextZoneId(null);
    }
  }}
>
  ×
</span>

    {resizeDirections.map((direction) => (
      <span
        key={direction}
        className={`zone-resize-handle zone-resize-handle-${direction}`}
        data-resize-direction={direction}
        aria-hidden="true"
        onDoubleClick={(event) => event.stopPropagation()}
      />
    ))}
  </>
)}
          </button>
        );
      })}
      {showPageNumber && (
        <footer className="pdf-page-footer">
          <strong>{String(page.order + 1).padStart(2, '0')}</strong>
        </footer>
      )}
      {isLastPage && (
        <div className="pdf-signature">
          Разработано с помощью plitka-pdf.ru
        </div>
      )}
    </article>
  );
}
