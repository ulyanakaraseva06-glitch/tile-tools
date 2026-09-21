import { useId, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';
import { DocumentRenderSettings, Page } from '../../types/project';
import { AddPageModal } from '../modals/AddPageModal';
import { FitPagePreview } from '../FitPagePreview/FitPagePreview';

type DocumentPageStripProps = {
  pages: Page[];
  renderSettings: DocumentRenderSettings;
  selectedPageId: string;
  onSelectPage: (pageId: string) => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onMove: (pageId: string, direction: -1 | 1) => void;
  onReorder: (sourcePageId: string, targetPageId: string) => void;
  onAddPage: (templateId: string) => void;
  onAddBlankPage?: () => void;
};

export function DocumentPageStrip(props: DocumentPageStripProps) {
  const { pages, renderSettings, selectedPageId, onSelectPage, onDuplicate, onDelete, onMove, onReorder, onAddPage, onAddBlankPage } = props;
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [dropTargetPageId, setDropTargetPageId] = useState<string | null>(null);
  const [isCatalogOpen, setCatalogOpen] = useState(false);
  const listId = useId();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('plitka_page_strip_collapsed') === 'true'; } catch { return false; }
  });

  function toggleCollapsed() {
    setCollapsed((current) => {
      try { localStorage.setItem('plitka_page_strip_collapsed', String(!current)); } catch { /* Optional preference. */ }
      return !current;
    });
  }

  return (
    <section className={`page-strip${collapsed ? ' is-collapsed' : ''}`}>
      <div className="strip-heading">
        <strong>Страницы документа</strong>
        <span>Страниц: {pages.length}</span>
        <div className="strip-heading-actions">
          <button className="icon-btn" type="button" onClick={() => setCatalogOpen(true)} title="Добавить страницу" aria-label="Добавить страницу" aria-haspopup="dialog"><Plus size={16} /></button>
          <button className="btn btn-ghost strip-collapse-btn" type="button" onClick={toggleCollapsed} aria-expanded={!collapsed} aria-controls={listId}>
            {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {collapsed ? 'Развернуть' : 'Свернуть'}
          </button>
        </div>
      </div>
      <div className="strip-list" id={listId} hidden={collapsed}>
        {pages.map((page, index) => (
          <article
            key={page.id}
            className={`strip-card ${selectedPageId === page.id ? 'active' : ''} ${draggingPageId === page.id ? 'dragging' : ''} ${dropTargetPageId === page.id && draggingPageId !== page.id ? 'drop-target' : ''}`}
            draggable
            onDragStart={(event) => {
              setDraggingPageId(page.id);
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', page.id);
            }}
            onDragOver={(event) => {
              if (!draggingPageId || draggingPageId === page.id) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropTargetPageId(page.id);
            }}
            onDragLeave={() => {
              if (dropTargetPageId === page.id) setDropTargetPageId(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourcePageId = event.dataTransfer.getData('text/plain') || draggingPageId;
              setDraggingPageId(null);
              setDropTargetPageId(null);
              if (sourcePageId && sourcePageId !== page.id) onReorder(sourcePageId, page.id);
            }}
            onDragEnd={() => {
              setDraggingPageId(null);
              setDropTargetPageId(null);
            }}
          >
            <button className="thumb-button" onClick={() => onSelectPage(page.id)} aria-label={`Страница ${index + 1}: ${page.title}`}>
              <FitPagePreview page={page} renderSettings={renderSettings} padding={3} />
            </button>
            <div className="strip-card-meta">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{page.title}</strong>
            </div>
            <div className="strip-actions">
              <button title="Левее" onClick={() => onMove(page.id, -1)} disabled={index === 0}><ArrowLeft size={14} /></button>
              <button title="Правее" onClick={() => onMove(page.id, 1)} disabled={index === pages.length - 1}><ArrowRight size={14} /></button>
              <button title="Дублировать" onClick={() => onDuplicate(page.id)}><Copy size={14} /></button>
              <button title="Удалить" onClick={() => onDelete(page.id)} disabled={pages.length <= 1}><Trash2 size={14} /></button>
            </div>
          </article>
        ))}
        <button
          className="add-page-card"
          type="button"
          onClick={() => setCatalogOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isCatalogOpen}
        >
          <Plus size={22} />
          <span>Добавить страницу</span>
        </button>
      </div>
      {isCatalogOpen && (
        <AddPageModal
          renderSettings={renderSettings}
          onAddPage={onAddPage}
          onAddBlankPage={onAddBlankPage}
          onClose={() => setCatalogOpen(false)}
        />
      )}
    </section>
  );
}
