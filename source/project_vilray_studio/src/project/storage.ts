import type { TileProject } from '../types/project';

const GUEST_STORAGE_KEY = 'poschitay-plitku.project.v1';
const accountId = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('account') ?? '';
const STORAGE_KEY = accountId ? `${GUEST_STORAGE_KEY}.user.${accountId}` : GUEST_STORAGE_KEY;
const FILE_FORMAT = 'vilray-project';

export function saveProject(project: TileProject, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function loadProject(storage: Storage = localStorage): TileProject | null {
  if (accountId && !storage.getItem(STORAGE_KEY) && storage.getItem(GUEST_STORAGE_KEY)) {
    storage.setItem(STORAGE_KEY, storage.getItem(GUEST_STORAGE_KEY) as string);
    storage.removeItem(GUEST_STORAGE_KEY);
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as TileProject;
    if (parsed.schemaVersion !== 1 || !parsed.room || !Array.isArray(parsed.surfaces)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearProject(storage: Storage = localStorage): void {
  storage.removeItem(STORAGE_KEY);
}

export function serializeProjectFile(project: TileProject): string {
  return JSON.stringify({ format: FILE_FORMAT, version: 1, project }, null, 2);
}

export function parseProjectFile(raw: string): TileProject | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const project = parsed.format === FILE_FORMAT && parsed.version === 1 ? parsed.project as TileProject | undefined : parsed as unknown as TileProject;
    if (!project || project.schemaVersion !== 1 || !project.room || !Array.isArray(project.surfaces) || !Array.isArray(project.materials)) return null;
    return project;
  } catch {
    return null;
  }
}
