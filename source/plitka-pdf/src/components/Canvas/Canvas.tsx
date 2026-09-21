import { BadgePercent, BookOpen, FileText, Grid2X2, Layers, Maximize2, Pencil, Quote, RectangleHorizontal, RotateCcw, Save, Star, Trees, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { visiblePresetSummaries } from '../../data/createProject';
import {
  DocumentRenderSettings,
  EditableZone,
  Page,
  PresetId,
  SavedTemplateMeta
} from '../../types/project';
import { createId } from '../../utils/clone';
import { PdfPageRenderer } from '../PdfPageRenderer/PdfPageRenderer';

type CanvasProps = {
  page?: Page;
  renderSettings: DocumentRenderSettings;
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string | null) => void;
  onImageDrop?: (zoneId: string, file: File) => void;
  onCreateFromPreset?: (preset: PresetId) => void;
  userTemplates?: SavedTemplateMeta[];
  onCreateFromUserTemplate?: (templateId: string) => void;
  onCommitPageLayout?: (page: Page) => void;
};

const zoomSteps = [35, 50, 60, 75, 90, 100, 115, 130, 150, 175, 200];

const emptyPresetIcons: Record<PresetId, JSX.Element> = {
  mini_catalog: <BookOpen size={18} />,
  commercial_offer: <FileText size={18} />,
  price_list: <BadgePercent size={18} />,
  selection: <Star size={18} />,
  technical_package: <Grid2X2 size={18} />,
  moodboard_presentation: <Star size={18} />,
  premium_catalog: <BookOpen size={18} />,
  outdoor_collection: <Trees size={18} />,
  slab_catalog: <Layers size={18} />,
  wood_catalog: <RectangleHorizontal size={18} />,
  editorial_catalog: <Quote size={18} />,
  dealer_presentation: <Grid2X2 size={18} />,
  client_offer: <FileText size={18} />,
  empty: <BookOpen size={18} />
};

function getInitialZoom() {
  if (typeof window === 'undefined') return 100;
  if (window.innerHeight < 820 || window.innerWidth < 1450) return 75;
  if (window.innerWidth < 1700) return 90;
  return 100;
}

