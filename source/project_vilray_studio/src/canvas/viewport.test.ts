import { describe, expect, it } from 'vitest';
import { CANVAS_GRID_TOP_PX, changeCanvasZoom, clampZoom, constrainFreeViewport, constrainViewport, constrainViewportToContent, getZoomTopInset, panViewport, PLAN_BLOCK_TOP_PX, resetViewport } from './viewport';

describe('canvas viewport', () => {
  it('clamps zoom to supported limits', () => {
    expect(clampZoom(0.1)).toBe(0.35);
    expect(clampZoom(3)).toBe(2.2);
    expect(clampZoom(1.234)).toBe(1.23);
  });

  it('pans viewport by rounded deltas', () => {
    expect(panViewport({ x: 10, y: 20, zoom: 1 }, 4.4, -6.7)).toEqual({ x: 14, y: 13, zoom: 1 });
  });

  it('lets a large saved plan move up and left only until its last content edge', () => {
    const content = { right: 1400, bottom: 1200 };
    const canvas = { width: 800, height: 600 };
    expect(constrainViewportToContent({ x: -250, y: -300, zoom: 1 }, content, canvas)).toEqual({ x: -250, y: -300, zoom: 1 });
    expect(constrainViewportToContent({ x: -5000, y: -5000, zoom: 1 }, content, canvas)).toEqual({ x: -616, y: -616, zoom: 1 });
    expect(constrainViewportToContent({ x: 200, y: 150, zoom: 1 }, content, canvas)).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('locks a saved plan that already fits without exposing empty grid', () => {
    expect(constrainViewportToContent(
      { x: -100, y: -100, zoom: 1 },
      { right: 600, bottom: 400 },
      { width: 800, height: 600 },
    )).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('resets viewport to fit state', () => {
    expect(resetViewport()).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('preserves positive offsets needed by rooms stretched above or left of the origin', () => {
    expect(constrainViewport({ x: 240, y: 180, zoom: 0.76 })).toEqual({ x: 240, y: 180, zoom: 0.76 });
    expect(constrainViewport({ x: Infinity, y: -Infinity, zoom: 1 })).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('does not allow the saved canvas to move beyond its top or left edge', () => {
    expect(constrainViewport({ x: -120, y: -80, zoom: 1 })).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(constrainViewport(panViewport({ x: 40, y: 60, zoom: 1 }, -100, -100))).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(constrainViewport(panViewport({ x: 0, y: 0, zoom: 1 }, 100, 140))).toEqual({ x: 100, y: 140, zoom: 1 });
  });

  it('lets the workspace pan in every direction', () => {
    expect(constrainFreeViewport({ x: 180, y: 140, zoom: 1 })).toEqual({ x: 180, y: 140, zoom: 1 });
    expect(constrainFreeViewport({ x: -180, y: -140, zoom: 1 })).toEqual({ x: -180, y: -140, zoom: 1 });
    expect(constrainFreeViewport({ x: Infinity, y: -Infinity, zoom: 1 })).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('keeps the top grid inset a constant screen band while zooming', () => {
    expect(CANVAS_GRID_TOP_PX).toBe(0);
    expect(PLAN_BLOCK_TOP_PX).toBe(160);
    expect(getZoomTopInset(1)).toBe(0);
    expect(getZoomTopInset(0.5)).toBe(80);
    expect(changeCanvasZoom({ x: 0, y: 0, zoom: 1 }, 0.5)).toEqual({ x: 0, y: 80, zoom: 0.5 });
    expect(changeCanvasZoom({ x: 0, y: 80, zoom: 0.5 }, 1)).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('keeps the floor block below the toolbar at minimum zoom', () => {
    const content = { right: 1400, bottom: 1200 };
    const canvas = { width: 800, height: 600 };
    const zoomed = changeCanvasZoom({ x: 0, y: 0, zoom: 1 }, 0.35);
    expect(zoomed.y + PLAN_BLOCK_TOP_PX * zoomed.zoom).toBe(PLAN_BLOCK_TOP_PX);
    expect(constrainViewportToContent(zoomed, content, canvas)).toEqual(zoomed);
    expect(constrainViewportToContent({ ...zoomed, y: 4000 }, content, canvas).y).toBe(getZoomTopInset(0.35));
  });
});
