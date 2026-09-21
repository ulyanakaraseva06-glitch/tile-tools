import { updateSegmentLength } from './geometry';
import type { PointMm } from '../types/project';

// Room sizing normalizes the contour to (0, 0); a zone must keep its position
// on its owning floor/wall when only one side's length is edited.
export function updateZoneSegmentLength(points: PointMm[], index: number, lengthMm: number): PointMm[] {
  if (!points[index]) return points;
  const resized = updateSegmentLength(points, index, lengthMm);
  if (resized === points) return points;
  const dx = points[index].x - resized[index].x;
  const dy = points[index].y - resized[index].y;
  return resized.map((point) => ({ x: point.x + dx, y: point.y + dy }));
}
