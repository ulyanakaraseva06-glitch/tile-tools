import { resetViewport, type CanvasViewport } from './viewport';

interface CanvasBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Frame the ready-room editor without changing the room's real coordinates or dimensions. */
export function frameRoomEditor(
  viewport: CanvasViewport,
  bounds: CanvasBounds,
  size: { width: number; height: number },
  initial = false,
): CanvasViewport {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  if (size.width <= 0 || size.height <= 0 || width <= 0 || height <= 0) return viewport;

  // Room dimensions need space above/left; the save card occupies the right-hand side.
  const left = Math.min(100, size.width * 0.16);
  const right = size.width - Math.min(270, size.width * 0.35);
  const top = Math.min(120, size.height * 0.25);
  const bottom = size.height - Math.min(52, size.height * 0.12);
  const preferredTop = Math.max(top, Math.min(220, size.height * 0.36));
  const zoom = Math.min(viewport.zoom, (right - left) / width, (bottom - top) / height);
  const screenTop = viewport.y + bounds.minY * zoom;
  const lastTop = bottom - height * zoom;
  const nextTop = initial || screenTop < top
    ? Math.min(preferredTop, lastTop)
    : Math.min(screenTop, lastTop);
  const screenLeft = viewport.x + bounds.minX * zoom;
  const nextLeft = Math.max(left, Math.min(screenLeft, right - width * zoom));
  const next = { x: nextLeft - bounds.minX * zoom, y: nextTop - bounds.minY * zoom, zoom };
  // Avoid subpixel rounding feedback when the fitted edge is exactly on the safe boundary.
  return Math.abs(next.x - viewport.x) < 0.01 && Math.abs(next.y - viewport.y) < 0.01 && Math.abs(next.zoom - viewport.zoom) < 1e-8
    ? viewport
    : next;
}

/** Return the stable normal-workspace view after the temporary size editor closes. */
export function frameSavedRoom(bounds: CanvasBounds, size: { width: number; height: number }): CanvasViewport {
  return frameRoomEditor(resetViewport(), bounds, size, true);
}
