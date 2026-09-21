import { useEffect, useMemo, useRef, useState } from 'react';
import { ResizableWorkspace } from '../components/ResizableWorkspace/ResizableWorkspace';
import { ArrowLeft, ArrowRight, Download, Plus, Save, Star, UserRound } from 'lucide-react';
import { track } from '../analytics/analyticsClient';
import { projectAnalyticsProperties, zoneAnalyticsProperties } from '../analytics/projectAnalytics';
import { applyCompanyProfileToProject } from './projectContactOperations';
import {
  applyDocumentSchemeToProject,
  applyLogoStyleToProject,
  applyZoneStyleToProjectRole,
  prepareProjectForTopDesignChange,
  projectHasManualDesignOverrides,
  zoneStyleRole
} from './projectDesignOperations';
import {
  createEmptyHistory,
  recordHistorySnapshot,
  redoHistory,
  undoHistory,
  type HistoryState
} from './projectHistory';
import {
  addProjectPage,
  deleteProjectPage,
  duplicateProjectPage,
  moveProjectPage,
  reorderProjectPage,
  sortProjectPages,
  updateProjectZone
} from './projectPageOperations';
import { TopBar } from '../components/TopBar/TopBar';
import { PageLibrary } from '../components/PageLibrary/PageLibrary';
import { Canvas } from '../components/Canvas/Canvas';
import { DocumentPageStrip } from '../components/DocumentPageStrip/DocumentPageStrip';
import { RightEditorPanel } from '../components/RightEditorPanel/RightEditorPanel';
import { VilrayCTA } from '../components/VilrayCTA/VilrayCTA';
import { ExportCheckModal } from '../components/modals/ExportCheckModal';
import { LocalDocumentsModal } from '../components/modals/LocalDocumentsModal';
import { VilrayMaterialsModal } from '../components/modals/VilrayMaterialsModal';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { SiteInfoModal, type SiteInfoKind } from '../components/modals/SiteInfoModal';
import { getDocumentScheme, type DocumentSchemeId } from '../data/documentSchemes';
import {
  createBlankPage,
  createPageFromTemplate,
  createProject,
  getPresetPreferredSchemeId,
  getPresetPresentationOverrides
} from '../data/createProject';

import type {
  DocumentRenderSettings,
  EditableZone,
  ImageZone,
  PresetId,
  Project,
  ServiceSettings
} from '../types/project';
import { createId } from '../utils/clone';
import { compressImage } from '../utils/images';
import { exportProjectJson } from '../utils/jsonImportExport';
import {
  createProjectFromSavedTemplate,
  deleteSavedProject,
  deleteSavedTemplate,
  loadProject,
  loadSavedProject,
  loadSavedProjects,
  loadSavedTemplate,
  loadSavedTemplates,
  loadServiceSettings,
  saveProject,
  saveProjectAsTemplate,
  saveProjectToLibrary,
  saveServiceSettings
} from '../utils/storage';
import type { VilrayPromoId } from '../data/vilrayPromos';

const AUTOSAVE_DEBOUNCE_MS = 400;

type ConfirmState = {
  message: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  resolve: (accepted: boolean) => void;
};

let initialProjectSource = 'initial_default';

type DebugViewOptions = {
  presetOverride: PresetId | null;
  forcePreset: boolean;
  openPresets: boolean;
};

const allowedPresetIds = new Set<PresetId>([
  'mini_catalog',
  'commercial_offer',
  'price_list',
  'selection',
  'technical_package',
  'moodboard_presentation',
  'premium_catalog',
  'outdoor_collection',
  'slab_catalog',
  'wood_catalog',
  'editorial_catalog',
  'dealer_presentation',
  'client_offer',
  'empty'
]);

function getDebugViewOptions(): DebugViewOptions {
  if (typeof window === 'undefined') {
    return {
      presetOverride: null,
      forcePreset: false,
      openPresets: false
    };
  }

  const params = new URLSearchParams(window.location.search);
  const presetParam = params.get('preset');
  const presetOverride = presetParam && allowedPresetIds.has(presetParam as PresetId)
    ? presetParam as PresetId
    : null;

  return {
    presetOverride,
    forcePreset: params.get('forcePreset') === '1',
    openPresets: params.get('openPresets') === '1'
  };
}

const initialDebugView = getDebugViewOptions();

function getInitialProject() {
  if (initialDebugView.forcePreset && initialDebugView.presetOverride) {
    initialProjectSource = 'debug_preset_override';
    return createProject(initialDebugView.presetOverride);
  }

  const restored = loadProject();
  if (restored) {
    initialProjectSource = 'local_project_restored';
    return restored;
  }
  return createProject();
}