export function Canvas({
  page,
  renderSettings,
  selectedZoneId,
  onSelectZone,
  onImageDrop,
  onCreateFromPreset,
  userTemplates = [],
  onCreateFromUserTemplate,
  onCommitPageLayout
}: CanvasProps) {
  const [zoom, setZoom] = useState(getInitialZoom);
  const [fullscreen, setFullscreen] = useState(false);
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [draftPage, setDraftPage] = useState<Page | undefined>(page);
  const [layoutBaseline, setLayoutBaseline] = useState<Page | null>(null);

  useEffect(() => {
    if (!layoutEditMode) setDraftPage(page);
  }, [page, layoutEditMode]);

  function startLayoutEditing() {
    if (!page) return;
    const snapshot = structuredClone(page);
    setLayoutBaseline(snapshot);
    setDraftPage(structuredClone(page));
    setLayoutEditMode(true);
  }

  function saveLayout() {
    if (!draftPage) return;
    onCommitPageLayout?.(draftPage);
    setLayoutEditMode(false);
  }

  function restoreLayout() {
    if (!layoutBaseline) return;
    const restored = structuredClone(layoutBaseline);
    setDraftPage(restored);
    onCommitPageLayout?.(restored);
    setLayoutEditMode(false);
    setLayoutBaseline(null);
  }
function addWidget(
  widgetType: string,
  clientX: number,
  clientY: number
) {
  if (!draftPage) return;

  const pageElement = document.querySelector('.canvas-stage .pdf-page');

  if (!(pageElement instanceof HTMLElement)) return;

  const rect = pageElement.getBoundingClientRect();

  const GRID_SIZE = 20;

  const scaleX = rect.width / pageElement.offsetWidth;
  const scaleY = rect.height / pageElement.offsetHeight;

  const gridX = GRID_SIZE * scaleX;
  const gridY = GRID_SIZE * scaleY;

  const snapX = Math.round((clientX - rect.left) / gridX) * gridX;
  const snapY = Math.round((clientY - rect.top) / gridY) * gridY;

  const x = Math.max(
    0,
    Math.min(100, (snapX / rect.width) * 100)
  );

  const y = Math.max(
    0,
    Math.min(100, (snapY / rect.height) * 100)
  );

  const id = createId('zone');

  let zone: EditableZone;

  switch (widgetType) {
    case 'text':
      zone = {
        id,
        label: 'Текст',
        kind: 'text',
        value: 'Введите текст',
        size: 'body',
        align: 'left',
        layout: {
          x,
          y,
          w: 30,
          h: 8
        }
      };
      break;

    case 'heading':
      zone = {
        id,
        label: 'Заголовок',
        kind: 'text',
        value: 'Заголовок',
        size: 'h1',
        align: 'left',
        layout: {
          x,
          y,
          w: 40,
          h: 10
        }
      };
      break;

    case 'subheading':
      zone = {
        id,
        label: 'Подзаголовок',
        kind: 'text',
        value: 'Подзаголовок',
        size: 'h2',
        align: 'left',
        layout: {
          x,
          y,
          w: 35,
          h: 8
        }
      };
      break;

    case 'divider':
      zone = {
        id,
        label: 'Разделитель',
        kind: 'divider',
        layout: {
          x,
          y,
          w: 40,
          h: 2
        }
      };
      break;

    case 'panel':
      zone = {
        id,
        label: 'Блок',
        kind: 'panel',
        layout: {
          x,
          y,
          w: 40,
          h: 20
        }
      };
      break;

    case 'image':
      zone = {
        id,
        label: 'Изображение',
        kind: 'image',
        src: '',
        alt: 'Изображение',
        imageRole: 'decorative',
        fit: 'contain',
        layout: {
          x,
          y,
          w: 35,
          h: 25
        }
      };
      break;

    case 'table':
      zone = {
        id,
        label: 'Таблица',
        kind: 'table',
        columns: [
          {
            id: 'name',
            label: 'Название',
            type: 'text'
          },
          {
            id: 'value',
            label: 'Значение',
            type: 'text'
          }
        ],
        rows: [
          {
            name: 'Параметр',
            value: 'Значение'
          },
          {
            name: 'Параметр',
            value: 'Значение'
          }
        ],
        layout: {
          x,
          y,
          w: 50,
          h: 20
        }
      };
      break;

    case 'features':
      zone = {
        id,
        label: 'Характеристики',
        kind: 'features',
        items: [
          'Характеристика 1',
          'Характеристика 2',
          'Характеристика 3'
        ],
        layout: {
          x,
          y,
          w: 40,
          h: 20
        }
      };
      break;

    default:
      return;
  }

  setDraftPage((current) => {
    if (!current) return current;

    return {
      ...current,
      zones: {
        ...current.zones,
        [zone.id]: zone
      }
    };
  });

  onSelectZone(zone.id);
}
  const renderedPage = layoutEditMode ? draftPage : page;
function handleCanvasDrop(event: React.DragEvent) {
  event.preventDefault();

  if (!layoutEditMode) return;

  const widgetType = event.dataTransfer.getData(
    'application/x-pdf-widget'
  );

  if (!widgetType) return;

  addWidget(
    widgetType,
    event.clientX,
    event.clientY
  );
}
function handleCanvasDragOver(event: React.DragEvent) {
  if (!layoutEditMode) return;

  if (event.dataTransfer.types.includes('application/x-pdf-widget')) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }
}
  function changeZoom(direction: -1 | 1) {
    const index = zoomSteps.findIndex((item) => item === zoom);
    const nextIndex = Math.min(Math.max(index + direction, 0), zoomSteps.length - 1);
    setZoom(zoomSteps[nextIndex]);
  }
