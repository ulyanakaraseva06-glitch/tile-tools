import { EditableZone, Project } from '../types/project';

export function projectAnalyticsProperties(project: Project) {
  const zones = project.pages.flatMap((page) => Object.values(page.zones));
  const imageCount = zones.filter((zone) => zone.kind === 'image' && Boolean(zone.src)).length;
  const tableCount = zones.filter((zone) => zone.kind === 'table').length;
  const editedZoneCount = zones.filter((zone) => {
    if (zone.visible === false) return true;
    if (zone.styleOverrides && Object.values(zone.styleOverrides).some(Boolean)) return true;
    if (zone.kind === 'image') return Boolean(zone.src);
    if (zone.kind === 'table') return zone.rows.length > 0;
    if (zone.kind === 'features') return zone.items.length > 0;
    if (zone.kind === 'icon') return Boolean(zone.iconId || zone.items?.length);
    return false;
  }).length;

  return {
    projectId: project.id,
    documentType: project.preset,
    pageCount: project.pages.length,
    imageCount,
    tableCount,
    editedZoneCount,
    pageFormat: project.pageFormat,
    documentTheme: project.documentTheme,
    documentAccent: project.documentAccent
  };
}

export function zoneAnalyticsProperties(zone: EditableZone, pageId?: string) {
  return {
    pageId,
    zoneId: zone.id,
    zoneKind: zone.kind,
    zoneRole: zone.styleRole ?? null,
    visible: zone.visible !== false
  };
}

