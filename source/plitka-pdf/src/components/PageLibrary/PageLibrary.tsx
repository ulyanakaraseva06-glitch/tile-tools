import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Contact,
  FileText,
  Grid3X3,
  ImageIcon,
  Layers,
  Palette,
  Pencil,
  Plus,
  RectangleHorizontal,
  RectangleVertical,
  Ruler,
  Search,
  Star,
  Table2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { visiblePresetSummaries } from '../../data/createProject';
import { categories, pageTemplates } from '../../data/pageTemplates';
import { DocumentRenderSettings, PresetId, SavedTemplateMeta } from '../../types/project';
import { LibraryAudience, LibrarySection, PageTemplate } from '../../types/templates';
import { FitPagePreview } from '../FitPagePreview/FitPagePreview';
import { PageTemplateCard, TemplatePreviewSettings, templatePreviewPage } from '../PageTemplateCard/PageTemplateCard';

type PageLibraryProps = {
  currentPreset: PresetId;
  projectTitle: string;
  renderSettings: DocumentRenderSettings;
  initialPresetsOpen?: boolean;
  onProjectTitleChange: (title: string) => void;
  onPresetChange: (preset: PresetId) => void;
  userTemplates?: SavedTemplateMeta[];
  onApplyUserTemplate?: (templateId: string) => void;
  onDeleteUserTemplate?: (templateId: string) => void;
  onAddPage: (templateId: string) => void;
  onApplyPageFormat: (pageFormat: DocumentRenderSettings['pageFormat']) => void;
};

type TemplateVote = {
  up: number;
  down: number;
  userVote?: 'up' | 'down';
};

const sectionLabels: Record<LibrarySection, string> = {
  cover: 'Обложки',
  overview: 'Обзор серии',
  grid: 'Товарные сетки',
  interior: 'Интерьер',
  specs: 'Форматы и техданные',
  table: 'Техлисты',
  price: 'Прайс',
  contacts: 'Контакты'
};

const audienceLabels: Record<LibraryAudience, string> = {
  brand: 'Бренд',
  dealer: 'Дилер',
  client: 'Клиент'
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
  searchText: [
    template.title,
    template.description,
    template.librarySection ? sectionLabels[template.librarySection] : '',
    ...(template.audiences?.map((audience) => audienceLabels[audience]) ?? [])
  ].join(' ').toLowerCase()
}));

