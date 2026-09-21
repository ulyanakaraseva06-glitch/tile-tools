import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Info, Star, X } from 'lucide-react';
import { track } from '../../analytics/analyticsClient';
import { projectAnalyticsProperties } from '../../analytics/projectAnalytics';
import { DocumentRenderSettings, Project } from '../../types/project';
import { exportElementsToPdf } from '../../utils/pdfExport';
import { PdfPageRenderer } from '../PdfPageRenderer/PdfPageRenderer';

type ExportCheckModalProps = {
  project: Project;
  onClose: () => void;
  onSaveAsTemplate?: () => void;
};

function isLogoPlaceholder(zoneId: string, label: string) {
  const marker = `${zoneId} ${label}`.toLowerCase();
  return marker.includes('logo') || marker.includes('логотип');
}

function buildWarnings(project: Project) {
  const warnings: string[] = [];
  const missingLogoPages = new Set<number>();

  project.pages.forEach((page, index) => {
    Object.values(page.zones).forEach((zone) => {
      if (zone.visible === false) return;

      if (zone.kind === 'text' && !zone.value.trim()) {
        warnings.push(`На странице ${index + 1} пустой текстовый блок: ${zone.label}`);
        return;
      }

      if (zone.kind === 'image' && !zone.src) {
        if (isLogoPlaceholder(zone.id, zone.label)) {
          if (project.showLogos !== false) {
            missingLogoPages.add(index + 1);
          }
          return;
        }

        warnings.push(`На странице ${index + 1} не выбрано изображение: ${zone.label}`);
        return;
      }

      if (zone.kind === 'table' && zone.rows.length === 0) {
        warnings.push(`На странице ${index + 1} таблица без строк: ${zone.label}`);
      }
    });
  });

  if (missingLogoPages.size) {
    warnings.unshift(`Логотип включен, но не загружен для страниц: ${Array.from(missingLogoPages).join(', ')}.`);
  }

  return warnings;
}

export function ExportCheckModal({ project, onClose, onSaveAsTemplate }: ExportCheckModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const warnings = useMemo(() => buildWarnings(project), [project]);
  const renderSettings = useMemo<DocumentRenderSettings>(() => ({
    pageFormat: project.pageFormat,
    documentTheme: project.documentTheme,
    documentAccent: project.documentAccent,
    documentAccentColor: project.documentAccentColor,
    documentBackgroundColor: project.documentBackgroundColor,
    documentTextPalette: project.documentTextPalette,
    documentTextPrimaryColor: project.documentTextPrimaryColor,
    documentTextSecondaryColor: project.documentTextSecondaryColor,
    documentDividerColor: project.documentDividerColor,
    showLogos: project.showLogos,
    showPageNumbers: project.showPageNumbers,
    showDividers: project.showDividers
  }), [project]);

  useEffect(() => {
    track('pdf_check_opened', projectAnalyticsProperties(project));
  }, [project]);

  useEffect(() => {
    if (!warnings.length) return;
    track('pdf_check_warning_shown', {
      ...projectAnalyticsProperties(project),
      warningCount: warnings.length
    });
  }, [project, warnings.length]);

  async function downloadPdf() {
    setIsExporting(true);
    setExportError('');
    const startedAt = Date.now();
    track('pdf_export_started', projectAnalyticsProperties(project));

    try {
      const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-export-page="true"]'));
      await exportElementsToPdf(elements, `${project.title || 'plitka-pdf'}.pdf`, project.pageFormat);
      track('pdf_export_success', {
        ...projectAnalyticsProperties(project),
        durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000))
      });
      onClose();
    } catch (error) {
      track('pdf_export_failed', {
        ...projectAnalyticsProperties(project),
        errorMessage: error instanceof Error ? error.message : 'pdf_export_failed'
      });
      track('error_pdf_export', {
        ...projectAnalyticsProperties(project),
        errorMessage: error instanceof Error ? error.message : 'pdf_export_failed'
      });
      setExportError(error instanceof Error ? error.message : 'Не удалось подготовить PDF.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => !isExporting && onClose()}>
      <section className="export-modal" onClick={(event) => event.stopPropagation()}>
        <button className="close-btn" onClick={onClose} title="Закрыть" aria-label="Закрыть">
          <X size={22} />
        </button>
        <div className="modal-title export-title-row">
          <div>
            <h2>Проверка документа</h2>
            <p>Проверьте страницы документа перед скачиванием PDF.</p>
          </div>
          <div className="export-title-actions">
            {onSaveAsTemplate && (
              <button className="btn btn-ghost" type="button" onClick={onSaveAsTemplate} disabled={isExporting}>
                <Star size={17} />
                Сохранить как шаблон
              </button>
            )}
            <button className="btn btn-export-soft" onClick={downloadPdf} disabled={isExporting}>
              <Download size={18} />
              {isExporting ? 'Готовим PDF...' : 'Скачать PDF'}
            </button>
          </div>
        </div>

        <div className="export-grid">
          <div>
            <h3>Страницы документа</h3>
            <div className="check-list">
              {project.pages.map((page, index) => (
                <div className="check-page" key={page.id}>
                  <div className="check-thumb">
                    <PdfPageRenderer
                      page={page}
                      renderSettings={renderSettings}
                    />
                  </div>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{page.title}</strong>
                    <small>{index === 0 ? 'Титульная страница' : index === project.pages.length - 1 ? 'Последняя страница' : 'Внутренняя страница'}</small>
                  </div>
                  <CheckCircle2 className="ok-icon" size={21} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>Предупреждения</h3>
            <div className="warnings">
              {warnings.length ? warnings.map((warning) => (
                <div className="warning" key={warning}>
                  <AlertTriangle size={23} />
                  <span>{warning}</span>
                </div>
              )) : (
                <div className="success-warning">
                  <CheckCircle2 size={24} />
                  Критичных предупреждений нет
                </div>
              )}
              <div className="info-box pdf-signature-note">
                <Info size={22} />
                Подпись plitka-pdf.ru будет добавлена на последнюю страницу.
              </div>
              {exportError && (
                <div className="export-error">
                  <AlertTriangle size={22} />
                  <span>{exportError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Назад к редактированию</button>
        </div>

        <div className="hidden-export-pages">
          {project.pages.map((page, index) => (
            <PdfPageRenderer
              key={page.id}
              page={page}
              renderSettings={renderSettings}
              isLastPage={index === project.pages.length - 1}
              exportMode
            />
          ))}
        </div>
      </section>
    </div>
  );
}