export function App() {
  const [project, setProject] = useState<Project>(() => getInitialProject());
  const [selectedPageId, setSelectedPageId] = useState(() => project.pages[0]?.id ?? '');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isExportCheckOpen, setExportCheckOpen] = useState(false);
  const [isLibraryOpen, setLibraryOpen] = useState(false);
  const [isPromoOpen, setPromoOpen] = useState(false);
  const [siteInfoKind, setSiteInfoKind] = useState<SiteInfoKind | null>(null);
  const [promoVariantId, setPromoVariantId] = useState<VilrayPromoId>('interior_images');
  const [savedProjects, setSavedProjects] = useState(() => loadSavedProjects());
  const [userTemplates, setUserTemplates] = useState(() => loadSavedTemplates());
  const [serviceSettings, setServiceSettings] = useState<ServiceSettings>(() => loadServiceSettings());
  const [history, setHistory] = useState<HistoryState<Project>>(() => createEmptyHistory());
  const [storageWarning, setStorageWarning] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [isMobileDevice, setMobileDevice] = useState(() => {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 900px)').matches;
});

  const trackedZoneEvents = useRef(new Set<string>());
  const mountedRef = useRef(false);
  const projectSaveTimeoutRef = useRef<number | null>(null);
  const settingsSaveTimeoutRef = useRef<number | null>(null);
  const projectRef = useRef(project);
  const settingsRef = useRef(serviceSettings);

  const pages = useMemo(() => sortProjectPages(project.pages), [project.pages]);
  const projectSnapshot = useMemo(() => ({ ...project, pages }), [project, pages]);
  const initialProjectRef = useRef(projectSnapshot);
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
  }), [
    project.pageFormat,
    project.documentTheme,
    project.documentAccent,
    project.documentAccentColor,
    project.documentBackgroundColor,
    project.documentTextPalette,
    project.documentTextPrimaryColor,
    project.documentTextSecondaryColor,
    project.documentDividerColor,
    project.showLogos,
    project.showPageNumbers,
    project.showDividers
  ]);
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0];
  const selectedZone = selectedPage && selectedZoneId ? selectedPage.zones[selectedZoneId] : null;

  function trackProjectEvent(eventName: string, properties: Record<string, unknown> = {}) {
    track(eventName, {
      ...projectAnalyticsProperties(projectSnapshot),
      ...properties
    });
  }

  function persistProjectSnapshot(snapshot: Project) {
    projectRef.current = snapshot;
    if (!saveProject(snapshot)) {
      setStorageWarning('Автосохранение не выполнено: локальное хранилище браузера переполнено или недоступно.');
    }
  }

  function persistServiceSnapshot(snapshot: ServiceSettings) {
    settingsRef.current = snapshot;
    if (!saveServiceSettings(snapshot)) {
      setStorageWarning('Настройки не сохранены: локальное хранилище браузера переполнено или недоступно.');
    }
  }

  function flushPendingPersistence() {
    if (typeof window !== 'undefined') {
      if (projectSaveTimeoutRef.current !== null) {
        window.clearTimeout(projectSaveTimeoutRef.current);
        projectSaveTimeoutRef.current = null;
      }
      if (settingsSaveTimeoutRef.current !== null) {
        window.clearTimeout(settingsSaveTimeoutRef.current);
        settingsSaveTimeoutRef.current = null;
      }
    }
    persistProjectSnapshot(projectRef.current);
    persistServiceSnapshot(settingsRef.current);
  }

  function resetProjectHistory() {
    setHistory(createEmptyHistory());
  }

  function focusPage(pageId: string | null) {
    setSelectedPageId(pageId ?? '');
    setSelectedZoneId(null);
  }

  function replaceActiveProject(
    nextProject: Project,
    options: {
      resetHistory?: boolean;
      preferredPageId?: string;
      closeLibrary?: boolean;
    } = {}
  ) {
    setProject(nextProject);
    if (options.resetHistory) resetProjectHistory();
    const nextPage = nextProject.pages.find((page) => page.id === options.preferredPageId) ?? nextProject.pages[0];
    focusPage(nextPage?.id ?? null);
    if (options.closeLibrary) setLibraryOpen(false);
  }

  function activateCreatedProject(
    nextProject: Project,
    source: string,
    properties: Record<string, unknown> = {}
  ) {
    replaceActiveProject(nextProject, { resetHistory: true });
    track('document_created', {
      ...projectAnalyticsProperties(nextProject),
      source,
      ...properties
    });
  }

  function updateProject(mutator: (current: Project) => Project) {
    const previousProject = project;
    const nextProject = mutator({
      ...previousProject,
      updatedAt: new Date().toISOString()
    });

    setHistory((current) => recordHistorySnapshot(current, previousProject));
    setProject({
      ...nextProject,
      updatedAt: new Date().toISOString()
    });
  }

  function selectFirstAvailablePage(snapshot: Project, preferredPageId = selectedPageId) {
    const nextPage = snapshot.pages.find((page) => page.id === preferredPageId) ?? snapshot.pages[0];
    focusPage(nextPage?.id ?? null);
  }

  function undoProject() {
    const result = undoHistory(history, project);
    if (!result) return;
    setHistory(result.history);
    setProject(result.snapshot);
    selectFirstAvailablePage(result.snapshot);
  }

  function redoProject() {
    const result = redoHistory(history, project);
    if (!result) return;
    setHistory(result.history);
    setProject(result.snapshot);
    selectFirstAvailablePage(result.snapshot);
  }

  function rememberCustomColor(color: string) {
    const normalized = color.toLowerCase();
    setServiceSettings((current) => ({
      ...current,
      recentCustomColors: [normalized, ...(current.recentCustomColors ?? []).filter((entry) => entry.toLowerCase() !== normalized)].slice(0, 6)
    }));
  }

  function askConfirmation(options: Omit<ConfirmState, 'resolve'>) {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }

  function resolveConfirmation(accepted: boolean) {
    confirmState?.resolve(accepted);
    setConfirmState(null);
  }

  async function confirmDangerousRemoval(message: string, description: string, confirmLabel: string) {
    return askConfirmation({
      message,
      description,
      confirmLabel,
      tone: 'danger'
    });
  }

  function confirmNamedRemoval(options: {
    message: string;
    itemTitle: string;
    itemLabel: string;
    locationText: string;
    confirmLabel: string;
  }) {
    return confirmDangerousRemoval(
      options.message,
      options.itemLabel + ' «' + options.itemTitle + '» будет удалён ' + options.locationText + '. Это действие нельзя отменить.',
      options.confirmLabel
    );
  }

  function handleStorageActionError(action: string, error: unknown, fallbackMessage: string) {
    trackProjectEvent('error_storage', {
      action,
      errorMessage: error instanceof Error ? error.message : 'storage_failed'
    });
    const message = error instanceof Error ? error.message : fallbackMessage;
    setStorageWarning(message);
    window.alert(message);
  }

  function persistCurrentProjectSnapshot<T>(
    persist: (snapshot: Project) => T,
    applyResult: (result: T) => void,
    options: {
      successMessage?: string;
      saveTarget: 'local_library' | 'user_template';
      errorAction: string;
      errorFallbackMessage: string;
    }
  ) {
    try {
      flushPendingPersistence();
      applyResult(persist(projectSnapshot));
      if (options.successMessage) setStorageWarning(options.successMessage);
      trackProjectEvent('document_saved', { saveTarget: options.saveTarget });
    } catch (error) {
      handleStorageActionError(options.errorAction, error, options.errorFallbackMessage);
    }
  }

  function getSavedTemplateOrWarn(templateId: string) {
    const template = loadSavedTemplate(templateId);
    if (!template) setStorageWarning('Шаблон не найден');
    return template;
  }

  function getSavedTemplateTitle(templateId: string) {
    return userTemplates.find((item) => item.id === templateId)?.title;
  }

  function exportTemplateSnapshot(template: Project) {
    exportProjectJson(template);
  }

  async function shareTemplateSnapshot(template: Project) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(template));
      setStorageWarning('Шаблон скопирован');
    } catch {
      exportTemplateSnapshot(template);
      setStorageWarning('Шаблон выгружен файлом');
    }
  }

  function getSavedProjectOrNull(projectId: string) {
    return loadSavedProject(projectId);
  }

  function getSavedProjectTitle(projectId: string) {
    return savedProjects.find((item) => item.id === projectId)?.title;
  }

  function openLibraryProjectSnapshot(savedProject: Project) {
    replaceActiveProject(savedProject, { resetHistory: true, closeLibrary: true });
    trackLibraryProjectEvent('document_loaded', savedProject);
  }

  function duplicateLibraryProjectSnapshot(savedProject: Project) {
    const duplicatedProject: Project = {
      ...savedProject,
      id: createId('project'),
      title: `${savedProject.title} РєР?РїРёС?`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSavedProjects(saveProjectToLibrary(duplicatedProject));
    trackLibraryProjectEvent('document_duplicated', duplicatedProject);
  }

  function trackLibraryProjectEvent(
    eventName: string,
    libraryProject: Project,
    properties: Record<string, unknown> = {}
  ) {
    track(eventName, {
      ...projectAnalyticsProperties(libraryProject),
      source: 'local_library',
      ...properties
    });
  }

  function trackZoneEventOnce(
    eventName: string,
    zone: EditableZone,
    pageId?: string,
    properties: Record<string, unknown> = {}
  ) {
    const key = `${eventName}:${pageId ?? 'page'}:${zone.id}`;
    if (trackedZoneEvents.current.has(key)) return;
    trackedZoneEvents.current.add(key);
    trackProjectEvent(eventName, {
      ...zoneAnalyticsProperties(zone, pageId),
      ...properties
    });
  }

  function selectZone(zoneId: string | null) {
    setSelectedZoneId(zoneId);
    if (!zoneId || !selectedPage) return;
    const zone = selectedPage.zones[zoneId];
    if (zone) {
      trackProjectEvent('zone_selected', zoneAnalyticsProperties(zone, selectedPage.id));
    }
  }

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (initialProjectSource === 'local_project_restored') {
        track('local_project_restored', projectAnalyticsProperties(initialProjectRef.current));
      } else if (initialProjectSource === 'debug_preset_override') {
        track('document_created', {
          ...projectAnalyticsProperties(initialProjectRef.current),
          source: 'debug_preset_override'
        });
      } else {
        track('document_created', {
          ...projectAnalyticsProperties(initialProjectRef.current),
          source: 'initial_default'
        });
      }
    }
  }, []);

  useEffect(() => {
    projectRef.current = projectSnapshot;
    if (typeof window === 'undefined') {
      persistProjectSnapshot(projectSnapshot);
      return;
    }
    if (projectSaveTimeoutRef.current !== null) window.clearTimeout(projectSaveTimeoutRef.current);
    projectSaveTimeoutRef.current = window.setTimeout(() => {
      projectSaveTimeoutRef.current = null;
      persistProjectSnapshot(projectSnapshot);
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [projectSnapshot]);

  useEffect(() => {
    settingsRef.current = serviceSettings;
    if (typeof window === 'undefined') {
      persistServiceSnapshot(serviceSettings);
      return;
    }
    if (settingsSaveTimeoutRef.current !== null) window.clearTimeout(settingsSaveTimeoutRef.current);
    settingsSaveTimeoutRef.current = window.setTimeout(() => {
      settingsSaveTimeoutRef.current = null;
      persistServiceSnapshot(serviceSettings);
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [serviceSettings]);

  useEffect(() => {
  if (typeof window === 'undefined') return;

  const mobileQuery = window.matchMedia(
    '(pointer: coarse) and (max-width: 900px)'
  );

  const updateMobileState = () => {
    setMobileDevice(mobileQuery.matches);
  };

  updateMobileState();
  mobileQuery.addEventListener('change', updateMobileState);

  return () => {
    mobileQuery.removeEventListener('change', updateMobileState);
  };
}, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flushNow = () => {
      if (projectSaveTimeoutRef.current !== null) {
        window.clearTimeout(projectSaveTimeoutRef.current);
        projectSaveTimeoutRef.current = null;
      }
      if (settingsSaveTimeoutRef.current !== null) {
        window.clearTimeout(settingsSaveTimeoutRef.current);
        settingsSaveTimeoutRef.current = null;
      }
      persistProjectSnapshot(projectRef.current);
      persistServiceSnapshot(settingsRef.current);
    };
    const handlePageHide = () => flushNow();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  async function promptBeforeTopDesignChange(scope: Parameters<typeof projectHasManualDesignOverrides>[1] = 'all') {
    if (!projectHasManualDesignOverrides(projectSnapshot, scope)) return true;
    return askConfirmation({
      message: 'Применить общий дизайн?',
      description: 'В документе есть оформление, которое вы настроили вручную в правой панели. При применении новой дизайн-схемы эти локальные настройки будут сброшены.',
      confirmLabel: 'Применить дизайн'
    });
  }

  function applyDocumentDesignPatch(
    scope: Parameters<typeof prepareProjectForTopDesignChange>[1],
    patch: (current: Project) => Project
  ) {
    promptBeforeTopDesignChange(scope).then((accepted) => {
      if (!accepted) return;
      updateProject((current) => patch(prepareProjectForTopDesignChange(current, scope)));
    });
  }

  async function applyDocumentScheme(schemeId: DocumentSchemeId) {
    if (!await promptBeforeTopDesignChange('all')) return;
    const scheme = getDocumentScheme(schemeId);
    setServiceSettings((current) => ({ ...current, defaultDocumentScheme: scheme.id }));
    trackProjectEvent('document_scheme_changed', { schemeId: scheme.id });
    updateProject((current) => ({
      ...prepareProjectForTopDesignChange(current, 'all'),
      documentTheme: scheme.documentTheme,
      documentAccent: scheme.documentAccent,
      documentAccentColor: undefined,
      documentBackgroundColor: undefined,
      documentTextPrimaryColor: scheme.documentTextPrimaryColor,
      documentTextSecondaryColor: scheme.documentTextSecondaryColor,
      documentDividerColor: undefined,
      showLogos: scheme.showLogos,
      showPageNumbers: scheme.showPageNumbers
    }));
  }

  async function resetDesignToSelectedScheme() {
    if (!await askConfirmation({
      message: 'Вернуть дизайн по умолчанию?',
      description: 'Документ будет переведён на дизайн-схему по умолчанию. Локальные настройки оформления сбросятся, но текст, изображения и структура страниц сохранятся.',
      confirmLabel: 'Сбросить дизайн'
    })) return;

    trackProjectEvent('global_design_reset');
    const scheme = getDocumentScheme(serviceSettings.defaultDocumentScheme ?? 'classic');
    updateProject((current) => ({
      ...applyDocumentSchemeToProject(prepareProjectForTopDesignChange(current, 'all'), scheme.id),
      documentTheme: scheme.documentTheme,
      documentAccent: scheme.documentAccent,
      documentAccentColor: undefined,
      documentBackgroundColor: undefined,
      documentTextPrimaryColor: scheme.documentTextPrimaryColor,
      documentTextSecondaryColor: scheme.documentTextSecondaryColor,
      documentDividerColor: undefined
    }));
  }

  function handleThemeChange(theme: Project['documentTheme']) {
    applyDocumentDesignPatch('all', (current) => ({
      ...current,
      documentTheme: theme,
      documentBackgroundColor: undefined
    }));
  }

  function handleBackgroundColorChange(color: string) {
    applyDocumentDesignPatch('all', (current) => ({
      ...current,
      documentBackgroundColor: color
    }));
  }

  function handleAccentChange(accent: Project['documentAccent']) {
    applyDocumentDesignPatch('all', (current) => ({
      ...current,
      documentAccent: accent,
      documentAccentColor: undefined
    }));
  }

  function handleAccentColorChange(color: string) {
    applyDocumentDesignPatch('all', (current) => ({
      ...current,
      documentAccentColor: color
    }));
  }

  function handleTextPrimaryColorChange(color?: string) {
    applyDocumentDesignPatch('textColor', (current) => ({
      ...current,
      documentTextPrimaryColor: color
    }));
  }

  function handleTextSecondaryColorChange(color?: string) {
    applyDocumentDesignPatch('textColor', (current) => ({
      ...current,
      documentTextSecondaryColor: color
    }));
  }

  function handleDividerColorChange(color?: string) {
    applyDocumentDesignPatch('dividerColor', (current) => ({
      ...current,
      documentDividerColor: color
    }));
  }

  function handlePageFormatChange(pageFormat: Project['pageFormat']) {
    trackProjectEvent('document_orientation_changed', { pageFormat });
    updateProject((current) => ({ ...current, pageFormat }));
  }

  function toggleProjectFlag(
    eventName: string,
    key: 'showLogos' | 'showPageNumbers' | 'showDividers',
    enabled: boolean
  ) {
    trackProjectEvent(eventName, { enabled });
    updateProject((current) => ({ ...current, [key]: enabled }));
  }

  function handleShowLogosChange(enabled: boolean) {
    toggleProjectFlag('global_logos_toggled', 'showLogos', enabled);
  }

  function handleShowPageNumbersChange(enabled: boolean) {
    toggleProjectFlag('global_page_numbers_toggled', 'showPageNumbers', enabled);
  }

  function handleShowDividersChange(enabled: boolean) {
    toggleProjectFlag('global_dividers_toggled', 'showDividers', enabled);
  }

  function createProjectWithDefaultScheme(preset: Project['preset']) {
    const schemeId = getPresetPreferredSchemeId(preset) ?? serviceSettings.defaultDocumentScheme ?? 'classic';
    const nextProject = applyDocumentSchemeToProject(createProject(preset), schemeId);
    return {
      ...nextProject,
      ...getPresetPresentationOverrides(preset)
    };
  }

  function createProjectFromPreset(preset: Project['preset'], source = 'preset') {
    const nextProject = createProjectWithDefaultScheme(preset);
    activateCreatedProject(nextProject, source);
    track('document_preset_selected', {
      ...projectAnalyticsProperties(nextProject),
      preset,
      source
    });
  }

  function confirmProjectReplacement(message: string, description: string) {
    return askConfirmation({
      message,
      description,
      confirmLabel: 'Заменить'
    });
  }

  async function openPresetFromLibrary(preset: Project['preset']) {
    if (!await confirmProjectReplacement(
      'Заменить текущий проект?',
      'Текущий документ в редакторе будет заменён выбранным готовым шаблоном.'
    )) return;
    createProjectFromPreset(preset, 'page_library');
  }

  async function createEmptyDocument() {
    if (!await askConfirmation({
      message: 'Создать новый документ?',
      description: 'Текущий рабочий стол будет заменён пустым документом. Сохранённые проекты и шаблоны останутся в личном кабинете.',
      confirmLabel: 'Создать'
    })) return;
    activateCreatedProject(createProjectWithDefaultScheme('empty'), 'toolbar_new');
  }

  function handleZoneChange(zone: EditableZone) {
    if (!selectedPage) return;

    const currentZone = selectedPage.zones[zone.id];
    if (zone.kind === 'text') trackZoneEventOnce('zone_text_edited', zone, selectedPage.id);
    if (zone.kind === 'table') trackZoneEventOnce('zone_table_edited', zone, selectedPage.id);
    if (
      zone.kind === 'image' &&
      currentZone?.kind === 'image' &&
      currentZone.src !== zone.src &&
      zone.src
    ) {
      trackZoneEventOnce('zone_image_uploaded', zone, selectedPage.id, {
        source: 'right_panel'
      });
    }
    if (currentZone && currentZone.visible !== zone.visible) {
      trackZoneEventOnce('zone_visibility_changed', zone, selectedPage.id);
    }
    if (currentZone && JSON.stringify(currentZone.style) !== JSON.stringify(zone.style)) {
      trackZoneEventOnce('zone_style_changed', zone, selectedPage.id);
    }

    updateProject((current) => updateProjectZone(current, selectedPage.id, zone));
  }

  function applyLogoStyleToAllPages(zone: ImageZone) {
    trackProjectEvent('zone_apply_style_role', {
      zoneKind: 'image',
      zoneRole: 'logo'
    });
    updateProject((current) => applyLogoStyleToProject(current, zone));
  }

  function applyZoneStyleToSameRole(zone: EditableZone) {
    trackProjectEvent('zone_apply_style_role', {
      zoneKind: zone.kind,
      zoneRole: zoneStyleRole(zone)
    });
    updateProject((current) => applyZoneStyleToProjectRole(current, zone));
  }

  async function handleImageDrop(zoneId: string, file: File) {
    if (!selectedPage) return;
    try {
      const imageSrc = await compressImage(file);
      const currentZone = selectedPage.zones[zoneId];
      if (!currentZone || currentZone.kind !== 'image') return;

      trackZoneEventOnce('zone_image_uploaded', currentZone, selectedPage.id, {
        ...zoneAnalyticsProperties(currentZone, selectedPage.id),
        fileType: file.type || null,
        fileSizeKb: Math.round(file.size / 1024),
        source: 'canvas_drop'
      });

      handleZoneChange({
        ...currentZone,
        src: imageSrc,
        alt: file.name
      });
      setSelectedZoneId(zoneId);
    } catch (error) {
      trackProjectEvent('error_image_upload', {
        zoneId,
        errorMessage: error instanceof Error ? error.message : 'image_upload_failed'
      });
      window.alert(error instanceof Error ? error.message : 'Не удалось загрузить изображение.');
    }
  }

  function applyLocalProfile(profile = serviceSettings.companyProfile) {
    trackProjectEvent('local_profile_applied', {
      hasCompany: Boolean(profile.companyName),
      hasPhone: Boolean(profile.phone),
      hasEmail: Boolean(profile.email),
      hasLogo: Boolean(profile.logoSrc)
    });
    updateProject((current) => applyCompanyProfileToProject(current, profile));
  }

  function addPage(templateId: string) {
    const page = createPageFromTemplate(templateId, pages.length);
    updateProject((current) => addProjectPage(current, page));
    focusPage(page.id);
    trackProjectEvent('page_template_added', {
      templateId,
      pageCountAfter: pages.length + 1
    });
  }

  function addBlankPage() {
    const page = createBlankPage(pages.length);
    updateProject((current) => addProjectPage(current, page));
    focusPage(page.id);
    trackProjectEvent('blank_page_added', {
      pageCountAfter: pages.length + 1
    });
  }
  function duplicatePage(pageId: string) {
    const duplicated = duplicateProjectPage(project, pageId, createId('page'));
    if (!duplicated) return;
    updateProject(() => duplicated.project);
    focusPage(duplicated.page.id);
    const sourcePage = pages.find((page) => page.id === pageId);
    trackProjectEvent('page_duplicated', {
      templateId: sourcePage?.templateId,
      pageCountAfter: pages.length + 1
    });
  }

  function removePage(pageId: string) {
    if (pages.length <= 1) return;
    updateProject((current) => deleteProjectPage(current, pageId));
    const nextPage = pages.find((page) => page.id !== pageId);
    focusPage(nextPage?.id ?? null);
    trackProjectEvent('page_deleted', {
      pageId,
      pageCountAfter: pages.length - 1
    });
  }

  function movePage(pageId: string, direction: -1 | 1) {
    const fromIndex = pages.findIndex((page) => page.id === pageId);
    const toIndex = fromIndex + direction;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= pages.length) return;
    updateProject((current) => moveProjectPage(current, pageId, direction) ?? current);
    trackProjectEvent('page_reordered', {
      pageId,
      direction,
      fromIndex,
      toIndex
    });
  }

  function reorderPages(sourcePageId: string, targetPageId: string) {
    if (sourcePageId === targetPageId) return;
    const fromIndex = pages.findIndex((page) => page.id === sourcePageId);
    const toIndex = pages.findIndex((page) => page.id === targetPageId);
    if (fromIndex < 0 || toIndex < 0) return;
    updateProject((current) => reorderProjectPage(current, sourcePageId, targetPageId) ?? current);
    focusPage(sourcePageId);
    trackProjectEvent('page_reordered', {
      pageId: sourcePageId,
      fromIndex,
      toIndex
    });
  }

  function saveToLibrary() {
    persistCurrentProjectSnapshot(
      saveProjectToLibrary,
      setSavedProjects,
      {
        saveTarget: 'local_library',
        errorAction: 'save_project',
        errorFallbackMessage: 'Не удалось сохранить проект.'
      }
    );
  }

  function saveCurrentProjectAsTemplate() {
    persistCurrentProjectSnapshot(
      saveProjectAsTemplate,
      setUserTemplates,
      {
        successMessage: 'Шаблон сохранён',
        saveTarget: 'user_template',
        errorAction: 'save_template',
        errorFallbackMessage: 'Не удалось сохранить шаблон.'
      }
    );
  }

  async function openUserTemplate(templateId: string) {
    if (
      pages.length > 0 &&
      !await confirmProjectReplacement(
        'Открыть ваш шаблон?',
        'В редакторе будет создан новый проект на основе выбранного шаблона. Текущий документ будет заменён.'
      )
    ) {
      return;
    }

    const nextProject = createProjectFromSavedTemplate(templateId);
    if (!nextProject) {
      setStorageWarning('Шаблон не найден');
      return;
    }

    activateCreatedProject(nextProject, 'user_template', { templateId });
  }

  async function removeUserTemplate(templateId: string) {
    const templateTitle = getSavedTemplateTitle(templateId) ?? 'выбранный шаблон';
    if (!await confirmNamedRemoval({
      message: 'Удалить ваш шаблон?',
      itemTitle: templateTitle,
      itemLabel: 'Шаблон',
      locationText: 'из списка ваших шаблонов',
      confirmLabel: 'Удалить шаблон'
    })) {
      return;
    }

    setUserTemplates(deleteSavedTemplate(templateId));
    setStorageWarning('Шаблон удалён');
  }

  function exportUserTemplate(templateId: string) {
    const template = getSavedTemplateOrWarn(templateId);
    if (!template) return;
    exportTemplateSnapshot(template);
  }

  async function shareUserTemplate(templateId: string) {
    const template = getSavedTemplateOrWarn(templateId);
    if (!template) return;
    await shareTemplateSnapshot(template);
  }

  function openSavedProject(projectId: string) {
    const savedProject = getSavedProjectOrNull(projectId);
    if (!savedProject) return;
    openLibraryProjectSnapshot(savedProject);
  }

  function duplicateSavedProject(projectId: string) {
    const savedProject = getSavedProjectOrNull(projectId);
    if (!savedProject) return;
    duplicateLibraryProjectSnapshot(savedProject);
  }

  async function removeSavedProject(projectId: string) {
    const projectTitle = getSavedProjectTitle(projectId) ?? 'выбранный проект';
    if (!await confirmNamedRemoval({
      message: 'Удалить сохранённый проект?',
      itemTitle: projectTitle,
      itemLabel: 'Проект',
      locationText: 'с этого устройства',
      confirmLabel: 'Удалить проект'
    })) {
      return;
    }

    setSavedProjects(deleteSavedProject(projectId));
    trackProjectEvent('document_deleted', {
      source: 'local_library',
      deletedProjectId: projectId
    });
  }

  function openExportCheck() {
    setExportCheckOpen(true);
  }

  function openLibrary() {
    trackProjectEvent('local_cabinet_opened');
    setLibraryOpen(true);
  }

  function openVilrayMaterials(source: 'right_cta' | 'cabinet_promo', variantId: VilrayPromoId) {
    trackProjectEvent('vilray_cta_clicked', {
      source,
      placement: source === 'cabinet_promo' ? 'cabinet_promo' : 'right_panel',
      variantId
    });
    setPromoVariantId(variantId);
    setPromoOpen(true);
  }

  const topBarActions = [
    {
      label: 'Выгрузить PDF',
      icon: <Download size={18} />,
      onClick: openExportCheck,
      variant: 'primary' as const
    },
    {
      label: 'Кабинет',
      icon: <UserRound size={21} strokeWidth={2.6} />,
      onClick: openLibrary,
      variant: 'ghost' as const,
      iconOnly: true
    }
  ];

  if (isMobileDevice) {
    return (
      <div className="app-shell desktop-required-shell" data-theme={serviceSettings.interfaceTheme} data-accent="purple">
        <section className="desktop-required-card">
          <span className="desktop-required-kicker">Плитка PDF</span>
          <h1>Редактор доступен на компьютере</h1>
          <p>Мобильная версия редактора в этот релиз не входит. Откройте сервис на ноутбуке или настольном компьютере, чтобы работать со страницами, шаблонами и PDF без сломанной верстки.</p>
          <div className="desktop-required-actions">
            <a className="btn btn-primary" href="/">Перейти на лендинг</a>
            <button className="btn btn-ghost" type="button" onClick={() => setSiteInfoKind('help')}>Помощь</button>
            <button className="btn btn-ghost" type="button" onClick={() => setSiteInfoKind('about')}>О сервисе</button>
          </div>
        </section>
        {siteInfoKind && (
          <SiteInfoModal kind={siteInfoKind} onClose={() => setSiteInfoKind(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="app-shell" data-theme={serviceSettings.interfaceTheme} data-accent="purple">
      <TopBar
        project={project}
        recentCustomColors={serviceSettings.recentCustomColors ?? []}
        onRememberCustomColor={rememberCustomColor}
        onThemeChange={handleThemeChange}
        onBackgroundColorChange={handleBackgroundColorChange}
        onAccentChange={handleAccentChange}
        onAccentColorChange={handleAccentColorChange}
        onTextPrimaryColorChange={handleTextPrimaryColorChange}
        onTextSecondaryColorChange={handleTextSecondaryColorChange}
        onDividerColorChange={handleDividerColorChange}
        onFormatChange={handlePageFormatChange}
        onShowLogosChange={handleShowLogosChange}
        onShowPageNumbersChange={handleShowPageNumbersChange}
        onShowDividersChange={handleShowDividersChange}
        selectedSchemeId={serviceSettings.defaultDocumentScheme ?? 'classic'}
        onSchemeChange={applyDocumentScheme}
        onResetDesignToScheme={resetDesignToSelectedScheme}
        onOpenHelp={() => setSiteInfoKind('help')}
        onOpenAbout={() => setSiteInfoKind('about')}
        actions={topBarActions}
      />

      <ResizableWorkspace>
        <PageLibrary
          currentPreset={project.preset}
          projectTitle={project.title}
          renderSettings={renderSettings}
          initialPresetsOpen={initialDebugView.openPresets}
          onProjectTitleChange={(title) => updateProject((current) => ({ ...current, title }))}
          onPresetChange={openPresetFromLibrary}
          userTemplates={userTemplates}
          onApplyUserTemplate={openUserTemplate}
          onDeleteUserTemplate={removeUserTemplate}
          onAddPage={addPage}
          onApplyPageFormat={(pageFormat) => updateProject((current) => ({ ...current, pageFormat }))}
        />

        <section className="work-area">
          <Canvas
            page={selectedPage}
            renderSettings={renderSettings}
            selectedZoneId={selectedZoneId}
            onSelectZone={selectZone}
            onImageDrop={handleImageDrop}
            onCreateFromPreset={createProjectFromPreset}
            userTemplates={userTemplates}
            onCreateFromUserTemplate={openUserTemplate}
            onCommitPageLayout={(page) => updateProject((current) => ({
              ...current,
              pages: current.pages.map((item) => item.id === page.id ? page : item)
            }))}
          />

          <DocumentPageStrip
            pages={pages}
            renderSettings={renderSettings}
            selectedPageId={selectedPage?.id ?? ''}
            onSelectPage={(pageId) => {
              trackProjectEvent('page_selected', { pageId });
              focusPage(pageId);
            }}
            onDuplicate={duplicatePage}
            onDelete={removePage}
            onMove={movePage}
            onReorder={reorderPages}
            onAddPage={addPage}
            onAddBlankPage={addBlankPage}
          />
        </section>

        <aside className="right-stack">
          <section className="right-toolbar" aria-label="Быстрые действия">
            <button className="btn btn-ghost action-short-btn" onClick={createEmptyDocument} title="Новый документ">
              <Plus size={18} />
              <span>Новый</span>
            </button>
            <button className="btn btn-ghost top-icon-action" onClick={undoProject} disabled={history.past.length === 0} title="Назад" aria-label="Назад">
              <ArrowLeft size={19} strokeWidth={2.6} />
            </button>
            <button className="btn btn-ghost top-icon-action" onClick={redoProject} disabled={history.future.length === 0} title="Вперёд" aria-label="Вперёд">
              <ArrowRight size={19} strokeWidth={2.6} />
            </button>
            <button className="btn btn-ghost top-icon-action" onClick={saveToLibrary} title="Сохранить" aria-label="Сохранить">
              <Save size={19} strokeWidth={2.6} />
            </button>
            <button className="btn btn-ghost top-icon-action" onClick={saveCurrentProjectAsTemplate} title="Сохранить как шаблон" aria-label="Сохранить как шаблон">
              <Star size={19} strokeWidth={2.6} />
            </button>
          </section>

          <RightEditorPanel
            zone={selectedZone}
            onChange={handleZoneChange}
            recentCustomColors={serviceSettings.recentCustomColors ?? []}
            onRememberCustomColor={rememberCustomColor}
            onApplyLogoStyleToAllPages={applyLogoStyleToAllPages}
            onApplyZoneStyleToSameRole={applyZoneStyleToSameRole}
            documentColors={{
              documentTheme: project.documentTheme,
              documentAccent: project.documentAccent,
              documentAccentColor: project.documentAccentColor,
              documentBackgroundColor: project.documentBackgroundColor,
              documentTextPalette: project.documentTextPalette,
              documentTextPrimaryColor: project.documentTextPrimaryColor,
              documentTextSecondaryColor: project.documentTextSecondaryColor
            }}
          />

          <VilrayCTA placement="right_panel" onOpenMaterials={(variantId) => openVilrayMaterials('right_cta', variantId)} />
        </aside>
      </ResizableWorkspace>
      {storageWarning && (
        <div className="storage-warning" role="status">
          <span>{storageWarning}</span>
          <button type="button" onClick={() => setStorageWarning('')}>Закрыть</button>
        </div>
      )}

      {isExportCheckOpen && (
        <ExportCheckModal
          project={projectSnapshot}
          onClose={() => setExportCheckOpen(false)}
          onSaveAsTemplate={saveCurrentProjectAsTemplate}
        />
      )}

      {isLibraryOpen && (
        <LocalDocumentsModal
          currentProject={projectSnapshot}
          savedProjects={savedProjects}
          userTemplates={userTemplates}
          settings={serviceSettings}
          onClose={() => setLibraryOpen(false)}
          onSettingsChange={setServiceSettings}
          onApplyContacts={applyLocalProfile}
          onOpenProject={openSavedProject}
          onDeleteProject={removeSavedProject}
          onDuplicateProject={duplicateSavedProject}
          onOpenTemplate={openUserTemplate}
          onDeleteTemplate={removeUserTemplate}
          onExportTemplate={exportUserTemplate}
          onShareTemplate={shareUserTemplate}
          onOpenVilrayMaterials={(variantId) => openVilrayMaterials('cabinet_promo', variantId)}
        />
      )}

      {isPromoOpen && (
        <VilrayMaterialsModal
          variantId={promoVariantId}
          onClose={() => setPromoOpen(false)}
        />
      )}

      {siteInfoKind && (
        <SiteInfoModal kind={siteInfoKind} onClose={() => setSiteInfoKind(null)} />
      )}

      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          tone={confirmState.tone}
          onConfirm={() => resolveConfirmation(true)}
          onCancel={() => resolveConfirmation(false)}
        />
      )}
    </div>
  );
}
