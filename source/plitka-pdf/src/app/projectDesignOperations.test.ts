import { describe, expect, it } from 'vitest';
import { createProject } from '../data/createProject';
import { getTemplate } from '../data/pageTemplates';
import { DividerZone, ImageZone, Project, TextZone } from '../types/project';
import {
  applyLogoStyleToProject,
  applyZoneStyleToProjectRole,
  applyDocumentSchemeToProject,
  prepareProjectForTopDesignChange,
  projectHasManualDesignOverrides,
  zoneStyleRole
} from './projectDesignOperations';

function findTextZoneProject() {
  const project = createProject('mini_catalog');
  for (const page of project.pages) {
    for (const zone of Object.values(page.zones)) {
      if (zone.kind === 'text') {
        return { project, page, zone };
      }
    }
  }
  throw new Error('Expected at least one text zone');
}

function findDividerZoneProject() {
  const project = createProject('mini_catalog');
  for (const page of project.pages) {
    for (const zone of Object.values(page.zones)) {
      if (zone.kind === 'divider') {
        return { project, page, zone };
      }
    }
  }
  throw new Error('Expected at least one divider zone');
}

function findImageZoneProject() {
  const project = createProject('mini_catalog');
  for (const page of project.pages) {
    for (const zone of Object.values(page.zones)) {
      if (zone.kind === 'image') {
        return { project, page, zone };
      }
    }
  }
  throw new Error('Expected at least one image zone');
}

