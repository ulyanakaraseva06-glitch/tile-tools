import { Project } from '../types/project';
import { normalizeProject } from './storage';

export function exportProjectJson(project: Project): void {
  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = (project.title || 'plitka-pdf').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60);
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeTitle}-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function readProjectJson(file: File): Promise<Project> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Project;
  return normalizeProject(parsed);
}
