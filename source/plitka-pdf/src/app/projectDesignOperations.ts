import { getDocumentScheme, type DocumentSchemeId } from '../data/documentSchemes';
import { getTemplate } from '../data/pageTemplates';
import { clone } from '../utils/clone';
import { DividerZone, EditableZone, IconZone, ImageZone, Page, PanelZone, Project, TextZone } from '../types/project';

export type DesignChangeScope = 'all' | 'textColor' | 'dividerColor';

function zoneMarker(zone: EditableZone) {
  return `${zone.id} ${zone.label}`.toLowerCase();
}

function isLogoImageZone(zone: EditableZone): zone is ImageZone {
  if (zone.kind !== 'image') return false;
  const marker = zoneMarker(zone);
  return marker.includes('logo') || marker.includes('Р»РѕРіРѕС‚РёРї');
}

export function dividerThickness(zone: DividerZone) {
  return zone.layout.w <= zone.layout.h ? zone.layout.w : zone.layout.h;
}

export function withDividerThickness(zone: DividerZone, thickness: number): DividerZone {
  return {
    ...zone,
    layout: zone.layout.w <= zone.layout.h
      ? { ...zone.layout, w: thickness }
      : { ...zone.layout, h: thickness }
  };
}

function styleValue(zone: EditableZone | undefined, key: 'textColor' | 'backgroundColor' | 'borderRadius' | 'shadow') {
  return zone?.style?.[key];
}

export function hasOverrideFlag(zone: EditableZone, key?: string) {
  if (!zone.styleOverrides) return false;
  if (key) return Boolean(zone.styleOverrides[key as keyof typeof zone.styleOverrides]);
  return Object.values(zone.styleOverrides).some(Boolean);
}

export function clearOverrideFlags(zone: EditableZone, keys: string[]): EditableZone {
  if (!zone.styleOverrides) return zone;
  const styleOverrides = { ...zone.styleOverrides } as Record<string, boolean | undefined>;
  keys.forEach((key) => {
    delete styleOverrides[key];
  });
  return {
    ...zone,
    styleOverrides: Object.values(styleOverrides).some(Boolean)
      ? styleOverrides as EditableZone['styleOverrides']
      : undefined
  } as EditableZone;
}

export function hasManualDesignOverride(page: Page, zone: EditableZone, scope: DesignChangeScope) {
  const templateZone = getTemplate(page.templateId).defaultZones[zone.id];

  if (scope === 'textColor') {
    return zone.kind === 'text' && (hasOverrideFlag(zone, 'textColor') || styleValue(zone, 'textColor') !== styleValue(templateZone, 'textColor'));
  }

  if (scope === 'dividerColor') {
    return zone.kind === 'divider' && (hasOverrideFlag(zone, 'backgroundColor') || styleValue(zone, 'backgroundColor') !== styleValue(templateZone, 'backgroundColor'));
  }

  if (hasOverrideFlag(zone)) return true;
  if (!templateZone) return false;
  if (styleValue(zone, 'textColor') !== styleValue(templateZone, 'textColor')) return true;
  if (styleValue(zone, 'backgroundColor') !== styleValue(templateZone, 'backgroundColor')) return true;
  if (styleValue(zone, 'borderRadius') !== styleValue(templateZone, 'borderRadius')) return true;
  if (styleValue(zone, 'shadow') !== styleValue(templateZone, 'shadow')) return true;
  if (zone.kind === 'text' && templateZone.kind === 'text') {
    return zone.size !== templateZone.size
      || zone.align !== templateZone.align
      || zone.fontFamily !== templateZone.fontFamily
      || zone.fontSizePt !== templateZone.fontSizePt
      || zone.fontWeight !== templateZone.fontWeight
      || zone.fontStyle !== templateZone.fontStyle
      || zone.underline !== templateZone.underline
      || zone.highlightColor !== templateZone.highlightColor;
  }
  if (zone.kind === 'image' && templateZone.kind === 'image') return zone.fit !== templateZone.fit;
  if (zone.kind === 'divider' && templateZone.kind === 'divider') return dividerThickness(zone) !== dividerThickness(templateZone);
  return false;
}

