import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Contact,
  FileText,
  Grid3X3,
  ImageIcon,
  Layers,
  Palette,
  Plus,
  Ruler,
  Search,
  Table2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { categories, pageTemplates } from '../../data/pageTemplates';
import { DocumentRenderSettings } from '../../types/project';
import { PageTemplate } from '../../types/templates';
import { FitPagePreview } from '../FitPagePreview/FitPagePreview';
import { PageTemplateCard, TemplatePreviewSettings, templatePreviewPage } from '../PageTemplateCard/PageTemplateCard';

type AddPageModalProps = {
  renderSettings: DocumentRenderSettings;
  onAddPage: (templateId: string) => void;
  onAddBlankPage?: () => void;
  onClose: () => void;
};

const categoryIcons = {
  cover: FileText,
  catalog_overview: BookOpen,
  catalog_grid: Grid3X3,
  catalog_interior: ImageIcon,
  catalog_visual_focus: Layers,
  catalog_specs: Ruler,
  catalog_moodboard: Palette,
  table: Table2,
  price: FileText,
  contacts: Contact
} as const;

const categoryLabels: Record<string, string> = {
  cover: 'Обложки',
  catalog_overview: 'Обзор серии',
  catalog_grid: 'Товарные сетки',
  catalog_interior: 'Интерьер + товары',
  catalog_visual_focus: 'Крупные сцены',
  catalog_specs: 'Форматы и техданные',
  catalog_moodboard: 'Moodboard',
  table: 'Техлисты',
  price: 'Прайс',
  contacts: 'Контакты'
};

const templateSearchIndex = pageTemplates.map((template) => ({
  template,
  searchText: [template.title, template.description, categoryLabels[template.category] ?? ''].join(' ').toLowerCase()
}));

export function AddPageModal({ renderSettings, onAddPage, onAddBlankPage, onClose }: AddPageModalProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState<PageTemplate | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previewSettings = useMemo<TemplatePreviewSettings>(() => renderSettings, [renderSettings]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return templateSearchIndex
      .filter((entry) => {
        if (search && !entry.searchText.includes(search)) return false;
        if (!search && activeCategory !== 'all' && entry.template.category !== activeCategory) return false;
        return true;
      })
      .map((entry) => entry.template);
  }, [query, activeCategory]);

  const templatesByCategory = useMemo(() => {
    const grouped = new Map<string, PageTemplate[]>();
    for (const template of filtered) {
      const current = grouped.get(template.category) ?? [];
      current.push(template);
      grouped.set(template.category, current);
    }
    return grouped;
  }, [filtered]);

  const previewIndex = previewTemplate ? filtered.findIndex((template) => template.id === previewTemplate.id) : -1;
  const canNavigatePreview = filtered.length > 1;

  function addTemplate(templateId: string) {
    onAddPage(templateId);
    onClose();
  }

  function openAdjacentPreview(direction: -1 | 1) {
    if (!filtered.length) return;
    const currentIndex = previewIndex >= 0 ? previewIndex : 0;
    const nextIndex = (currentIndex + direction + filtered.length) % filtered.length;
    setPreviewTemplate(filtered[nextIndex]);
  }

  useEffect(() => {
    searchRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (previewTemplate) {
        setPreviewTemplate(null);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, previewTemplate]);

  const catalog = (
    <div className="modal-backdrop add-page-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="add-page-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-page-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="add-page-modal-header">
          <div>
            <span>Страницы документа</span>
            <h2 id="add-page-modal-title">Каталог страниц</h2>
          </div>
          <div className="add-page-modal-header-actions">
            {onAddBlankPage && (
              <button
                type="button"
                className="btn btn-ghost add-page-blank-btn"
                onClick={() => {
                  onAddBlankPage();
                  onClose();
                }}
              >
                <Plus size={16} />
                Создать с нуля
              </button>
            )}
            <button type="button" className="close-btn" onClick={onClose} title="Закрыть" aria-label="Закрыть">
              <X size={18} />
            </button>
          </div>
        </header>

        <label className="search-field add-page-modal-search">
          <Search size={16} />
          <input
            ref={searchRef}
            placeholder="Поиск макета"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="add-page-category-pills" role="tablist" aria-label="Категории страниц">
          <button
            type="button"
            className={activeCategory === 'all' ? 'active' : ''}
            onClick={() => setActiveCategory('all')}
          >
            Все
            <small>{pageTemplates.length}</small>
          </button>
          {categories.map((category) => {
            const count = pageTemplates.filter((template) => template.category === category.id).length;
            if (!count) return null;
            return (
              <button
                key={category.id}
                type="button"
                className={activeCategory === category.id ? 'active' : ''}
                onClick={() => setActiveCategory(category.id)}
              >
                {categoryLabels[category.id] ?? category.title}
                <small>{count}</small>
              </button>
            );
          })}
        </div>

        <div className="add-page-modal-body">
          {filtered.length === 0 && (
            <section className="template-empty-state">
              <strong>Ничего не найдено</strong>
              <span>Измените поиск или выберите другую категорию.</span>
            </section>
          )}

          {categories.map((category) => {
            const templates = templatesByCategory.get(category.id) ?? [];
            if (!templates.length) return null;
            const CategoryIcon = categoryIcons[category.id as keyof typeof categoryIcons] ?? FileText;
            return (
              <section key={category.id} className="add-page-modal-group">
                <div className="add-page-modal-group-title">
                  <CategoryIcon size={15} />
                  <span>{categoryLabels[category.id] ?? category.title}</span>
                  <small>{templates.length}</small>
                </div>
                <div className="template-grid add-page-modal-grid">
                  {templates.map((template) => (
                    <PageTemplateCard
                      key={template.id}
                      template={template}
                      previewSettings={previewSettings}
                      onAdd={() => addTemplate(template.id)}
                      onPreview={() => setPreviewTemplate(template)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );

  const preview = previewTemplate ? (
    <div
      className="modal-backdrop template-preview-modal-backdrop add-page-preview-backdrop"
      onClick={() => setPreviewTemplate(null)}
    >
      <section className="template-preview-modal" onClick={(event) => event.stopPropagation()}>
        <button className="close-btn" onClick={() => setPreviewTemplate(null)} title="Закрыть" aria-label="Закрыть">
          <X size={20} />
        </button>
        <button
          className="template-preview-nav template-preview-nav-prev"
          onClick={() => openAdjacentPreview(-1)}
          disabled={!canNavigatePreview}
          title="Предыдущая страница"
          aria-label="Предыдущая страница"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          className="template-preview-nav template-preview-nav-next"
          onClick={() => openAdjacentPreview(1)}
          disabled={!canNavigatePreview}
          title="Следующая страница"
          aria-label="Следующая страница"
        >
          <ArrowRight size={20} />
        </button>
        <header className="template-preview-modal-header">
          <div>
            <span>Предпросмотр страницы</span>
            <strong>{previewTemplate.title}</strong>
          </div>
        </header>
        <FitPagePreview
          page={templatePreviewPage(previewTemplate)}
          className="template-preview-modal-page"
          padding={24}
          renderSettings={previewSettings}
          previewPageNumber
        />
        <footer className="template-preview-modal-actions">
          <button className="btn btn-primary btn-export-soft" onClick={() => addTemplate(previewTemplate.id)}>
            <Plus size={16} />
            Добавить страницу
          </button>
        </footer>
      </section>
    </div>
  ) : null;

  return createPortal(
    <>
      {catalog}
      {preview}
    </>,
    document.body
  );
}
