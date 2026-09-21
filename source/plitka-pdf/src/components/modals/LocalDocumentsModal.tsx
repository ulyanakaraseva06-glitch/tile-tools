import { useEffect, useState } from 'react';
import { Copy, Download, FileText, ImageUp, Settings, Share2, Star, Trash2, UserRound, X } from 'lucide-react';
import { track } from '../../analytics/analyticsClient';
import { getPresetLabel, presetLabels } from '../../data/createProject';
import { documentSchemes } from '../../data/documentSchemes';
import { getNextVilrayPromoVariant, type VilrayPromoId } from '../../data/vilrayPromos';
import { Project, SavedProjectMeta, SavedTemplateMeta, ServiceSettings, ThemeMode } from '../../types/project';
import { compressImage } from '../../utils/images';

type LocalDocumentsModalProps = {
  currentProject: Project;
  savedProjects: SavedProjectMeta[];
  userTemplates: SavedTemplateMeta[];
  settings: ServiceSettings;
  onClose: () => void;
  onSettingsChange: (settings: ServiceSettings) => void;
  onApplyContacts: (profile?: ServiceSettings['companyProfile']) => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onOpenTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onExportTemplate: (id: string) => void;
  onShareTemplate: (id: string) => void;
  onOpenVilrayMaterials: (variantId: VilrayPromoId) => void;
};

type CabinetTab = 'saved' | 'templates' | 'service' | 'contacts';

const cabinetTabs: { id: CabinetTab; label: string }[] = [
  { id: 'saved', label: 'Сохраненные проекты' },
  { id: 'templates', label: 'Ваши шаблоны' },
  { id: 'service', label: 'Настройка сервиса' },
  { id: 'contacts', label: 'Локальный профиль' }
];