export function zoneStyleRole(zone: EditableZone): string {
  if (zone.styleRole) return zone.styleRole;
  const marker = zoneMarker(zone);

  if (zone.kind === 'text') {
    if (marker.includes('pagetop') || marker.includes('pagebottom') || marker.includes('микроподпись') || marker.includes('выпуск')) return 'header-footer';
    if (marker.includes('heading') || marker.includes('заголовок')) return 'page-heading';
    if (marker.includes('title') || marker.includes('название каталога') || marker.includes('название коллекции') || marker.includes('название документа')) return 'document-title';
    if (marker.includes('intro') || marker.includes('subtitle') || marker.includes('description') || marker.includes('описание')) return 'collection-description';
    if (marker.includes('note') || marker.includes('notes') || marker.includes('примечание') || marker.includes('подпись')) return 'note';
    if (marker.includes('sku') || /^l\\d+$/i.test(zone.id) || /^text\\d+$/i.test(zone.id)) return 'sku-caption';
    if (marker.includes('product') || marker.includes('tiletext') || marker.includes('caption') || marker.includes('позиция') || marker.includes('образец')) return 'product-caption';
    if (marker.includes('company') || marker.includes('manager') || marker.includes('address') || marker.includes('website') || marker.includes('сайт') || marker.includes('адрес')) return 'contact-text';
    if (marker.includes('summary') || marker.includes('total') || marker.includes('итог') || marker.includes('next')) return 'summary';
    if (zone.size === 'hero' || zone.size === 'h1') return 'page-heading';
    return 'collection-description';
  }

  if (zone.kind === 'divider') {
    if (marker.includes('page')) return 'page-rule';
    if (marker.includes('product') || marker.includes('sku') || marker.includes('sample')) return 'product-rule';
    return 'content-rule';
  }

  if (zone.kind === 'panel') {
    return marker.includes('product') ? 'product-panel' : 'content-panel';
  }

  return `${zone.kind}-${zone.id}`;
}

export function projectHasManualDesignOverrides(source: Project, scope: DesignChangeScope = 'all') {
  return source.pages.some((page) => Object.values(page.zones).some((zone) => hasManualDesignOverride(page, zone, scope)));
}

export function applyLogoStyleToProject(source: Project, sourceLogo: ImageZone): Project {
  return {
    ...source,
    pages: source.pages.map((page) => ({
      ...page,
      zones: Object.fromEntries(Object.entries(page.zones).map(([id, zone]) => {
        if (!isLogoImageZone(zone)) return [id, zone];
        return [id, {
          ...zone,
          fit: sourceLogo.fit,
          style: {
            backgroundColor: sourceLogo.style?.backgroundColor,
            borderRadius: sourceLogo.style?.borderRadius,
            shadow: sourceLogo.style?.shadow
          },
          styleOverrides: {
            ...(zone.styleOverrides ?? {}),
            fit: true,
            backgroundColor: true,
            borderRadius: true,
            shadow: true
          }
        } satisfies ImageZone];
      }))
    }))
  };
}

export function applyZoneStyleToProjectRole(source: Project, sourceZone: EditableZone): Project {
  const role = zoneStyleRole(sourceZone);
  return {
    ...source,
    pages: source.pages.map((page) => ({
      ...page,
      zones: Object.fromEntries(Object.entries(page.zones).map(([id, zone]) => {
        if (zone.kind !== sourceZone.kind || zoneStyleRole(zone) !== role) return [id, zone];

        if (sourceZone.kind === 'text' && zone.kind === 'text') {
          return [id, {
            ...zone,
            size: sourceZone.size,
            align: sourceZone.align,
            fontFamily: sourceZone.fontFamily,
            fontSizePt: sourceZone.fontSizePt,
            fontWeight: sourceZone.fontWeight,
            fontStyle: sourceZone.fontStyle,
            underline: sourceZone.underline,
            highlightColor: sourceZone.highlightColor,
            style: {
              textColor: sourceZone.style?.textColor,
              backgroundColor: sourceZone.style?.backgroundColor,
              borderRadius: sourceZone.style?.borderRadius,
              shadow: sourceZone.style?.shadow
            },
            styleOverrides: {
              ...(zone.styleOverrides ?? {}),
              size: true,
              align: true,
              fontFamily: true,
              fontSizePt: true,
              fontWeight: true,
              fontStyle: true,
              underline: true,
              highlightColor: true,
              textColor: true,
              backgroundColor: true,
              borderRadius: true,
              shadow: true
            }
          } satisfies TextZone];
        }

        if (sourceZone.kind === 'divider' && zone.kind === 'divider') {
          const nextDivider = withDividerThickness(zone, dividerThickness(sourceZone));
          return [id, {
            ...nextDivider,
            style: {
              backgroundColor: sourceZone.style?.backgroundColor,
              shadow: sourceZone.style?.shadow
            },
            styleOverrides: {
              ...(zone.styleOverrides ?? {}),
              dividerThickness: true,
              backgroundColor: true,
              shadow: true
            }
          } satisfies DividerZone];
        }

        if (sourceZone.kind === 'panel' && zone.kind === 'panel') {
          return [id, {
            ...zone,
            style: {
              backgroundColor: sourceZone.style?.backgroundColor,
              borderRadius: sourceZone.style?.borderRadius,
              shadow: sourceZone.style?.shadow
            },
            styleOverrides: {
              ...(zone.styleOverrides ?? {}),
              backgroundColor: true,
              borderRadius: true,
              shadow: true
            }
          } satisfies PanelZone];
        }

        return [id, zone];
      }))
    }))
  };
}

