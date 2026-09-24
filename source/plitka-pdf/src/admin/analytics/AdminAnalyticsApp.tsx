import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Database,
  Download,
  FileText,
  LayoutTemplate,
  LockKeyhole,
  RefreshCw
} from 'lucide-react';
import { resolvePublicAssetUrl } from '../../utils/publicAsset';

type SectionId = 'overview' | 'funnel' | 'documents' | 'templates' | 'errors' | 'events';

type DailyPoint = {
  date: string;
  visitors: number | string;
  sessions: number | string;
  pdfExports: number | string;
  errors: number | string;
};

type DocumentTypeItem = {
  documentType: string;
  createdCount: number | string;
  exportedCount: number | string;
  avgPageCount: number | string | null;
  avgImageCount: number | string | null;
};

type SummaryResponse = {
  ok: boolean;
  visitors: number | string;
  sessions: number | string;
  landingViews: number | string;
  editorOpens: number | string;
  documentsCreated: number | string;
  pdfExports: number | string;
  vilrayCtaClicks: number | string;
  vilrayRequests: number | string;
  errors: number | string;
  conversionLandingToEditor: number;
  conversionEditorToExport: number;
  daily: DailyPoint[];
  documentTypes: DocumentTypeItem[];
};

type FunnelStep = {
  name: string;
  count: number;
  conversionFromPrevious: number;
  dropFromPrevious: number;
};

type FunnelResponse = {
  ok: boolean;
  steps: FunnelStep[];
};

type TemplateItem = {
  templateId: string | null;
  category: string | null;
  addedCount: number | string;
  exportedCount: number | string;
};

type TemplatesResponse = {
  ok: boolean;
  items: TemplateItem[];
};

type RawEvent = {
  eventId: string;
  eventName: string;
  timestamp: string;
  anonymousId: string;
  sessionId: string;
  projectId?: string | null;
  documentId?: string | null;
  properties: Record<string, unknown>;
};

type EventsResponse = {
  ok: boolean;
  items: RawEvent[];
};

type DashboardData = {
  summary: SummaryResponse;
  funnel: FunnelResponse;
  templates: TemplatesResponse;
  events: EventsResponse;
};

const TOKEN_KEY = 'analytics_admin_token';

const sections: { id: SectionId; label: string; icon: JSX.Element }[] = [
  { id: 'overview', label: 'Обзор', icon: <Activity size={18} /> },
  { id: 'funnel', label: 'Воронка', icon: <BarChart3 size={18} /> },
  { id: 'documents', label: 'Документы', icon: <FileText size={18} /> },
  { id: 'templates', label: 'Шаблоны', icon: <LayoutTemplate size={18} /> },
  { id: 'errors', label: 'Ошибки', icon: <AlertTriangle size={18} /> },
  { id: 'events', label: 'События', icon: <Database size={18} /> }
];

const eventLabels: Record<string, string> = {
  landing_view: 'Лендинг открыт',
  landing_cta_open_app_click: 'Переход в сервис',
  editor_open: 'Редактор открыт',
  document_created: 'Документ создан',
  zone_text_edited: 'Текст изменен',
  zone_image_uploaded: 'Изображение загружено',
  pdf_check_opened: 'Проверка PDF',
  pdf_export_success: 'PDF скачан'
};

function defaultDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat('ru-RU').format(toNumber(value));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ru-RU');
}

function shortId(value?: string | null) {
  if (!value) return '—';
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-5)}` : value;
}

async function adminFetch<T>(path: string, token: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  const response = await fetch(`${path}?${search.toString()}`, {
    headers: { 'X-Admin-Token': token },
    credentials: 'same-origin'
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Неверный admin token' : `Ошибка API ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <article className="analytics-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

