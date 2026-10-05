import type { Project } from '../types/project';
import { clone, createId } from '../utils/clone';

export type PresetApplyMode = 'replace' | 'append';

export function applySelectedPresetPages(
  currentProject: Project,
  presetProject: Project,
  selectedPageIds: string[],
  mode: PresetApplyMode
): Project {
  const selectedIds = new Set(selectedPageIds);
  const selectedPages = presetProject.pages.filter((page) => selectedIds.has(page.id));
  if (!selectedPages.length) return currentProject;

  const now = new Date().toISOString();
  if (mode === 'replace') {
    return {
      ...presetProject,
      id: currentProject.id,
      createdAt: currentProject.createdAt,
      pages: selectedPages.map((page, order) => ({ ...clone(page), order })),
      updatedAt: now
    };
  }

  const appendedPages = selectedPages.map((page, index) => ({
    ...clone(page),
    id: createId('page'),
    order: currentProject.pages.length + index
  }));
  const mediaAssets = new Map(currentProject.mediaAssets.map((asset) => [asset.id, asset]));
  presetProject.mediaAssets.forEach((asset) => mediaAssets.set(asset.id, clone(asset)));

  return {
    ...currentProject,
    pages: [...currentProject.pages, ...appendedPages],
    mediaAssets: [...mediaAssets.values()],
    updatedAt: now
  };
}