export function resetProjectDesignToTemplateDefaults(source: Project): Project {
  return {
    ...source,
    pages: source.pages.map((page) => {
      const template = getTemplate(page.templateId);
      return {
        ...page,
        zones: Object.fromEntries(Object.entries(page.zones).map(([id, zone]) => {
          const templateZone = template.defaultZones[id];
          const baseStyle = templateZone?.style ? clone(templateZone.style) : undefined;

          if (zone.kind === 'text') {
            const defaultText = templateZone?.kind === 'text' ? templateZone : undefined;
            return [id, {
              ...zone,
              size: defaultText?.size ?? zone.size,
              align: defaultText?.align,
              fontFamily: defaultText?.fontFamily,
              fontSizePt: defaultText?.fontSizePt,
              fontWeight: defaultText?.fontWeight,
              fontStyle: defaultText?.fontStyle,
              underline: defaultText?.underline,
              highlightColor: defaultText?.highlightColor,
              style: baseStyle,
              styleOverrides: undefined
            } satisfies TextZone];
          }

          if (zone.kind === 'image') {
            const defaultImage = templateZone?.kind === 'image' ? templateZone : undefined;
            const isLogoImage = `${zone.id} ${zone.label}`.toLowerCase().includes('logo') || `${zone.id} ${zone.label}`.toLowerCase().includes('логотип');
            return [id, {
              ...zone,
              fit: defaultImage?.fit ?? (isLogoImage ? 'contain' : zone.fit),
              aspectRatio: defaultImage?.aspectRatio ?? (isLogoImage ? '2:1' : zone.aspectRatio),
              style: baseStyle ?? (isLogoImage ? { backgroundColor: 'transparent', borderRadius: 0 } : undefined),
              styleOverrides: undefined
            } satisfies ImageZone];
          }

          if (zone.kind === 'divider') {
            const defaultDivider = templateZone?.kind === 'divider' ? templateZone : undefined;
            return [id, {
              ...(defaultDivider ? withDividerThickness(zone, dividerThickness(defaultDivider)) : zone),
              style: baseStyle,
              styleOverrides: undefined
            } satisfies DividerZone];
          }

          if (zone.kind === 'panel') {
            return [id, { ...zone, style: baseStyle, styleOverrides: undefined } satisfies PanelZone];
          }

          if (zone.kind === 'icon') {
            const defaultIcon = templateZone?.kind === 'icon' ? templateZone : undefined;
            return [id, {
              ...zone,
              size: defaultIcon?.size ?? zone.size,
              align: defaultIcon?.align,
              style: baseStyle,
              styleOverrides: undefined
            } satisfies IconZone];
          }

          return [id, { ...zone, style: baseStyle, styleOverrides: undefined } as EditableZone];
        }))
      };
    })
  };
}

export function resetTextColorOverrides(source: Project): Project {
  return {
    ...source,
    pages: source.pages.map((page) => {
      const template = getTemplate(page.templateId);
      return {
        ...page,
        zones: Object.fromEntries(Object.entries(page.zones).map(([id, zone]) => {
          if (zone.kind !== 'text') return [id, zone];
          const templateZone = template.defaultZones[id];
          const nextZone = clearOverrideFlags({
            ...zone,
            style: { ...(zone.style ?? {}), textColor: templateZone?.style?.textColor }
          }, ['textColor']);
          return [id, nextZone];
        }))
      };
    })
  };
}

export function resetDividerColorOverrides(source: Project): Project {
  return {
    ...source,
    pages: source.pages.map((page) => {
      const template = getTemplate(page.templateId);
      return {
        ...page,
        zones: Object.fromEntries(Object.entries(page.zones).map(([id, zone]) => {
          if (zone.kind !== 'divider') return [id, zone];
          const templateZone = template.defaultZones[id];
          const nextZone = clearOverrideFlags({
            ...zone,
            style: { ...(zone.style ?? {}), backgroundColor: templateZone?.style?.backgroundColor }
          }, ['backgroundColor']);
          return [id, nextZone];
        }))
      };
    })
  };
}

export function prepareProjectForTopDesignChange(source: Project, scope: DesignChangeScope) {
  if (scope === 'textColor') return resetTextColorOverrides(source);
  if (scope === 'dividerColor') return resetDividerColorOverrides(source);
  return resetProjectDesignToTemplateDefaults(source);
}

export function applyDocumentSchemeToProject(source: Project, schemeId: DocumentSchemeId | string = 'classic'): Project {
  const scheme = getDocumentScheme(schemeId);
  return {
    ...source,
    documentTheme: scheme.documentTheme,
    documentAccent: scheme.documentAccent,
    documentAccentColor: undefined,
    documentBackgroundColor: undefined,
    documentTextPrimaryColor: scheme.documentTextPrimaryColor,
    documentTextSecondaryColor: scheme.documentTextSecondaryColor,
    documentDividerColor: undefined,
    showLogos: scheme.showLogos,
    showPageNumbers: scheme.showPageNumbers
  };
}