const widgetPanel = layoutEditMode ? (
  <aside className="widget-panel">
    <div className="widget-panel-title">
      Виджеты
    </div>

    {[
      {
        type: 'text',
        icon: <FileText size={18} />,
        title: 'Текст',
        description: 'Текстовый блок'
      },
      {
        type: 'heading',
        icon: <FileText size={18} />,
        title: 'Заголовок',
        description: 'Крупный заголовок'
      },
      {
        type: 'subheading',
        icon: <FileText size={18} />,
        title: 'Подзаголовок',
        description: 'Подзаголовок страницы'
      },
      {
        type: 'image',
        icon: <Grid2X2 size={18} />,
        title: 'Изображение',
        description: 'Область для изображения'
      },
      {
        type: 'divider',
        icon: <Grid2X2 size={18} />,
        title: 'Разделитель',
        description: 'Горизонтальная линия'
      },
      {
        type: 'panel',
        icon: <Grid2X2 size={18} />,
        title: 'Блок',
        description: 'Фоновая область'
      },
      {
        type: 'table',
        icon: <Grid2X2 size={18} />,
        title: 'Таблица',
        description: 'Таблица данных'
      },
      {
        type: 'features',
        icon: <Star size={18} />,
        title: 'Характеристики',
        description: 'Список характеристик'
      }
    ].map((widget) => (
      <button
        key={widget.type}
        type="button"
        className="widget-item"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(
            'application/x-pdf-widget',
            widget.type
          );

          event.dataTransfer.effectAllowed = 'copy';
        }}
      >
        {widget.icon}

        <span>
          <strong>{widget.title}</strong>
          <small>{widget.description}</small>
        </span>
      </button>
    ))}
  </aside>
) : null;
  const pageView = renderedPage ? (
    <div className="page-zoom-shell" style={{ transform: `scale(${zoom / 100})` }}>
      <PdfPageRenderer
        page={renderedPage}
        renderSettings={renderSettings}
        selectedZoneId={selectedZoneId}
        editorMode
        isLastPage={false}
        onSelectZone={onSelectZone}
        onImageDrop={onImageDrop}
        layoutEditMode={layoutEditMode}
        onZoneLayoutChange={(zoneId, layout) => setDraftPage((current) => current ? ({
          ...current,
          zones: { ...current.zones, [zoneId]: { ...current.zones[zoneId], layout } }
        }) : current)}

        onZoneChange={(zoneId, zone) => {
  setDraftPage((current) => {
    if (!current) return current;

    return {
      ...current,
      zones: {
        ...current.zones,
        [zoneId]: zone
      }
    };
  });
}}

onZoneDelete={(zoneId) => {
  setDraftPage((current) => {
    if (!current) return current;

    const zones = { ...current.zones };
    delete zones[zoneId];

    return {
      ...current,
      zones
    };
  });

  onSelectZone(null);
}}
      />
    </div>
  ) : (
    <div className="empty-canvas">
      <strong>Добавьте страницу из библиотеки</strong>
      <span>или используйте готовый сценарий документа</span>
      <div className="empty-template-actions">
        {visiblePresetSummaries.map((item) => (
          <button key={item.id} type="button" onClick={() => onCreateFromPreset?.(item.id)}>
            {emptyPresetIcons[item.id]}
            <span className="empty-template-copy">
              <strong>{item.label}</strong>
              <small>{item.pageCount} стр. · {item.audience}</small>
            </span>
          </button>
        ))}
      </div>
      {userTemplates.length > 0 && (
        <div className="empty-user-templates">
          <span>Ваши шаблоны</span>
          <div className="empty-template-actions user-template-actions">
            {userTemplates.slice(0, 6).map((template) => (
              <button key={template.id} type="button" onClick={() => onCreateFromUserTemplate?.(template.id)}>
                <Star size={18} />
                <span>{template.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <section className="canvas-wrap">
      {widgetPanel}
      <div className="canvas-toolbar">
        <div className="layout-toolbar-actions">
          <button
            className={`btn ${layoutEditMode ? 'btn-ghost active' : 'btn-primary'}`}
            onClick={startLayoutEditing}
            disabled={!page || layoutEditMode}
            title="Открыть инструменты для добавления и редактирования блоков страницы"
          >
            <Pencil size={16} />
            {layoutEditMode ? 'Редактор открыт' : 'Открыть редактор'}
          </button>
          <button className={`btn ${layoutEditMode ? 'btn-primary' : 'btn-ghost'}`} onClick={saveLayout} disabled={!layoutEditMode}><Save size={16} />Сохранить</button>
          <button className="btn btn-ghost" onClick={restoreLayout} disabled={!layoutBaseline}><RotateCcw size={16} />Вернуть</button>
        </div>
        <span>{zoom}%</span>
        <button className="tool" title="Уменьшить" onClick={() => changeZoom(-1)} disabled={zoom === zoomSteps[0]}>
          <ZoomOut size={17} />
        </button>
        <button className="tool" title="Увеличить" onClick={() => changeZoom(1)} disabled={zoom === zoomSteps[zoomSteps.length - 1]}>
          <ZoomIn size={17} />
        </button>
        <button className="tool" title="Полноэкранный просмотр" onClick={() => setFullscreen(true)}>
          <Maximize2 size={17} />
        </button>
      </div>
      <div
  className={`canvas-stage ${layoutEditMode ? 'layout-grid-active' : ''}`}
  onClick={() => onSelectZone(null)}
  onDragOver={handleCanvasDragOver}
  onDrop={handleCanvasDrop}
>
  {pageView}
</div>

      {fullscreen && page && (
        <div className="fullscreen-page-view" onClick={() => setFullscreen(false)}>
          <button className="btn btn-ghost" onClick={() => setFullscreen(false)}>Закрыть просмотр</button>
          <PdfPageRenderer
            page={page}
            renderSettings={renderSettings}
            isLastPage={false}
          />
        </div>
      )}
    </section>
  );
}
