import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { centerMinimum, defaultPanelSizes, fitPanelSizes, panelMinimums, type PanelSizes } from './panelSizes';
import './resizable-workspace.css';

const storageKey = 'plitka_workspace_panel_sizes';

function loadSizes(): PanelSizes {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (value && typeof value.left === 'number' && typeof value.right === 'number'
      && Number.isFinite(value.left) && Number.isFinite(value.right)) {
      return fitPanelSizes(value, 2000);
    }
  } catch { /* Storage may be unavailable. */ }
  return defaultPanelSizes;
}

export function ResizableWorkspace({ children }: { children: ReactNode }) {
  const container = useRef<HTMLElement>(null);
  const drag = useRef<{ side: keyof PanelSizes; startX: number; sizes: PanelSizes } | null>(null);
  const [sizes, setSizes] = useState(loadSizes);
  const [width, setWidth] = useState(1200);
  const [dragging, setDragging] = useState(false);
  const fitted = fitPanelSizes(sizes, width);
  const panels = Children.toArray(children);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      setWidth(element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 24);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (dragging) return;
    try { localStorage.setItem(storageKey, JSON.stringify(sizes)); } catch { /* Keep resizing available without storage. */ }
  }, [sizes, dragging]);

  function maximum(side: keyof PanelSizes, current = fitted) {
    const other = side === 'left' ? 'right' : 'left';
    return Math.max(panelMinimums[side], Math.min(480, width - centerMinimum - current[other]));
  }

  function change(side: keyof PanelSizes, value: number, current = fitted) {
    setSizes({ ...current, [side]: Math.max(panelMinimums[side], Math.min(maximum(side, current), value)) });
  }

  function separator(side: keyof PanelSizes) {
    const label = side === 'left' ? 'Ширина библиотеки страниц' : 'Ширина панели настроек';
    return (
      <div
        className="workspace-resizer"
        role="separator"
        tabIndex={0}
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemin={panelMinimums[side]}
        aria-valuemax={Math.round(maximum(side))}
        aria-valuenow={Math.round(fitted[side])}
        aria-valuetext={`${Math.round(fitted[side])} пикселей`}
        title="Потяните для изменения ширины. Двойной щелчок — вернуть исходную ширину"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { side, startX: event.clientX, sizes: fitted };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const active = drag.current;
          if (!active || active.side !== side) return;
          const delta = (event.clientX - active.startX) * (side === 'left' ? 1 : -1);
          change(side, active.sizes[side] + delta, active.sizes);
        }}
        onPointerUp={(event) => {
          drag.current = null;
          setDragging(false);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
        onPointerCancel={() => { drag.current = null; setDragging(false); }}
        onDoubleClick={() => change(side, defaultPanelSizes[side])}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(event.key)) return;
          event.preventDefault();
          if (event.key === 'Home') change(side, panelMinimums[side]);
          else if (event.key === 'End') change(side, maximum(side));
          else if (event.key === 'Enter') change(side, defaultPanelSizes[side]);
          else change(side, fitted[side] + (event.key === 'ArrowRight' ? 1 : -1) * (side === 'left' ? 1 : -1) * (event.shiftKey ? 40 : 10));
        }}
      />
    );
  }

  return (
    <main
      ref={container}
      className={`workspace resizable-workspace${dragging ? ' is-resizing' : ''}`}
      style={{ gridTemplateColumns: `${fitted.left}px 12px minmax(${centerMinimum}px, 1fr) 12px ${fitted.right}px` }}
    >
      {panels[0]}
      {separator('left')}
      {panels[1]}
      {separator('right')}
      {panels[2]}
    </main>
  );
}
