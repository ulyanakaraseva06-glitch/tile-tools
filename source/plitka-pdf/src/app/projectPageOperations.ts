import { clone } from '../utils/clone';
import { EditableZone, Page, Project } from '../types/project';

export function sortProjectPages(pages: Page[]): Page[] {
  return [...pages]
    .sort((a, b) => a.order - b.order)
    .map((page, order) => (page.order === order ? page : { ...page, order }));
}

export function updateProjectZone(project: Project, pageId: string, zone: EditableZone): Project {
  return {
    ...project,
    pages: project.pages.map((page) =>
      page.id === pageId ? { ...page, zones: { ...page.zones, [zone.id]: zone } } : page
    )
  };
}

export function addProjectPage(project: Project, page: Page): Project {
  return {
    ...project,
    pages: [...project.pages, page]
  };
}

export function duplicateProjectPage(project: Project, pageId: string, duplicateId: string): { project: Project; page: Page } | null {
  const sourcePage = project.pages.find((page) => page.id === pageId);
  if (!sourcePage) return null;

  const duplicatedPage: Page = {
    ...clone(sourcePage),
    id: duplicateId,
    title: `${sourcePage.title} копия`,
    order: project.pages.length
  };

  return {
    page: duplicatedPage,
    project: addProjectPage(project, duplicatedPage)
  };
}

export function deleteProjectPage(project: Project, pageId: string): Project {
  return {
    ...project,
    pages: sortProjectPages(project.pages.filter((page) => page.id !== pageId))
  };
}

export function moveProjectPage(project: Project, pageId: string, direction: -1 | 1): Project | null {
  const orderedPages = sortProjectPages(project.pages);
  const currentIndex = orderedPages.findIndex((page) => page.id === pageId);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedPages.length) {
    return null;
  }

  const nextPages = [...orderedPages];
  [nextPages[currentIndex], nextPages[targetIndex]] = [nextPages[targetIndex], nextPages[currentIndex]];

  return {
    ...project,
    pages: nextPages.map((page, order) => ({ ...page, order }))
  };
}

export function reorderProjectPage(project: Project, sourcePageId: string, targetPageId: string): Project | null {
  if (sourcePageId === targetPageId) return null;

  const orderedPages = sortProjectPages(project.pages);
  const sourceIndex = orderedPages.findIndex((page) => page.id === sourcePageId);
  const targetIndex = orderedPages.findIndex((page) => page.id === targetPageId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return null;
  }

  const nextPages = [...orderedPages];
  const [sourcePage] = nextPages.splice(sourceIndex, 1);
  nextPages.splice(targetIndex, 0, sourcePage);

  return {
    ...project,
    pages: nextPages.map((page, order) => ({ ...page, order }))
  };
}