function SectionTitle({ title, text }: { title: string; text?: string }) {
  return (
    <div className="analytics-section-title">
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

function Overview({ summary }: { summary: SummaryResponse }) {
  const daily = summary.daily ?? [];
  const maxDaily = Math.max(1, ...daily.map((item) => Math.max(toNumber(item.visitors), toNumber(item.pdfExports))));

  return (
    <>
      <section className="analytics-metric-grid">
        <MetricCard label="Посетители" value={formatNumber(summary.visitors)} />
        <MetricCard label="Сессии" value={formatNumber(summary.sessions)} />
        <MetricCard label="Открытия редактора" value={formatNumber(summary.editorOpens)} />
        <MetricCard label="Созданные документы" value={formatNumber(summary.documentsCreated)} />
        <MetricCard label="PDF-экспорты" value={formatNumber(summary.pdfExports)} note="главная метрика" />
        <MetricCard label="Лендинг -> редактор" value={formatPercent(summary.conversionLandingToEditor)} />
        <MetricCard label="Редактор -> PDF" value={formatPercent(summary.conversionEditorToExport)} />
        <MetricCard label="Клики Vilray" value={formatNumber(summary.vilrayCtaClicks)} />
      </section>

      <section className="analytics-panel">
        <SectionTitle title="Активность по дням" />
        <div className="analytics-daily-chart">
          {daily.length ? daily.map((item) => (
            <div className="analytics-daily-column" key={item.date}>
              <div className="analytics-daily-bars">
                <span className="visitors" style={{ height: `${Math.max(4, (toNumber(item.visitors) / maxDaily) * 100)}%` }} />
                <span className="exports" style={{ height: `${Math.max(4, (toNumber(item.pdfExports) / maxDaily) * 100)}%` }} />
              </div>
              <small>{item.date.slice(5)}</small>
            </div>
          )) : <div className="analytics-empty">Нет данных за выбранный период</div>}
        </div>
      </section>

      <section className="analytics-panel">
        <SectionTitle title="Быстрые выводы" />
        <div className="analytics-insight-list">
          <p>PDF-экспортов: <strong>{formatNumber(summary.pdfExports)}</strong>. Это ключевой показатель полезности сервиса.</p>
          <p>Ошибок за период: <strong>{formatNumber(summary.errors)}</strong>. Если число растет, сначала проверять PDF и загрузку изображений.</p>
          <p>Запросов в Vilray: <strong>{formatNumber(summary.vilrayRequests)}</strong>. Это отдельный коммерческий сигнал, не связанный с персональными данными.</p>
        </div>
      </section>
    </>
  );
}

function Funnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, ...steps.map((step) => step.count));
  return (
    <section className="analytics-panel">
      <SectionTitle title="Главная воронка" />
      <div className="analytics-funnel">
        {steps.map((step) => (
          <div className="analytics-funnel-row" key={step.name}>
            <div>
              <strong>{eventLabels[step.name] ?? step.name}</strong>
              <small>{step.name}</small>
            </div>
            <div className="analytics-funnel-bar">
              <span style={{ width: `${Math.max(3, (step.count / max) * 100)}%` }} />
            </div>
            <strong>{formatNumber(step.count)}</strong>
            <small>{formatPercent(step.conversionFromPrevious)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function Documents({ items }: { items: DocumentTypeItem[] }) {
  return (
    <section className="analytics-panel">
      <SectionTitle title="Документы" />
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Тип</th>
            <th>Создано</th>
            <th>PDF</th>
            <th>Сред. страниц</th>
            <th>Сред. изображений</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.documentType}>
              <td>{item.documentType}</td>
              <td>{formatNumber(item.createdCount)}</td>
              <td>{formatNumber(item.exportedCount)}</td>
              <td>{toNumber(item.avgPageCount).toFixed(1)}</td>
              <td>{toNumber(item.avgImageCount).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <div className="analytics-empty">Документы пока не создавались</div>}
    </section>
  );
}

function Templates({ items }: { items: TemplateItem[] }) {
  return (
    <section className="analytics-panel">
      <SectionTitle title="Шаблоны страниц" />
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Шаблон</th>
            <th>Категория</th>
            <th>Добавили</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.templateId}-${item.category}`}>
              <td>{item.templateId ?? 'unknown'}</td>
              <td>{item.category ?? 'unknown'}</td>
              <td>{formatNumber(item.addedCount)}</td>
              <td>{formatNumber(item.exportedCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <div className="analytics-empty">Нет событий по шаблонам</div>}
    </section>
  );
}

function EventsTable({ events }: { events: RawEvent[] }) {
  return (
    <section className="analytics-panel">
      <table className="analytics-table analytics-events-table">
        <thead>
          <tr>
            <th>Время</th>
            <th>Событие</th>
            <th>Посетитель</th>
            <th>Проект</th>
            <th>Properties</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.eventId}>
              <td>{formatDateTime(event.timestamp)}</td>
              <td>
                <strong>{event.eventName}</strong>
                <small>{shortId(event.sessionId)}</small>
              </td>
              <td>{shortId(event.anonymousId)}</td>
              <td>{shortId(event.projectId)}</td>
              <td><code>{JSON.stringify(event.properties)}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!events.length && <div className="analytics-empty">Нет событий</div>}
    </section>
  );
}

function TokenForm({ tokenDraft, setTokenDraft, onSubmit }: { tokenDraft: string; setTokenDraft: (value: string) => void; onSubmit: () => void }) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <main className="analytics-login" data-theme="light" data-accent="purple">
      <form onSubmit={submit}>
        <LockKeyhole size={28} />
        <h1>Аналитика Плитка PDF</h1>
        <label>
          <span>Admin token</span>
          <input value={tokenDraft} onChange={(event) => setTokenDraft(event.target.value)} type="password" autoFocus />
        </label>
        <button className="btn btn-primary" type="submit">Открыть дашборд</button>
      </form>
    </main>
  );
}

export function AdminAnalyticsApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '');
  const [tokenDraft, setTokenDraft] = useState(token);
  const [from, setFrom] = useState(() => defaultDate(-29));
  const [to, setTo] = useState(() => defaultDate(0));
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [eventFilter, setEventFilter] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const errorEvents = useMemo(
    () => data?.events.items.filter((event) => event.eventName.startsWith('error_') || event.eventName === 'pdf_export_failed') ?? [],
    [data]
  );

  async function loadDashboard(nextEventFilter = eventFilter) {
    if (!token) return;
    setLoading(true);
    setError('');
    const baseParams = { from, to };
    const eventParams = nextEventFilter.trim()
      ? { ...baseParams, eventName: nextEventFilter.trim() }
      : baseParams;

    try {
      const [summary, funnel, templates, events] = await Promise.all([
        adminFetch<SummaryResponse>('/api/admin/analytics/summary.php', token, baseParams),
        adminFetch<FunnelResponse>('/api/admin/analytics/funnel.php', token, baseParams),
        adminFetch<TemplatesResponse>('/api/admin/analytics/templates.php', token, baseParams),
        adminFetch<EventsResponse>('/api/admin/analytics/events.php', token, eventParams)
      ]);
      setData({ summary, funnel, templates, events });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить аналитику');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function saveToken() {
    const normalized = tokenDraft.trim();
    if (!normalized) return;
    sessionStorage.setItem(TOKEN_KEY, normalized);
    setToken(normalized);
  }

  function resetToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setTokenDraft('');
    setData(null);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plitka-pdf-analytics-${from}-${to}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!token) {
    return <TokenForm tokenDraft={tokenDraft} setTokenDraft={setTokenDraft} onSubmit={saveToken} />;
  }

  return (
    <div className="analytics-admin-shell" data-theme="light" data-accent="purple">
      <aside className="analytics-sidebar">
        <a className="analytics-brand" href="/app/">
          <img src={resolvePublicAssetUrl('/brand/logo.webp')} alt="" />
          <span>
            <strong>Плитка PDF</strong>
            <small>Аналитика</small>
          </span>
        </a>
        <nav>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? 'active' : ''}
              onClick={() => setActiveSection(section.id)}
            >
              {section.icon}
              <span>{section.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="analytics-main">
        <header className="analytics-topbar">
          <div>
            <span>Vilray Studio</span>
            <h1>Анонимная аналитика Плитка PDF</h1>
          </div>
          <label>
            <span>С</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            <span>По</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <button className="btn btn-ghost" type="button" onClick={() => void loadDashboard()} disabled={loading}>
            <RefreshCw size={17} />
            Обновить
          </button>
          <button className="btn btn-ghost" type="button" onClick={exportJson} disabled={!data}>
            <Download size={17} />
            JSON
          </button>
          <button className="btn btn-ghost" type="button" onClick={resetToken}>Выйти</button>
        </header>

        {error && (
          <div className="analytics-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading && <div className="analytics-loading">Загрузка данных...</div>}

        {data && (
          <div className="analytics-content">
            {activeSection === 'overview' && <Overview summary={data.summary} />}
            {activeSection === 'funnel' && <Funnel steps={data.funnel.steps} />}
            {activeSection === 'documents' && <Documents items={data.summary.documentTypes ?? []} />}
            {activeSection === 'templates' && <Templates items={data.templates.items} />}
            {activeSection === 'errors' && (
              <>
                <section className="analytics-metric-grid compact">
                  <MetricCard label="Ошибки" value={formatNumber(data.summary.errors)} />
                  <MetricCard label="PDF-экспорты" value={formatNumber(data.summary.pdfExports)} />
                  <MetricCard label="Конверсия редактор -> PDF" value={formatPercent(data.summary.conversionEditorToExport)} />
                </section>
                <EventsTable events={errorEvents} />
              </>
            )}
            {activeSection === 'events' && (
              <>
                <section className="analytics-panel analytics-events-filter">
                  <label>
                    <span>eventName</span>
                    <input value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} placeholder="pdf_export_success" />
                  </label>
                  <button className="btn btn-ghost" type="button" onClick={() => void loadDashboard(eventFilter)}>
                    Применить фильтр
                  </button>
                </section>
                <EventsTable events={data.events.items} />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