export function LocalDocumentsModal(props: LocalDocumentsModalProps) {
  const {
    currentProject,
    savedProjects,
    userTemplates,
    settings,
    onClose,
    onSettingsChange,
    onApplyContacts,
    onOpenProject,
    onDeleteProject,
    onDuplicateProject,
    onOpenTemplate,
    onDeleteTemplate,
    onExportTemplate,
    onShareTemplate,
    onOpenVilrayMaterials
  } = props;

  const [logoError, setLogoError] = useState('');
  const [activeTab, setActiveTab] = useState<CabinetTab>('saved');
  const [cabinetPromo] = useState(() => getNextVilrayPromoVariant());

  useEffect(() => {
    track('vilray_cta_viewed', { placement: 'cabinet_promo', variantId: cabinetPromo.id });
  }, [cabinetPromo.id]);

  function updateProfile(field: keyof ServiceSettings['companyProfile'], value: string) {
    onSettingsChange({
      ...settings,
      companyProfile: { ...settings.companyProfile, [field]: value }
    });
  }

  function updateTheme(interfaceTheme: ThemeMode) {
    onSettingsChange({ ...settings, interfaceTheme });
  }

  function updateDefaultScheme(defaultDocumentScheme: string) {
    onSettingsChange({ ...settings, defaultDocumentScheme });
  }

  async function uploadLogo(file?: File) {
    if (!file) return;
    try {
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const logoSrc = await compressImage(file, {
        maxSide: 900,
        maxBytes: 8 * 1024 * 1024,
        quality: 0.88,
        outputType
      });
      updateProfile('logoSrc', logoSrc);
      setLogoError('');
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'Не удалось загрузить логотип.');
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <section className="library-modal cabinet-modal" onClick={(event) => event.stopPropagation()}>
        <button className="close-btn" onClick={onClose} title="Закрыть" aria-label="Закрыть">
          <X size={22} />
        </button>

        <header className="cabinet-header">
          <div>
            <span>Рабочее пространство</span>
            <h2>Личный кабинет</h2>
          </div>
          <nav className="cabinet-tabs" aria-label="Разделы личного кабинета">
            {cabinetTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="cabinet-tab-panel">
          {activeTab === 'saved' && (
            <section className="cabinet-card saved-projects-panel">
              <div className="cabinet-current-project-inline">
                <span>Текущий документ</span>
                <strong>{currentProject.title}</strong>
              </div>
              <div className="cabinet-card-title">
                <FileText size={20} />
                <div>
                  <strong>Сохраненные проекты</strong>
                  <span>{savedProjects.length ? `${savedProjects.length} в списке` : 'Пока пусто'}</span>
                </div>
              </div>
              <div className="saved-project-list">
                {savedProjects.length ? savedProjects.map((item) => (
                  <article className="saved-project-card" key={item.id}>
                    <FileText size={24} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>{presetLabels[item.preset] ?? getPresetLabel(item.preset)} · {item.pageCount} стр. · {new Date(item.updatedAt).toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="saved-project-actions">
                      <button onClick={() => onOpenProject(item.id)}>Открыть</button>
                      <button onClick={() => onDuplicateProject(item.id)} title="Дублировать" aria-label="Дублировать">
                        <Copy size={15} />
                      </button>
                      <button onClick={() => onDeleteProject(item.id)} title="Удалить" aria-label="Удалить">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                )) : (
                  <div className="empty-saved-list">Сохраняйте документы из верхней панели, и они появятся здесь.</div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'templates' && (
            <section className="cabinet-card saved-projects-panel">
              <div className="cabinet-card-title">
                <Star size={20} />
                <div>
                  <strong>Ваши шаблоны</strong>
                  <span>{userTemplates.length ? `${userTemplates.length} в списке` : 'Пока пусто'}</span>
                </div>
              </div>
              <div className="saved-project-list template-management-list">
                {userTemplates.length ? userTemplates.map((item) => (
                  <article className="saved-project-card" key={item.id}>
                    <Star size={24} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.pageCount} стр. · {new Date(item.updatedAt).toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="saved-project-actions template-management-actions">
                      <button onClick={() => onOpenTemplate(item.id)}>Открыть</button>
                      <button onClick={() => onExportTemplate(item.id)} title="Выгрузить JSON" aria-label="Выгрузить JSON">
                        <Download size={15} />
                      </button>
                      <button onClick={() => onShareTemplate(item.id)} title="Поделиться" aria-label="Поделиться">
                        <Share2 size={15} />
                      </button>
                      <button onClick={() => onDeleteTemplate(item.id)} title="Удалить" aria-label="Удалить">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                )) : (
                  <div className="empty-saved-list">Сохраняйте текущий документ как шаблон, чтобы он появился здесь.</div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'service' && (
            <section className="cabinet-card">
              <div className="cabinet-card-title">
                <Settings size={20} />
                <div>
                  <strong>Настройки сервиса</strong>
                  <span>Вид интерфейса и базовая дизайн-схема</span>
                </div>
              </div>
              <label className="field">
                <span>Тема интерфейса</span>
                <select value={settings.interfaceTheme} onChange={(event) => updateTheme(event.target.value as ThemeMode)}>
                  <option value="light">Светлая</option>
                  <option value="dark">Темная</option>
                  <option value="beige">Бежевая</option>
                </select>
              </label>
              <label className="field">
                <span>Дизайн-схема по умолчанию</span>
                <select value={settings.defaultDocumentScheme ?? 'classic'} onChange={(event) => updateDefaultScheme(event.target.value)}>
                  {documentSchemes.map((scheme) => (
                    <option key={scheme.id} value={scheme.id}>{scheme.label}</option>
                  ))}
                </select>
              </label>
            </section>
          )}

          {activeTab === 'contacts' && (
            <section className="cabinet-card contacts-panel">
              <div className="cabinet-card-title">
                <UserRound size={20} />
                <div>
                  <strong>Локальный профиль</strong>
                  <span>Данные хранятся только в этом браузере и подставляются в страницы с контактами</span>
                </div>
              </div>
              <label className="logo-upload">
                <span>{settings.companyProfile.logoSrc ? <img src={settings.companyProfile.logoSrc} alt="" /> : <ImageUp size={18} />}</span>
                <strong>{settings.companyProfile.logoSrc ? 'Заменить логотип' : 'Добавить логотип'}</strong>
                <input type="file" accept="image/*" onChange={(event) => uploadLogo(event.target.files?.[0])} />
              </label>
              {logoError && <div className="editor-warning">{logoError}</div>}
              <div className="cabinet-fields-grid">
                <label className="field compact"><span>Компания</span><input value={settings.companyProfile.companyName} onChange={(event) => updateProfile('companyName', event.target.value)} /></label>
                <label className="field compact"><span>Менеджер</span><input value={settings.companyProfile.managerName} onChange={(event) => updateProfile('managerName', event.target.value)} /></label>
                <label className="field compact"><span>Телефон</span><input value={settings.companyProfile.phone} onChange={(event) => updateProfile('phone', event.target.value)} /></label>
                <label className="field compact"><span>Мессенджер</span><input value={settings.companyProfile.messenger} onChange={(event) => updateProfile('messenger', event.target.value)} /></label>
                <label className="field compact"><span>Email</span><input value={settings.companyProfile.email} onChange={(event) => updateProfile('email', event.target.value)} /></label>
                <label className="field compact"><span>Сайт</span><input value={settings.companyProfile.website} onChange={(event) => updateProfile('website', event.target.value)} /></label>
                <label className="field compact wide"><span>Адрес</span><input value={settings.companyProfile.address} onChange={(event) => updateProfile('address', event.target.value)} /></label>
              </div>
              <button className="btn btn-export-soft full" onClick={() => onApplyContacts(settings.companyProfile)}>
                Подставить в документ
              </button>
              <p className="cabinet-note">
                Юридические документы: <a href="/terms/">условия сервиса</a> и <a href="/privacy/">политика конфиденциальности</a>.
              </p>
            </section>
          )}
        </div>

        <section className={`vilray-promo cabinet-promo-wide vilray-promo-${cabinetPromo.accent}`}>
          <div>
            <span>{cabinetPromo.eyebrow}</span>
            <strong>{cabinetPromo.title}</strong>
            <p>{cabinetPromo.description}</p>
          </div>
          <button className="btn btn-export-soft" type="button" onClick={() => onOpenVilrayMaterials(cabinetPromo.id)}>
            {cabinetPromo.buttonLabel}
          </button>
        </section>
      </section>
    </div>
  );
}
