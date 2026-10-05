import { describe, expect, it } from 'vitest';
import { createProject } from '../data/createProject';
import { applySelectedPresetPages } from './presetPageSelection';

describe('applySelectedPresetPages', () => {
  it('replaces the document with only checked template pages', () => {
    const current = createProject('mini_catalog');
    const preset = createProject('commercial_offer');
    const selected = [preset.pages[1].id, preset.pages[3].id];
    const result = applySelectedPresetPages(current, preset, selected, 'replace');

    expect(result.id).toBe(current.id);
    expect(result.pages.map((page) => page.templateId)).toEqual([
      preset.pages[1].templateId,
      preset.pages[3].templateId
    ]);
    expect(result.pages.map((page) => page.order)).toEqual([0, 1]);
  });

  it('appends checked pages without replacing the active project', () => {
    const current = createProject('mini_catalog');
    const preset = createProject('price_list');
    const originalCount = current.pages.length;
    const result = applySelectedPresetPages(current, preset, [preset.pages[0].id], 'append');
    const appendedPage = result.pages[result.pages.length - 1];

    expect(result.id).toBe(current.id);
    expect(result.pages).toHaveLength(originalCount + 1);
    expect(appendedPage.templateId).toBe(preset.pages[0].templateId);
    expect(appendedPage.id).not.toBe(preset.pages[0].id);
    expect(appendedPage.order).toBe(originalCount);
  });

  it('does nothing when no pages are selected', () => {
    const current = createProject('mini_catalog');
    const preset = createProject('price_list');
    expect(applySelectedPresetPages(current, preset, [], 'replace')).toBe(current);
  });
});
