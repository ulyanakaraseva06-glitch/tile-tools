import { ReactNode, useEffect, useRef, useState } from 'react';
import { RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { Accent, PageFormat, Project, ThemeMode } from '../../types/project';
import { ColorPickerPopover } from '../ColorPickerPopover/ColorPickerPopover';
import { DocumentSchemeId, documentSchemes } from '../../data/documentSchemes';

type Action = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant: 'ghost' | 'primary';
  sublabel?: string;
  iconOnly?: boolean;
};

type TopBarProps = {
  project: Project;
  actions: Action[];
  recentCustomColors: string[];
  onRememberCustomColor: (color: string) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onBackgroundColorChange: (color: string) => void;
  onAccentChange: (accent: Accent) => void;
  onAccentColorChange: (color: string) => void;
  onTextPrimaryColorChange: (color?: string) => void;
  onTextSecondaryColorChange: (color?: string) => void;
  onDividerColorChange: (color?: string) => void;
  onFormatChange: (format: PageFormat) => void;
  onShowLogosChange: (value: boolean) => void;
  onShowPageNumbersChange: (value: boolean) => void;
  onShowDividersChange: (value: boolean) => void;
  selectedSchemeId: string;
  onSchemeChange: (schemeId: DocumentSchemeId) => void;
  onResetDesignToScheme: () => void;
  onOpenHelp: () => void;
  onOpenAbout: () => void;
};

type PaletteColor = {
  color: string;
  label: string;
};

type ThemePaletteColor = PaletteColor & {
  id?: ThemeMode;
};

type AccentPaletteColor = PaletteColor & {
  id?: Accent;
};

const themes: ThemePaletteColor[] = [
  { id: 'light', label: 'Светлая', color: '#ffffff' },
  { id: 'dark', label: 'Тёмная', color: '#24262a' },
  { id: 'beige', label: 'Бежевая', color: '#fff1df' },
  { label: 'Молочная', color: '#f7f2ea' },
  { label: 'Светло-серая', color: '#f4f5f7' },
  { label: 'Тёплый серый', color: '#ded6ca' }
];

const accents: AccentPaletteColor[] = [
  { id: 'purple', label: 'Фиолетовый', color: '#a385c4' },
  { id: 'gold', label: 'Золото', color: '#d0a43a' },
  { id: 'graphite', label: 'Графит', color: '#2f3338' },
  { id: 'beige', label: 'Коричневый', color: '#8f5f3b' },
  { id: 'blueGray', label: 'Серо-синий', color: '#6e8aa1' },
  { label: 'Терракота', color: '#b5694f' }
];

const neutralTextColors = [
  { color: '#ffffff', label: 'Белый' },
  { color: '#f7f2ea', label: 'Молочный' },
  { color: '#c9c9d2', label: 'Светло-серый' },
  { color: '#d8cab8', label: 'Бежево-серый' },
  { color: '#2f3338', label: 'Графит' },
  { color: '#050505', label: 'Чёрный' }
];

const dividerColors: PaletteColor[] = [
  { color: '#B7B7B7', label: 'Светло-серый' },
  { color: '#E2DDD4', label: 'Тёплый светлый' },
  { color: '#C7B99F', label: 'Песочный' },
  { color: '#9B79C6', label: 'Фиолетовый' },
  { color: '#6E8AA1', label: 'Серо-синий' },
  { color: '#2F3338', label: 'Графит' }
];

const formats: { id: PageFormat; label: string; icon: ReactNode }[] = [
  { id: 'a4_portrait', label: 'Вертикально', icon: <RectangleVertical size={18} /> },
  { id: 'a4_landscape', label: 'Горизонтально', icon: <RectangleHorizontal size={18} /> }
];

function normalize(color?: string) {
  return color?.trim().toLowerCase();
}

function isPresetTextColor(color: string) {
  return neutralTextColors.some((item) => normalize(item.color) === normalize(color));
}

function isPresetDividerColor(color: string) {
  return dividerColors.some((item) => normalize(item.color) === normalize(color));
}

