import { describe, expect, it } from 'vitest';
import { EditableZone, Project } from '../types/project';
import {
  addProjectPage,
  deleteProjectPage,
  duplicateProjectPage,
  moveProjectPage,
  reorderProjectPage,
  sortProjectPages,
  updateProjectZone
} from './projectPageOperations';

function createZone(id: string, value: string): EditableZone {
  return {
    id,
    kind: 'text',
    label: id,
    value,
    layout: { x: 0, y: 0, w: 10, h: 10 }
  };
}

function createProject(): Project {
  return {
    id: 'project_1',
    title: 'Project',
    preset: 'empty',
    pageFormat: 'a4_portrait',
    documentTheme: 'light',
    documentAccent: 'purple',
    documentTextPalette: 'classic',
    showLogos: false,
    showPageNumbers: true,
    showDividers: true,
    theme: { mode: 'light', accent: 'purple' },
    pages: [
      {
        id: 'page_1',
        templateId: 'cover_catalog_hero',
        title: 'Page 1',
        order: 0,
        zones: { heading: createZone('heading', 'One') }
      },
      {
        id: 'page_2',
        templateId: 'cover_catalog_hero',
        title: 'Page 2',
        order: 1,
        zones: { heading: createZone('heading', 'Two') }
      },
      {
        id: 'page_3',
        templateId: 'cover_catalog_hero',
        title: 'Page 3',
        order: 2,
        zones: { heading: createZone('heading', 'Three') }
      }
    ],
    mediaAssets: [],
    companyProfile: {
      companyName: '',
      managerName: '',
      phone: '',
      messenger: '',
      email: '',
      website: '',
      address: ''
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

describe('projectPageOperations', () => {
  it('sorts pages and preserves references when order is already correct', () => {
    const project = createProject();
    const sorted = sortProjectPages(project.pages);

    expect(sorted[0]).toBe(project.pages[0]);
    expect(sorted[1]).toBe(project.pages[1]);
  });

  it('updates one zone without touching other pages', () => {
    const project = createProject();
    const nextZone = createZone('heading', 'Updated');

    const nextProject = updateProjectZone(project, 'page_2', nextZone);
    const updatedZone = nextProject.pages[1].zones.heading;

    expect(updatedZone.kind).toBe('text');
    if (updatedZone.kind !== 'text') {
      throw new Error('Expected text zone');
    }
    expect(updatedZone.value).toBe('Updated');
    expect(nextProject.pages[0]).toBe(project.pages[0]);
    expect(nextProject.pages[1]).not.toBe(project.pages[1]);
  });

  it('duplicates a page with a new id and independent nested zones', () => {
    const project = createProject();
    const result = duplicateProjectPage(project, 'page_1', 'page_copy');

    expect(result).not.toBeNull();
    expect(result?.page.id).toBe('page_copy');
    expect(result?.project.pages).toHaveLength(4);
    expect(result?.page.zones).not.toBe(project.pages[0].zones);
  });

  it('deletes a page and normalizes order', () => {
    const project = createProject();
    const nextProject = deleteProjectPage(project, 'page_2');

    expect(nextProject.pages.map((page) => page.id)).toEqual(['page_1', 'page_3']);
    expect(nextProject.pages.map((page) => page.order)).toEqual([0, 1]);
  });

  it('moves a page left or right and reorders pages', () => {
    const project = createProject();
    const nextProject = moveProjectPage(project, 'page_2', -1);

    expect(nextProject?.pages.map((page) => page.id)).toEqual(['page_2', 'page_1', 'page_3']);
    expect(nextProject?.pages.map((page) => page.order)).toEqual([0, 1, 2]);
  });

  it('reorders a page by drag target and reindexes orders', () => {
    const project = createProject();
    const nextProject = reorderProjectPage(project, 'page_1', 'page_3');

    expect(nextProject?.pages.map((page) => page.id)).toEqual(['page_2', 'page_3', 'page_1']);
    expect(nextProject?.pages.map((page) => page.order)).toEqual([0, 1, 2]);
  });

  it('adds a new page to the end', () => {
    const project = createProject();
    const nextPage = {
      id: 'page_4',
      templateId: 'cover_catalog_hero',
      title: 'Page 4',
      order: 3,
      zones: { heading: createZone('heading', 'Four') }
    };

    const nextProject = addProjectPage(project, nextPage);

    expect(nextProject.pages).toHaveLength(4);
    expect(nextProject.pages[3]).toBe(nextPage);
  });
});