describe('projectDesignOperations', () => {
  it('detects manual text color overrides and clears them for top design change', () => {
    const { project, page, zone } = findTextZoneProject();
    const nextProject = {
      ...project,
      pages: project.pages.map((currentPage) => currentPage.id === page.id
        ? {
            ...currentPage,
            zones: {
              ...currentPage.zones,
              [zone.id]: {
                ...zone,
                style: { ...(zone.style ?? {}), textColor: '#123456' },
                styleOverrides: { ...(zone.styleOverrides ?? {}), textColor: true }
              } satisfies TextZone
            }
          }
        : currentPage)
    };

    expect(projectHasManualDesignOverrides(nextProject, 'textColor')).toBe(true);

    const resetProject = prepareProjectForTopDesignChange(nextProject, 'textColor');
    const resetZone = resetProject.pages.find((item) => item.id === page.id)?.zones[zone.id];
    const templateZone = getTemplate(page.templateId).defaultZones[zone.id];

    expect(resetZone?.style?.textColor).toBe(templateZone?.style?.textColor);
    expect(resetZone?.styleOverrides?.textColor).toBeUndefined();
  });

  it('resets divider color overrides back to template defaults', () => {
    const { project, page, zone } = findDividerZoneProject();
    const nextProject = {
      ...project,
      pages: project.pages.map((currentPage) => currentPage.id === page.id
        ? {
            ...currentPage,
            zones: {
              ...currentPage.zones,
              [zone.id]: {
                ...zone,
                style: { ...(zone.style ?? {}), backgroundColor: '#abcdef' },
                styleOverrides: { ...(zone.styleOverrides ?? {}), backgroundColor: true }
              } satisfies DividerZone
            }
          }
        : currentPage)
    };

    const resetProject = prepareProjectForTopDesignChange(nextProject, 'dividerColor');
    const resetZone = resetProject.pages.find((item) => item.id === page.id)?.zones[zone.id];
    const templateZone = getTemplate(page.templateId).defaultZones[zone.id];

    expect(resetZone?.style?.backgroundColor).toBe(templateZone?.style?.backgroundColor);
    expect(resetZone?.styleOverrides?.backgroundColor).toBeUndefined();
  });

  it('restores image style defaults when resetting full project design', () => {
    const { project, page, zone } = findImageZoneProject();
    const nextProject = {
      ...project,
      pages: project.pages.map((currentPage) => currentPage.id === page.id
        ? {
            ...currentPage,
            zones: {
              ...currentPage.zones,
              [zone.id]: {
                ...zone,
                fit: 'contain',
                style: { ...(zone.style ?? {}), borderRadius: 24 },
                styleOverrides: { ...(zone.styleOverrides ?? {}), fit: true, borderRadius: true }
              } satisfies ImageZone
            }
          }
        : currentPage)
    };

    const resetProject = prepareProjectForTopDesignChange(nextProject, 'all');
    const resetZone = resetProject.pages.find((item) => item.id === page.id)?.zones[zone.id];
    const templateZone = getTemplate(page.templateId).defaultZones[zone.id];

    if (templateZone?.kind !== 'image' || resetZone?.kind !== 'image') {
      throw new Error('Expected image zones');
    }

    expect(resetZone.fit).toBe(templateZone.fit);
    expect(resetZone.styleOverrides).toBeUndefined();
  });

  it('applies a document scheme to project-level render settings', () => {
    const project = createProject('mini_catalog');
    const nextProject = applyDocumentSchemeToProject(project, 'premium_graphite');

    expect(nextProject.documentTheme).toBe('dark');
    expect(nextProject.documentAccent).toBe('gold');
    expect(nextProject.showPageNumbers).toBe(false);
    expect(nextProject.documentAccentColor).toBeUndefined();
  });

  it('applies text style to zones with the same derived role', () => {
    const project: Project = {
      ...createProject('empty'),
      pages: [
        {
          id: 'page_1',
          templateId: 'cover_catalog_hero',
          title: 'Page 1',
          order: 0,
          zones: {
            heading: {
              id: 'heading',
              kind: 'text',
              label: 'Heading',
              value: 'One',
              size: 'h1',
              align: 'left',
              layout: { x: 0, y: 0, w: 10, h: 5 },
              style: { textColor: '#111111' }
            },
            body: {
              id: 'description',
              kind: 'text',
              label: 'Description',
              value: 'Text',
              size: 'body',
              align: 'left',
              layout: { x: 0, y: 6, w: 10, h: 5 },
              style: { textColor: '#222222' }
            }
          }
        },
        {
          id: 'page_2',
          templateId: 'cover_catalog_hero',
          title: 'Page 2',
          order: 1,
          zones: {
            heading2: {
              id: 'heading2',
              kind: 'text',
              label: 'Heading',
              value: 'Two',
              size: 'h2',
              align: 'center',
              layout: { x: 0, y: 0, w: 10, h: 5 },
              style: { textColor: '#333333' }
            }
          }
        }
      ]
    };

    const sourceZone = project.pages[0].zones.heading;
    if (!sourceZone || sourceZone.kind !== 'text') {
      throw new Error('Expected text zone');
    }

    const nextProject = applyZoneStyleToProjectRole(project, {
      ...sourceZone,
      size: 'hero',
      align: 'right',
      fontFamily: 'palatino',
      fontSizePt: 28,
      fontWeight: 'bold',
      fontStyle: 'italic',
      underline: true,
      highlightColor: '#f7f4ef',
      style: { textColor: '#abcdef', backgroundColor: '#101010', borderRadius: 12, shadow: 'soft' }
    });
    const nextHeading = nextProject.pages[1].zones.heading2;
    const nextBody = nextProject.pages[0].zones.body;

    expect(nextHeading.kind).toBe('text');
    if (nextHeading.kind !== 'text') {
      throw new Error('Expected text zone');
    }
    expect(nextHeading.size).toBe('hero');
    expect(nextHeading.align).toBe('right');
    expect(nextHeading.fontFamily).toBe('palatino');
    expect(nextHeading.fontSizePt).toBe(28);
    expect(nextHeading.fontWeight).toBe('bold');
    expect(nextHeading.fontStyle).toBe('italic');
    expect(nextHeading.underline).toBe(true);
    expect(nextHeading.highlightColor).toBe('#f7f4ef');
    expect(nextHeading.style?.textColor).toBe('#abcdef');
    expect(nextHeading.styleOverrides?.fontFamily).toBe(true);
    expect(nextHeading.styleOverrides?.textColor).toBe(true);

    expect(nextBody.kind).toBe('text');
    if (nextBody.kind !== 'text') {
      throw new Error('Expected text zone');
    }
    expect(nextBody.style?.textColor).toBe('#222222');
  });

  it('resets typography overrides back to template defaults', () => {
    const { project, page, zone } = findTextZoneProject();
    const nextProject = {
      ...project,
      pages: project.pages.map((currentPage) => currentPage.id === page.id
        ? {
            ...currentPage,
            zones: {
              ...currentPage.zones,
              [zone.id]: {
                ...zone,
                fontFamily: 'arial',
                fontSizePt: 18,
                fontWeight: 'normal',
                fontStyle: 'italic',
                underline: true,
                highlightColor: '#fff8ed',
                styleOverrides: {
                  ...(zone.styleOverrides ?? {}),
                  fontFamily: true,
                  fontSizePt: true,
                  fontWeight: true,
                  fontStyle: true,
                  underline: true,
                  highlightColor: true
                }
              } satisfies TextZone
            }
          }
        : currentPage)
    };

    const resetProject = prepareProjectForTopDesignChange(nextProject, 'all');
    const resetZone = resetProject.pages.find((item) => item.id === page.id)?.zones[zone.id];
    const templateZone = getTemplate(page.templateId).defaultZones[zone.id];

    expect(resetZone?.kind).toBe('text');
    if (resetZone?.kind !== 'text' || templateZone?.kind !== 'text') {
      throw new Error('Expected text zones');
    }
    expect(resetZone.fontFamily).toBe(templateZone.fontFamily);
    expect(resetZone.fontSizePt).toBe(templateZone.fontSizePt);
    expect(resetZone.underline).toBe(templateZone.underline);
    expect(resetZone.highlightColor).toBe(templateZone.highlightColor);
    expect(resetZone.styleOverrides).toBeUndefined();
  });

  it('applies logo image style to every logo zone in the project', () => {
    const project: Project = {
      ...createProject('empty'),
      pages: [
        {
          id: 'page_1',
          templateId: 'cover_catalog_hero',
          title: 'Page 1',
          order: 0,
          zones: {
            logo: {
              id: 'logo',
              kind: 'image',
              label: 'Logo',
              src: 'logo-a',
              alt: 'A',
              fit: 'contain',
              layout: { x: 0, y: 0, w: 10, h: 5 },
              style: { backgroundColor: 'transparent', borderRadius: 0 }
            }
          }
        },
        {
          id: 'page_2',
          templateId: 'cover_catalog_hero',
          title: 'Page 2',
          order: 1,
          zones: {
            brandLogo: {
              id: 'brandLogo',
              kind: 'image',
              label: 'Company logo',
              src: 'logo-b',
              alt: 'B',
              fit: 'cover',
              layout: { x: 0, y: 0, w: 10, h: 5 },
              style: { backgroundColor: '#ffffff', borderRadius: 6 }
            }
          }
        }
      ]
    };

    const baseLogo = project.pages[0].zones.logo;
    if (!baseLogo || baseLogo.kind !== 'image') {
      throw new Error('Expected image zone');
    }

    const sourceLogo: ImageZone = {
      ...baseLogo,
      fit: 'contain',
      style: { backgroundColor: '#f5f5f5', borderRadius: 18, shadow: 'medium' as const }
    };

    const nextProject = applyLogoStyleToProject(project, sourceLogo);
    const nextLogo = nextProject.pages[1].zones.brandLogo;

    expect(nextLogo.kind).toBe('image');
    if (nextLogo.kind !== 'image') {
      throw new Error('Expected image zone');
    }
    expect(nextLogo.fit).toBe('contain');
    expect(nextLogo.style?.borderRadius).toBe(18);
    expect(nextLogo.styleOverrides?.fit).toBe(true);
  });

  it('derives stable style roles for shared formatting', () => {
    const { zone: textZone } = findTextZoneProject();
    const headingZone: TextZone = {
      ...textZone,
      id: 'heading',
      label: 'Заголовок страницы',
      styleRole: undefined
    };

    expect(zoneStyleRole(headingZone)).toBe('page-heading');
  });
});
