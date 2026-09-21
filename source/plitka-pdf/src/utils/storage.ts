import { Page, Project, SavedProjectMeta, SavedTemplateMeta, ServiceSettings } from '../types/project';
import { defaultCompanyProfile } from '../data/defaultTexts';
import { clone, createId } from './clone';

const duplicateOutdoorSceneTemplateIds = new Set([
  'catalog_outdoor_collection_scene',
  'catalog_outdoor_scene_mix',
  'catalog_outdoor_scene_light',
  'catalog_outdoor_scene_concrete',
  'catalog_outdoor_scene_pure',
  'catalog_outdoor_scene_south'
]);

function collapseDuplicateOutdoorScenes(pages: Page[]): Page[] {
  let keptScene = false;
  const nextPages = pages.filter((page) => {
    if (!duplicateOutdoorSceneTemplateIds.has(page.templateId)) return true;
    if (keptScene) return false;
    keptScene = true;
    return true;
  });

  if (nextPages.length === pages.length) return pages;
  return nextPages.map((page, order) => ({ ...page, order }));
}

export const STORAGE_KEY = 'plitka_pdf_current_project';
export const SAVED_PROJECTS_KEY = 'plitka_pdf_saved_projects';
export const SAVED_TEMPLATES_KEY = 'plitka_pdf_saved_templates';
export const SETTINGS_KEY = 'plitka_pdf_service_settings';

export function normalizeProject(project: Project): Project {
  if (!project || !Array.isArray(project.pages)) {
    throw new Error('Файл не похож на проект Плитка ПДФ.');
  }

  const legacyTheme = project.theme ?? { mode: 'light', accent: 'purple' };
  return {
    ...project,
    mediaAssets: project.mediaAssets ?? [],
    companyProfile: { ...defaultCompanyProfile, ...(project.companyProfile ?? {}) },
    pageFormat: project.pageFormat ?? 'a4_portrait',
    documentTheme: project.documentTheme ?? legacyTheme.mode ?? 'light',
    documentAccent: project.documentAccent ?? legacyTheme.accent ?? 'purple',
    documentAccentColor: project.documentAccentColor,
    documentBackgroundColor: project.documentBackgroundColor,
    documentTextPalette: project.documentTextPalette ?? 'classic',
    documentTextPrimaryColor: project.documentTextPrimaryColor,
    documentTextSecondaryColor: project.documentTextSecondaryColor,
    documentDividerColor: project.documentDividerColor,
    showLogos: project.showLogos ?? false,
    showPageNumbers: project.showPageNumbers ?? true,
    showDividers: project.showDividers ?? true,
    theme: legacyTheme,
    pages: collapseDuplicateOutdoorScenes(project.pages)
  };
}

function writeStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function loadProject(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeProject(JSON.parse(raw) as Project) : null;
  } catch {
    return null;
  }
}

export function saveProject(project: Project): boolean {
  return writeStorage(
    STORAGE_KEY,
    JSON.stringify({
      ...project,
      updatedAt: new Date().toISOString()
    })
  );
}

export function loadSavedProjects(): SavedProjectMeta[] {
  try {
    const raw = localStorage.getItem(SAVED_PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as SavedProjectMeta[]) : [];
  } catch {
    return [];
  }
}

export function saveProjectToLibrary(project: Project): SavedProjectMeta[] {
  const savedAt = new Date().toISOString();
  const snapshotKey = `${SAVED_PROJECTS_KEY}_${project.id}`;
  const normalized = normalizeProject({ ...project, updatedAt: savedAt });
  if (!writeStorage(snapshotKey, JSON.stringify(normalized))) {
    throw new Error('Не удалось сохранить проект. Возможно, переполнено локальное хранилище браузера.');
  }

  const nextMeta: SavedProjectMeta = {
    id: normalized.id,
    title: normalized.title,
    preset: normalized.preset,
    pageCount: normalized.pages.length,
    updatedAt: savedAt
  };

  const list = [nextMeta, ...loadSavedProjects().filter((item) => item.id !== normalized.id)];
  if (!writeStorage(SAVED_PROJECTS_KEY, JSON.stringify(list))) {
    throw new Error('Не удалось обновить список сохранённых проектов.');
  }
  saveProject(normalized);
  return list;
}

