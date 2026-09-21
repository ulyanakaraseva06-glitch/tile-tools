import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DocumentPageStrip } from './DocumentPageStrip';
import { createProject } from '../../data/createProject';

vi.mock('../FitPagePreview/FitPagePreview', () => ({ FitPagePreview: () => <span>Миниатюра</span> }));
vi.mock('../modals/AddPageModal', () => ({ AddPageModal: () => <div role="dialog">Каталог страниц</div> }));
beforeEach(() => localStorage.clear());
afterEach(cleanup);

it('collapses and restores pages, remembers the preference and keeps adding available', () => {
  const project = createProject('mini_catalog');
  const props = { pages: project.pages, renderSettings: project, selectedPageId: project.pages[0].id,
    onSelectPage: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onMove: vi.fn(), onReorder: vi.fn(), onAddPage: vi.fn() };
  const first = render(<DocumentPageStrip {...props} />);
  const page = screen.getByRole('button', { name: `Страница 1: ${project.pages[0].title}` });
  fireEvent.click(screen.getByRole('button', { name: 'Свернуть' }));
  expect(page).not.toBeVisible();
  expect(screen.getByRole('button', { name: 'Развернуть' })).toHaveAttribute('aria-expanded', 'false');
  expect(localStorage.getItem('plitka_page_strip_collapsed')).toBe('true');
  first.unmount();
  render(<DocumentPageStrip {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Добавить страницу' }));
  expect(screen.getByRole('dialog')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Развернуть' }));
  fireEvent.click(screen.getByRole('button', { name: `Страница 1: ${project.pages[0].title}` }));
  expect(props.onSelectPage).toHaveBeenCalledWith(project.pages[0].id);
});
