import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResizableWorkspace } from './ResizableWorkspace';
import { fitPanelSizes } from './panelSizes';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200);
  const getStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    const style = getStyle(element);
    return { paddingLeft: '12px', paddingRight: '12px', getPropertyValue: style.getPropertyValue.bind(style) } as CSSStyleDeclaration;
  });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('resizable workspace', () => {
  const workspace = <ResizableWorkspace><aside>Библиотека</aside><section>Страница</section><aside>Настройки</aside></ResizableWorkspace>;

  it('allows independent keyboard resizing, persists widths and resets them', () => {
    render(workspace);
    const left = screen.getByRole('separator', { name: 'Ширина библиотеки страниц' });
    const right = screen.getByRole('separator', { name: 'Ширина панели настроек' });
    fireEvent.keyDown(left, { key: 'ArrowRight' });
    expect(left).toHaveAttribute('aria-valuenow', '270');
    expect(right).toHaveAttribute('aria-valuenow', '300');
    fireEvent.keyDown(right, { key: 'ArrowLeft' });
    expect(right).toHaveAttribute('aria-valuenow', '310');
    expect(JSON.parse(localStorage.getItem('plitka_workspace_panel_sizes')!)).toEqual({ left: 270, right: 310 });
    fireEvent.doubleClick(left);
    expect(left).toHaveAttribute('aria-valuenow', '260');
  });

  it('restores saved widths and enforces minimum and maximum widths', () => {
    localStorage.setItem('plitka_workspace_panel_sizes', JSON.stringify({ left: 240, right: 280 }));
    render(workspace);
    const left = screen.getByRole('separator', { name: 'Ширина библиотеки страниц' });
    expect(left).toHaveAttribute('aria-valuenow', '240');
    fireEvent.keyDown(left, { key: 'Home' });
    expect(left).toHaveAttribute('aria-valuenow', '180');
    fireEvent.keyDown(left, { key: 'End' });
    expect(left).toHaveAttribute('aria-valuenow', '472');
  });

  it('reserves space for the page when the window narrows', () => {
    const sizes = fitPanelSizes({ left: 480, right: 480 }, 900);
    expect(sizes.left + sizes.right).toBeCloseTo(500);
    expect(sizes.left).toBeGreaterThanOrEqual(180);
    expect(sizes.right).toBeGreaterThanOrEqual(220);
    expect(fitPanelSizes(sizes, 800)).toEqual({ left: 180, right: 220 });
  });
});
