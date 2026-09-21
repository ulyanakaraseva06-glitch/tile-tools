import { describe, expect, it } from 'vitest';
import { createProject } from '../data/createProject';
import { normalizeProject } from './storage';

describe('normalizeProject', () => {
  it('keeps a single outdoor hero scene when older duplicates are present', () => {
    const project = createProject('outdoor_collection');
    const duplicate = {
      ...project.pages[0],
      id: 'page-outdoor-dup',
      templateId: 'catalog_outdoor_scene_mix',
      title: 'Outdoor: конгломерат',
      order: 1
    };

    const normalized = normalizeProject({
      ...project,
      pages: [project.pages[0], duplicate, ...project.pages.slice(1)]
    });

    expect(normalized.pages.filter((page) => page.templateId === 'catalog_outdoor_collection_scene' || page.templateId.startsWith('catalog_outdoor_scene_'))).toHaveLength(1);
    expect(normalized.pages[0].templateId).toBe('catalog_outdoor_collection_scene');
    expect(normalized.pages.map((page) => page.order)).toEqual(normalized.pages.map((_, index) => index));
  });
});