function PaletteButtons({
  items,
  value,
  className,
  onSelect
}: {
  items: PaletteColor[];
  value: string;
  className?: string;
  onSelect: (item: PaletteColor) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <button
          key={item.color}
          type="button"
          className={`${className ?? 'theme-dot'} ${normalize(value) === normalize(item.color) ? 'active' : ''}`}
          style={{ backgroundColor: item.color }}
          onClick={() => onSelect(item)}
          title={item.label}
        />
      ))}
    </>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="top-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function DesignMenu({
  activeThemeColor,
  activeAccentColor,
  primaryTextColor,
  secondaryTextColor,
  dividerColor,
  recentCustomColors,
  onRememberCustomColor,
  onThemeChange,
  onBackgroundColorChange,
  onAccentChange,
  onAccentColorChange,
  onTextPrimaryColorChange,
  onTextSecondaryColorChange,
  onDividerColorChange,
  project
}: {
  activeThemeColor: string;
  activeAccentColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  dividerColor: string;
  recentCustomColors: string[];
  onRememberCustomColor: (color: string) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onBackgroundColorChange: (color: string) => void;
  onAccentChange: (accent: Accent) => void;
  onAccentColorChange: (color: string) => void;
  onTextPrimaryColorChange: (color?: string) => void;
  onTextSecondaryColorChange: (color?: string) => void;
  onDividerColorChange: (color?: string) => void;
  project: Project;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function selectThemeColor(item: ThemePaletteColor) {
    if (item.id) {
      onThemeChange(item.id);
      return;
    }
    onBackgroundColorChange(item.color);
  }

  function selectAccentColor(item: AccentPaletteColor) {
    if (item.id) {
      onAccentChange(item.id);
      return;
    }
    onAccentColorChange(item.color);
  }

  return (
    <div className="top-control fixed-control top-design-control">
      <span>Настроить</span>
      <div className="top-design-menu" ref={menuRef}>
        <button
          type="button"
          className="top-design-menu-trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span>Дизайн</span>
        </button>
        {open && <div className="top-design-popover">
          <section>
            <strong>Фон документа</strong>
            <div className="accent-row accent-panel">
              <PaletteButtons items={themes} value={activeThemeColor} className="theme-dot" onSelect={(item) => selectThemeColor(item as ThemePaletteColor)} />
              <ColorPickerPopover compact showLabelAbove value={activeThemeColor} recentCustomColors={recentCustomColors} onChange={onBackgroundColorChange} onRememberCustomColor={onRememberCustomColor} active={Boolean(project.documentBackgroundColor && !themes.some((item) => normalize(item.color) === normalize(project.documentBackgroundColor)))} />
            </div>
          </section>

          <section>
            <strong>Акцент</strong>
            <div className="accent-row accent-panel">
              <PaletteButtons items={accents} value={activeAccentColor} className="accent-dot" onSelect={(item) => selectAccentColor(item as AccentPaletteColor)} />
              <ColorPickerPopover compact showLabelAbove value={activeAccentColor} recentCustomColors={recentCustomColors} onChange={onAccentColorChange} onRememberCustomColor={onRememberCustomColor} active={Boolean(project.documentAccentColor && !accents.some((item) => normalize(item.color) === normalize(project.documentAccentColor)))} />
            </div>
          </section>

          <section>
            <strong>Основной текст</strong>
            <div className="accent-row accent-panel font-simple-panel">
              <PaletteButtons items={neutralTextColors} value={primaryTextColor} className="text-color-dot" onSelect={(item) => onTextPrimaryColorChange(item.color)} />
              <ColorPickerPopover compact showLabelAbove value={primaryTextColor} recentCustomColors={recentCustomColors} onChange={onTextPrimaryColorChange} onRememberCustomColor={onRememberCustomColor} active={Boolean(project.documentTextPrimaryColor && !isPresetTextColor(project.documentTextPrimaryColor))} />
            </div>
          </section>

          <section>
            <strong>Дополнительный текст</strong>
            <div className="accent-row accent-panel font-simple-panel">
              <PaletteButtons items={neutralTextColors} value={secondaryTextColor} className="text-color-dot" onSelect={(item) => onTextSecondaryColorChange(item.color)} />
              <ColorPickerPopover compact showLabelAbove value={secondaryTextColor} recentCustomColors={recentCustomColors} onChange={onTextSecondaryColorChange} onRememberCustomColor={onRememberCustomColor} active={Boolean(project.documentTextSecondaryColor && !isPresetTextColor(project.documentTextSecondaryColor))} />
            </div>
          </section>

          <section>
            <strong>Разделители</strong>
            <div className="accent-row accent-panel divider-color-panel">
              <PaletteButtons items={dividerColors} value={dividerColor} className="divider-dot" onSelect={(item) => onDividerColorChange(item.color)} />
              <ColorPickerPopover compact showLabelAbove value={dividerColor} recentCustomColors={recentCustomColors} onChange={onDividerColorChange} onRememberCustomColor={onRememberCustomColor} active={Boolean(project.documentDividerColor && !isPresetDividerColor(project.documentDividerColor))} />
            </div>
          </section>

        </div>}
      </div>
    </div>
  );
}