export function loadSavedProject(id: string): Project | null {
  try {
    const raw = localStorage.getItem(`${SAVED_PROJECTS_KEY}_${id}`);
    return raw ? normalizeProject(JSON.parse(raw) as Project) : null;
  } catch {
    return null;
  }
}

export function deleteSavedProject(id: string): SavedProjectMeta[] {
  localStorage.removeItem(`${SAVED_PROJECTS_KEY}_${id}`);
  const list = loadSavedProjects().filter((item) => item.id !== id);
  writeStorage(SAVED_PROJECTS_KEY, JSON.stringify(list));
  return list;
}

export function loadSavedTemplates(): SavedTemplateMeta[] {
  try {
    const raw = localStorage.getItem(SAVED_TEMPLATES_KEY);
    return raw ? (JSON.parse(raw) as SavedTemplateMeta[]) : [];
  } catch {
    return [];
  }
}

export function saveProjectAsTemplate(project: Project): SavedTemplateMeta[] {
  const savedAt = new Date().toISOString();
  const templateId = createId('template');
  const title = project.title.trim() || 'Мой шаблон';
  const snapshot = normalizeProject({
    ...clone(project),
    id: templateId,
    title,
    updatedAt: savedAt
  });
  if (!writeStorage(`${SAVED_TEMPLATES_KEY}_${templateId}`, JSON.stringify(snapshot))) {
    throw new Error('Не удалось сохранить шаблон. Возможно, переполнено локальное хранилище браузера.');
  }

  const nextMeta: SavedTemplateMeta = {
    id: templateId,
    title,
    pageCount: snapshot.pages.length,
    updatedAt: savedAt
  };
  const list = [nextMeta, ...loadSavedTemplates()];
  if (!writeStorage(SAVED_TEMPLATES_KEY, JSON.stringify(list))) {
    throw new Error('Не удалось обновить список шаблонов.');
  }
  return list;
}

export function loadSavedTemplate(id: string): Project | null {
  try {
    const raw = localStorage.getItem(`${SAVED_TEMPLATES_KEY}_${id}`);
    return raw ? normalizeProject(JSON.parse(raw) as Project) : null;
  } catch {
    return null;
  }
}

export function createProjectFromSavedTemplate(id: string): Project | null {
  const template = loadSavedTemplate(id);
  if (!template) return null;
  const now = new Date().toISOString();
  return normalizeProject({
    ...clone(template),
    id: createId('project'),
    title: template.title,
    pages: template.pages.map((page, order) => ({
      ...page,
      id: createId('page'),
      order
    })),
    createdAt: now,
    updatedAt: now
  });
}

export function deleteSavedTemplate(id: string): SavedTemplateMeta[] {
  localStorage.removeItem(`${SAVED_TEMPLATES_KEY}_${id}`);
  const list = loadSavedTemplates().filter((item) => item.id !== id);
  writeStorage(SAVED_TEMPLATES_KEY, JSON.stringify(list));
  return list;
}

export function loadServiceSettings(): ServiceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ServiceSettings>) : {};
    return {
      interfaceTheme: parsed.interfaceTheme ?? 'light',
      companyProfile: { ...defaultCompanyProfile, ...(parsed.companyProfile ?? {}) },
      recentCustomColors: parsed.recentCustomColors?.slice(0, 6) ?? [],
      defaultDocumentScheme: parsed.defaultDocumentScheme ?? 'classic',
      showVilrayPromo: parsed.showVilrayPromo ?? true
    };
  } catch {
    return {
      interfaceTheme: 'light',
      companyProfile: defaultCompanyProfile,
      recentCustomColors: [],
      defaultDocumentScheme: 'classic',
      showVilrayPromo: true
    };
  }
}

export function saveServiceSettings(settings: ServiceSettings): boolean {
  return writeStorage(SETTINGS_KEY, JSON.stringify(settings));
}
