import type { ZoneLayout } from '../types/project';

export const resizeDirections = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
export type ResizeDirection = typeof resizeDirections[number];

export function resizeZone(initial: ZoneLayout, direction: ResizeDirection, dx: number, dy: number, stepX: number, stepY: number): ZoneLayout {
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const snap = (value: number, step: number) => Math.round(value / step) * step;
  let left = initial.x;
  let top = initial.y;
  let right = left + initial.w;
  let bottom = top + initial.h;
  const minWidth = Math.min(4, initial.w);
  const minHeight = Math.min(3, initial.h);

  if (direction.includes('w') && dx !== 0) left = clamp(snap(initial.x + dx, stepX), 0, right - minWidth);
  if (direction.includes('e') && dx !== 0) right = clamp(snap(right + dx, stepX), left + minWidth, 100);
  if (direction.includes('n') && dy !== 0) top = clamp(snap(initial.y + dy, stepY), 0, bottom - minHeight);
  if (direction.includes('s') && dy !== 0) bottom = clamp(snap(bottom + dy, stepY), top + minHeight, 100);

  return { x: left, y: top, w: right - left, h: bottom - top };
}
