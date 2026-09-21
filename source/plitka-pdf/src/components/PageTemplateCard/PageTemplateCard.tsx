import { Plus, Search } from 'lucide-react';
import { DocumentRenderSettings, Page } from '../../types/project';
import { PageTemplate } from '../../types/templates';
import { FitPagePreview } from '../FitPagePreview/FitPagePreview';

export type TemplatePreviewSettings = DocumentRenderSettings;

type PageTemplateCardProps = {
  template: PageTemplate;
  previewSettings: TemplatePreviewSettings;
  onAdd: () => void;
  onPreview: () => void;
};

const previewPageCache = new Map<string, Page>();

export function templatePreviewPage(template: PageTemplate): Page {
  const cached = previewPageCache.get(template.id);
  if (cached) return cached;

  const previewPage = {
    id: `preview-${template.id}`,
    templateId: template.id,
    title: template.title,
    order: 0,
    zones: template.defaultZones
  };

  previewPageCache.set(template.id, previewPage);
  return previewPage;
}

export function PageTemplateCard({ template, previewSettings, onAdd, onPreview }: PageTemplateCardProps) {
  const previewPage = templatePreviewPage(template);

  return (
    <article className="template-card">
      <div
        className="template-preview"
        role="button"
        tabIndex={0}
        onClick={onPreview}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onPreview();
        }}
        title="Открыть крупный просмотр"
      >
        <FitPagePreview page={previewPage} renderSettings={previewSettings} previewPageNumber />
      </div>
      <div className="template-card-title">
        <strong>{template.title}</strong>
      </div>
      <button className="icon-btn template-preview-btn" onClick={onPreview} title="Увеличить страницу" aria-label="Увеличить страницу">
        <Search size={16} />
      </button>
      <button className="icon-btn template-add-btn" onClick={onAdd} title="Добавить страницу" aria-label="Добавить страницу">
        <Plus size={16} />
      </button>
    </article>
  );
}
