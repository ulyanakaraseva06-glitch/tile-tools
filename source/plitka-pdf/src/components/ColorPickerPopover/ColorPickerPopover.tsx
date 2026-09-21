import { useEffect, useRef, useState } from 'react';
import { Pipette } from 'lucide-react';

type ColorPickerPopoverProps = {
  value: string;
  recentCustomColors: string[];
  onChange: (color: string) => void;
  onRememberCustomColor: (color: string) => void;
  buttonLabel?: string;
  popoverLabel?: string;
  active?: boolean;
  compact?: boolean;
  align?: 'left' | 'right';
  sampleFallback?: 'checker' | 'color';
  showLabelAbove?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function normalizeColor(color: string) {
  return color.trim().toLowerCase();
}

function rgbToHex(color: string) {
  const match = color.trim().match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+[\d.]+)?\s*\)$/i);
  if (!match) return null;
  const channels = match.slice(1, 4).map((part) => Number(part));
  if (channels.some((value) => Number.isNaN(value) || value < 0 || value > 255)) return null;
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function toHexColor(color: string) {
  const normalized = normalizeColor(color);
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return `#${normalized.slice(1).split('').map((char) => `${char}${char}`).join('')}`;
  }
  return rgbToHex(normalized);
}

function inputColor(color: string) {
  return toHexColor(color) ?? '#a385c4';
}

export function ColorPickerPopover({
  value,
  recentCustomColors,
  onChange,
  onRememberCustomColor,
  buttonLabel = 'Свой',
  popoverLabel = 'Свой цвет',
  active,
  compact,
  align = 'left',
  sampleFallback = 'checker',
  showLabelAbove,
  onOpenChange
}: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [manualValue, setManualValue] = useState(value);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sampleColor = toHexColor(value);
  const useLabelAbove = showLabelAbove ?? Boolean(compact);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);

  useEffect(() => {
    setManualValue(value);
  }, [value]);

  function pickColor(color: string) {
    const normalized = toHexColor(color);
    if (!normalized) return;
    setManualValue(normalized);
    onRememberCustomColor(normalized);
    onChange(normalized);
  }

  return (
    <div className={`custom-color-picker ${compact ? 'compact' : ''} ${useLabelAbove ? 'label-above' : ''} align-${align}`} ref={rootRef}>
      <button
        type="button"
        className={`custom-color-trigger ${active ? 'active' : ''}`}
        onClick={() => setOpen((current) => !current)}
        title={buttonLabel}
      >
        {useLabelAbove && <span className="custom-color-label">{buttonLabel}</span>}
        <span
          className={`custom-color-sample ${!sampleColor && sampleFallback === 'checker' ? 'checker' : ''}`}
          style={sampleColor ? { backgroundColor: sampleColor } : undefined}
        />
        {!useLabelAbove && <span>{buttonLabel}</span>}
      </button>
      {open && (
        <div className="color-popover" role="dialog" aria-label={popoverLabel}>
          <div className="color-popover-field">
            <span><Pipette size={14} />{popoverLabel}</span>
            <button
              type="button"
              className="native-color-trigger"
              onClick={() => inputRef.current?.click()}
            >
              <span
                className={`native-color-preview ${!sampleColor && sampleFallback === 'checker' ? 'checker' : ''}`}
                style={sampleColor ? { backgroundColor: sampleColor } : undefined}
              />
              <strong>Выбрать цвет</strong>
            </button>
            <input
              ref={inputRef}
              className="native-color-input"
              type="color"
              value={inputColor(value)}
              onChange={(event) => pickColor(event.target.value)}
              aria-label="Выбрать цвет"
            />
          </div>
          <label className="color-popover-field">
            <span>HEX / RGB</span>
            <input
              className="color-code-input"
              value={manualValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                setManualValue(nextValue);
                const normalized = toHexColor(nextValue);
                if (normalized) pickColor(normalized);
              }}
              onBlur={() => setManualValue(inputColor(manualValue))}
              placeholder="#a385c4 или rgb(163, 133, 196)"
            />
          </label>
          <div className="recent-color-row">
            {recentCustomColors.length ? recentCustomColors.map((color) => (
              <button
                key={color}
                type="button"
                className={normalizeColor(value) === normalizeColor(color) ? 'active' : ''}
                style={{ backgroundColor: color }}
                onClick={() => pickColor(color)}
                title={color}
              />
            )) : (
              <span>Последние цвета появятся здесь</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
