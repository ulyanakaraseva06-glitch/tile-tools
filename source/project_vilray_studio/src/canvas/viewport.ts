import { MAJOR_GRID_PX } from './scale';

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 2.2;
const MAX_VIEWPORT_OFFSET = 50000;

/** The HTML toolbar is a separate block above the stage, so the grid starts at y=0. */
export const CANVAS_GRID_TOP_PX = 0;
/** Two major grid cells below the stage top — the top of the floor/walls blocks. */
export const PLAN_BLOCK_TOP_PX = MAJOR_GRID_PX * 2;

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(zoom.toFixed(2))));
}

export function panViewport(viewport: CanvasViewport, dx: number, dy: number): CanvasViewport {
  return {
    ...viewport,
    x: Math.round(viewport.x + dx),
    y: Math.round(viewport.y + dy),
  };
}

export interface ViewportContentBounds {
  bottom: number;
  right: number;
}

/** Keep a saved plan between its initial top-left position and the point at
 * which its last right/bottom content edge is visible. This permits browsing
 * a large plan up/left without ever panning beyond it into empty grid.
 * Positive Y up to the zoom inset is required so the floor block stays below
 * the toolbar instead of collapsing into it when zoomed out. */
export function constrainViewportToContent(
  viewport: CanvasViewport,
  content: ViewportContentBounds,
  canvas: { width: number; height: number },
  padding = 16,
): CanvasViewport {
  const finiteX = Number.isFinite(viewport.x) ? viewport.x : 0;
  const finiteY = Number.isFinite(viewport.y) ? viewport.y : 0;
  const minX = Math.min(0, canvas.width - padding - content.right * viewport.zoom);
  const minY = Math.min(0, canvas.height - padding - content.bottom * viewport.zoom);
  const maxY = getZoomTopInset(viewport.zoom);
  return {
    ...viewport,
    x: Math.round(Math.max(minX, Math.min(0, finiteX))),
    y: Math.round(Math.max(minY, Math.min(maxY, finiteY))),
  };
}

export function resetViewport(): CanvasViewport {
  return { x: 0, y: 0, zoom: 1 };
}

/** Keep panning finite without forbidding positive offsets.
 * Large rooms may extend above/left of the plan origin and require them. */
export function constrainViewport(viewport: CanvasViewport): CanvasViewport {
  const clampOffset = (value: number) => Math.max(0, Math.min(MAX_VIEWPORT_OFFSET, Number.isFinite(value) ? value : 0));
  return { ...viewport, x: clampOffset(viewport.x), y: clampOffset(viewport.y) };
}

/** Pan anywhere: the grid fills the stage, so empty space is valid on every side. */
export function constrainFreeViewport(viewport: CanvasViewport): CanvasViewport {
  const clampOffset = (value: number) => {
    const finite = Number.isFinite(value) ? value : 0;
    return Math.round(Math.max(-MAX_VIEWPORT_OFFSET, Math.min(MAX_VIEWPORT_OFFSET, finite)));
  };
  return { ...viewport, x: clampOffset(viewport.x), y: clampOffset(viewport.y) };
}

export function getZoomTopInset(zoom: number): number {
  return Math.max(0, Math.round(PLAN_BLOCK_TOP_PX - PLAN_BLOCK_TOP_PX * clampZoom(zoom)));
}

/** Zoom around the floor-block top so the plan stays two grid cells below the
 * toolbar instead of collapsing into it at low zoom. */
export function changeCanvasZoom(viewport: CanvasViewport, nextZoomValue: number): CanvasViewport {
  const nextZoom = clampZoom(nextZoomValue);
  const originY = PLAN_BLOCK_TOP_PX;
  const scale = nextZoom / viewport.zoom;
  return {
    ...viewport,
    zoom: nextZoom,
    y: Math.round(originY - (originY - viewport.y) * scale),
  };
}
