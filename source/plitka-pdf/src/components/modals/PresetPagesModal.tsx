import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DocumentRenderSettings, Project } from '../../types/project';
import type { PresetApplyMode } from '../../app/presetPageSelection';
import { FitPagePreview } from '../FitPagePreview/FitPagePreview';

type PresetPagesModalProps = {
  presetProject: Project;
  renderSettings: DocumentRenderSettings;
  onApply: (selectedPageIds: string[], mode: PresetApplyMode) => void;
  onClose: () => void;
};

export function PresetPagesModal({ presetProject, renderSettings, onApply, onClose }: PresetPagesModalProps) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(presetProject.pages.map((page) => page.id)));
  const allSelected = selectedIds.size === presetProject.pages.length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function togglePage(pageId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(pageId)) next.delete(pageId); else next.add(pageId);
      return next;
    });
  }

  function apply(mode: PresetApplyMode) {
    if (!selectedIds.size) return;
    onApply(presetProject.pages.filter((page) => selectedIds.has(page.id)).map((page) => page.id), mode);
  }

  return (
    <div className="modal-backdrop preset-pages-backdrop" onClick={onClose}>
      <section className="preset-pages-modal" role="dialog" aria-modal="true" aria-labelledby="preset-pages-title" onClick={(event) => event.stopPropagation()}>
        <header className="preset-pages-header">
          <div>
            <span>Готовый шаблон</span>
            <h2 id="preset-pages-title">{presetProject.title}</h2>
            <p>Отметьте страницы, которые нужно перенести в проект.</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </header>

        <div className="preset-pages-toolbar">
          <strong>Выбрано: {selectedIds.size} из {presetProject.pages.length}</strong>
          <button type="button" onClick={() => setSelectedIds(allSelected ? new Set() : new Set(presetProject.pages.map((page) => page.id)))}>
            {allSelected ? 'Снять выделение' : 'Выбрать все'}
          </button>
        </div>

        <div className="preset-pages-grid">
          {presetProject.pages.map((page, index) => {
            const checked = selectedIds.has(page.id);
            return (
              <label key={page.id} className={`preset-page-choice ${checked ? 'selected' : ''}`}>
                <input className="preset-page-checkbox" type="checkbox" checked={checked} onChange={() => togglePage(page.id)} />
                <span className="preset-page-check" aria-hidden="true">{checked && <Check size={15} strokeWidth={3} />}</span>
                <FitPagePreview page={page} renderSettings={renderSettings} previewPageNumber />
                <span className="preset-page-caption"><b>{index + 1}</b><strong>{page.title}</strong></span>
              </label>
            );
          })}
        </div>

        <footer className="preset-pages-actions">
          <p>{selectedIds.size ? 'Выберите способ добавления отмеченных страниц.' : 'Выберите хотя бы одну страницу.'}</p>
          <div>
            <button className="btn btn-ghost" type="button" disabled={!selectedIds.size} onClick={() => apply('append')}>Добавить к существующему</button>
            <button className="btn btn-primary" type="button" disabled={!selectedIds.size} onClick={() => apply('replace')}>Заменить существующий проект</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