export function PageLibrary({
  currentPreset,
  projectTitle,
  renderSettings,
  initialPresetsOpen = false,
  onProjectTitleChange,
  onPresetChange,
  userTemplates = [],
  onApplyUserTemplate,
  onDeleteUserTemplate,
  onAddPage,
  onApplyPageFormat
}: PageLibraryProps) {
  const [query, setQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [presetsOpen, setPresetsOpen] = useState(initialPresetsOpen);
  const [userTemplatesOpen, setUserTemplatesOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PageTemplate | null>(null);
  const [templateVotes, setTemplateVotes] = useState<Record<string, TemplateVote>>({});

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return templateSearchIndex
      .filter((entry) => {
        if (search && !entry.searchText.includes(search)) return false;
        return true;
      })
      .map((entry) => entry.template);
  }, [query]);

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
  const previewVote = previewTemplate ? templateVotes[previewTemplate.id] ?? { up: 0, down: 0 } : { up: 0, down: 0 };
  const previewSettings = useMemo<TemplatePreviewSettings>(() => renderSettings, [renderSettings]);
  const filtersActive = Boolean(query.trim());

  function openAdjacentPreview(direction: -1 | 1) {
    if (!filtered.length) return;
    const currentIndex = previewIndex >= 0 ? previewIndex : 0;
    const nextIndex = (currentIndex + direction + filtered.length) % filtered.length;
    setPreviewTemplate(filtered[nextIndex]);
  }

  function addPreviewTemplate() {
    if (!previewTemplate) return;
    onAddPage(previewTemplate.id);
  }

  function openPreview(template: PageTemplate) {
    setPreviewTemplate(template);
  }

  function resetFilters() {
    setQuery('');
  }

  function togglePresets() {
    const next = !presetsOpen;
    setPresetsOpen(next);
    if (next) setUserTemplatesOpen(false);
  }

  function voteForTemplate(templateId: string, vote: 'up' | 'down') {
    setTemplateVotes((current) => {
      const previous = current[templateId] ?? { up: 0, down: 0 };
      if (previous.userVote === vote) return current;

      const next: TemplateVote = {
        up: previous.up + (vote === 'up' ? 1 : 0) - (previous.userVote === 'up' ? 1 : 0),
        down: previous.down + (vote === 'down' ? 1 : 0) - (previous.userVote === 'down' ? 1 : 0),
        userVote: vote
      };
      return { ...current, [templateId]: next };
    });
  }

  useEffect(() => {
    if (!previewTemplate) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewTemplate(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewTemplate]);

  return (
    <aside className="page-library">
      <section className="library-project-title">
        <span>Название проекта</span>
        <label className="project-title">
          <input value={projectTitle} onChange={(event) => onProjectTitleChange(event.target.value)} />
          <Pencil size={15} />
        </label>
      </section>

     

      <div className="library-toolbar">
        {filtersActive && (
          <button type="button" className="library-reset-btn" onClick={resetFilters}>
            Сбросить
          </button>
        )}
      </div>

     

      <label className="search-field">
        <Search size={16} />
        <input placeholder="Поиск" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>

      <section className={`preset-library-control preset-dropdown-library ${presetsOpen ? 'is-open' : ''}`}>
        <button
          type="button"
          className={`group-title ${presetsOpen ? 'open' : ''}`}
          onClick={togglePresets}
        >
          <span className="group-title-copy">
            <BookOpen size={15} />
            <span>Готовые шаблоны</span>
          </span>
          <small>{visiblePresetSummaries.length}</small>
          <ChevronDown size={16} />
        </button>
        {presetsOpen && (
          <div className="preset-template-list">
            {visiblePresetSummaries.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={currentPreset === preset.id ? 'active' : ''}
                onClick={() => onPresetChange(preset.id)}
              >
                <BookOpen size={14} />
                <span className="preset-copy">
                  <strong>{preset.label}</strong>
                  <small>{preset.pageCount} стр.</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {!presetsOpen && (
        <div className="template-groups">
          {filtered.length === 0 && (
            <section className="template-empty-state">
              <strong>Ничего не найдено</strong>
              <span>Измените поиск или сбросьте фильтры, чтобы вернуться ко всей библиотеке.</span>
            </section>
          )}

          {categories.map((category) => {
            const templates = templatesByCategory.get(category.id) ?? [];
            if (!templates.length) return null;
            const isOpen = filtersActive || openCategories.includes(category.id);
            const CategoryIcon = categoryIcons[category.id as keyof typeof categoryIcons] ?? FileText;
            return (
              <section key={category.id} className="template-group">
                <button
                  className={`group-title ${isOpen ? 'open' : ''}`}
                  onClick={() => {
                    setOpenCategories((current) =>
                      current.includes(category.id) ? current.filter((id) => id !== category.id) : [...current, category.id]
                    );
                  }}
                >
                  <span className="group-title-copy">
                    <CategoryIcon size={15} />
                    <span>{categoryLabels[category.id] ?? category.title}</span>
                  </span>
                  <small>{templates.length}</small>
                  <ChevronDown size={16} />
                </button>
                {isOpen && (
                  <div className="template-grid">
                    {templates.map((template) => (
                      <PageTemplateCard
                        key={template.id}
                        template={template}
                        previewSettings={previewSettings}
                        onAdd={() => onAddPage(template.id)}
                        onPreview={() => openPreview(template)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {userTemplates.length > 0 && (
        <section className="preset-library-control user-template-library">
          <button
            type="button"
            className={`group-title ${userTemplatesOpen && !presetsOpen ? 'open' : ''}`}
            onClick={() => {
              if (presetsOpen) return;
              setUserTemplatesOpen((current) => !current);
            }}
          >
            <span className="group-title-copy">
              <Star size={15} />
              <span>Ваши шаблоны</span>
            </span>
            <small>{userTemplates.length}</small>
            <ChevronDown size={16} />
          </button>
          {userTemplatesOpen && !presetsOpen && (
            <div className="user-template-list">
              {userTemplates.map((template) => (
                <div className="user-template-row" key={template.id}>
                  <button type="button" className="user-template-open" onClick={() => onApplyUserTemplate?.(template.id)}>
                    <Star size={14} />
                    <span>{template.title}</span>
                    <small>{template.pageCount}</small>
                  </button>
                  <button
                    type="button"
                    className="user-template-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteUserTemplate?.(template.id);
                    }}
                    title="Удалить шаблон"
                    aria-label="Удалить шаблон"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {previewTemplate && (
        <div className="modal-backdrop template-preview-modal-backdrop" onClick={() => setPreviewTemplate(null)}>
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
              <div className="template-preview-orientation top-control fixed-control orientation-control" aria-label="Ориентация предпросмотра">
                <span>Ориентация</span>
                <div className="accent-row accent-panel format-dot-panel">
                  <button
                    type="button"
                    className={`format-dot ${renderSettings.pageFormat === 'a4_portrait' ? 'active' : ''}`}
                    onClick={() => onApplyPageFormat('a4_portrait')}
                    title="Вертикально"
                    aria-label="Вертикально"
                  >
                    <RectangleVertical size={18} />
                  </button>
                  <button
                    type="button"
                    className={`format-dot ${renderSettings.pageFormat === 'a4_landscape' ? 'active' : ''}`}
                    onClick={() => onApplyPageFormat('a4_landscape')}
                    title="Горизонтально"
                    aria-label="Горизонтально"
                  >
                    <RectangleHorizontal size={18} />
                  </button>
                </div>
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
              <div className="template-preview-vote" aria-label="Голосование">
                <span>Голосование</span>
                <button
                  className={previewVote.userVote === 'up' ? 'active' : ''}
                  title="Нравится"
                  aria-label="Нравится"
                  onClick={() => voteForTemplate(previewTemplate.id, 'up')}
                >
                  <ThumbsUp size={16} />
                  <small>{previewVote.up}</small>
                </button>
                <button
                  className={previewVote.userVote === 'down' ? 'active' : ''}
                  title="Не нравится"
                  aria-label="Не нравится"
                  onClick={() => voteForTemplate(previewTemplate.id, 'down')}
                >
                  <ThumbsDown size={16} />
                  <small>{previewVote.down}</small>
                </button>
              </div>
              <button className="btn btn-primary btn-export-soft" onClick={addPreviewTemplate}>
                <Plus size={16} />
                Добавить страницу
              </button>
            </footer>
          </section>
        </div>
      )}
    </aside>
  );
}
