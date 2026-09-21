import { getBoundingBox } from './geometry';
import type { PointMm } from '../types/project';

export type DistanceEdge = 'left' | 'right' | 'top' | 'bottom';
export type MeasurementBounds = ReturnType<typeof getBoundingBox>;

// Intersect the actual contour, not its bounding rectangle (important for niches).
export function getFloorZoneDistanceBounds(contour: PointMm[], bounds: MeasurementBounds): MeasurementBounds {
  const contourBounds = getBoundingBox(contour);
  const horizontal = getPolygonLineIntersections(contour, (bounds.minY + bounds.maxY) / 2, 'horizontal');
  const vertical = getPolygonLineIntersections(contour, (bounds.minX + bounds.maxX) / 2, 'vertical');
  const minX = horizontal.filter((value) => value <= bounds.minX).at(-1) ?? contourBounds.minX;
  const maxX = horizontal.find((value) => value >= bounds.maxX) ?? contourBounds.maxX;
  const minY = vertical.filter((value) => value <= bounds.minY).at(-1) ?? contourBounds.minY;
  const maxY = vertical.find((value) => value >= bounds.maxY) ?? contourBounds.maxY;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function getPolygonLineIntersections(contour: PointMm[], coordinate: number, orientation: 'horizontal' | 'vertical'): number[] {
  const values = contour.flatMap((start, index) => {
    const end = contour[(index + 1) % contour.length];
    const startAcross = orientation === 'horizontal' ? start.y : start.x;
    const endAcross = orientation === 'horizontal' ? end.y : end.x;
    if (startAcross === endAcross || coordinate < Math.min(startAcross, endAcross) || coordinate > Math.max(startAcross, endAcross)) return [];
    const ratio = (coordinate - startAcross) / (endAcross - startAcross);
    return [orientation === 'horizontal' ? start.x + (end.x - start.x) * ratio : start.y + (end.y - start.y) * ratio];
  });
  return [...new Set(values.map((value) => Math.round(value * 1000) / 1000))].sort((a, b) => a - b);
}