export function TopBar(props: TopBarProps) {
  const {
    project,
    actions,
    recentCustomColors,
    onRememberCustomColor,
    onThemeChange,
    onBackgroundColorChange,
    onAccentChange,
    onAccentColorChange,
    onTextPrimaryColorChange,
    onTextSecondaryColorChange,
    onDividerColorChange,
    onFormatChange,
    onShowLogosChange,
    onShowPageNumbersChange,
    onShowDividersChange,
    selectedSchemeId,
    onSchemeChange,
    onResetDesignToScheme,
    onOpenHelp,
    onOpenAbout
  } = props;
  const [feedbackKey, setFeedbackKey] = useState<string | null>(null);
  const activeThemeColor = project.documentBackgroundColor ?? themes.find((theme) => theme.id === project.documentTheme)?.color ?? '#ffffff';
  const activeAccentColor = project.documentAccentColor ?? accents.find((accent) => accent.id === project.documentAccent)?.color ?? '#a385c4';
  const primaryTextColor = project.documentTextPrimaryColor ?? '#1f2227';
  const secondaryTextColor = project.documentTextSecondaryColor ?? '#8a8d8f';
  const dividerColor = project.documentDividerColor ?? '#B7B7B7';

  function runWithFeedback(key: string, action: () => void) {
    action();
    setFeedbackKey(key);
    window.setTimeout(() => setFeedbackKey((current) => current === key ? null : current), 700);
  }

  return (
    <header className="top-bar">
      <div className="brand-block">
        <img className="brand-logo" src="/brand/logo.webp" alt="" />
        <div>
          <strong>Плитка PDF</strong>
          <span>от Вилрэй Студия</span>
        </div>
      </div>

      <label className="top-scheme-select">
        <span>Дизайн-схема</span>
        <select value={selectedSchemeId} onChange={(event) => onSchemeChange(event.target.value as DocumentSchemeId)}>
          {documentSchemes.map((scheme) => (
            <option key={scheme.id} value={scheme.id}>{scheme.label}</option>
          ))}
        </select>
      </label>

      <DesignMenu
        activeThemeColor={activeThemeColor}
        activeAccentColor={activeAccentColor}
        primaryTextColor={primaryTextColor}
        secondaryTextColor={secondaryTextColor}
        dividerColor={dividerColor}
        recentCustomColors={recentCustomColors}
        onRememberCustomColor={onRememberCustomColor}
        onThemeChange={onThemeChange}
        onBackgroundColorChange={onBackgroundColorChange}
        onAccentChange={onAccentChange}
        onAccentColorChange={onAccentColorChange}
        onTextPrimaryColorChange={onTextPrimaryColorChange}
        onTextSecondaryColorChange={onTextSecondaryColorChange}
        onDividerColorChange={onDividerColorChange}
        project={project}
      />

      <button className="btn btn-ghost top-design-reset" type="button" onClick={onResetDesignToScheme}>
        Сбросить дизайн
      </button>

      <div className="top-control fixed-control orientation-control">
        <span>Ориентация</span>
        <div className="accent-row accent-panel format-dot-panel">
          {formats.map((format) => (
            <button
              key={format.id}
              type="button"
              className={`format-dot ${project.pageFormat === format.id ? 'active' : ''}`}
              onClick={() => onFormatChange(format.id)}
              title={format.label}
            >
              {format.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="top-toggle-group">
        <Toggle label="Логотип" checked={project.showLogos !== false} onChange={onShowLogosChange} />
        <Toggle label="Разделители" checked={project.showDividers !== false} onChange={onShowDividersChange} />
        <Toggle label="Номера страниц" checked={project.showPageNumbers !== false} onChange={onShowPageNumbersChange} />
      </div>

      <div className="top-actions">
        <button className="btn btn-ghost top-page-link" type="button" onClick={onOpenHelp}>Помощь</button>
        <button className="btn btn-ghost top-page-link" type="button" onClick={onOpenAbout}>О сервисе</button>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`btn ${action.variant === 'primary' ? 'btn-primary btn-export-soft' : 'btn-ghost'} ${action.sublabel ? 'btn-stacked' : ''} ${action.iconOnly ? 'top-icon-action' : ''} ${feedbackKey === action.label ? 'action-feedback' : ''}`}
            onClick={() => runWithFeedback(action.label, action.onClick)}
            title={action.label}
            aria-label={action.label}
          >
            {action.iconOnly ? action.icon : <span className="btn-line">{action.icon}{action.label}</span>}
            {action.sublabel && !action.iconOnly && <small>{action.sublabel}</small>}
          </button>
        ))}
      </div>
    </header>
  );
}
