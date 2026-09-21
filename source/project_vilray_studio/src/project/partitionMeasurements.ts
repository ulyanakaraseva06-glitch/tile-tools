import { getBoundingBox, isSegmentWithinContour, segmentLength, segmentsIntersect } from './geometry';
import { getFloorZoneDistanceBounds, type DistanceEdge } from './wallDistances';
import type { Partition, PointMm } from '../types/project';

type PartitionGeometry = Pick<Partition, 'start' | 'end' | 'thicknessMm'>;

export function getPartitionBounds(partition: PartitionGeometry) {
  const { start, end, thicknessMm } = partition;
  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  const normal = { x: -(end.y - start.y) / length * thicknessMm / 2, y: (end.x - start.x) / length * thicknessMm / 2 };
  // The drawn partition has flat ends: thickness extends perpendicular to its axis only.
  return getBoundingBox([start, end].flatMap((point) => [
    { x: point.x + normal.x, y: point.y + normal.y },
    { x: point.x - normal.x, y: point.y - normal.y },
  ]));
}

export function getPartitionDistances(contour: PointMm[], partition: PartitionGeometry) {
  const box = getPartitionBounds(partition);
  const walls = getFloorZoneDistanceBounds(contour, box);
  const x = (box.minX + box.maxX) / 2;
  const y = (box.minY + box.maxY) / 2;
  const span = (start: PointMm, end: PointMm, max: number) => ({ start, end, value: segmentLength(start, end), max: Math.max(0, Math.floor(max)) });
  return {
    left: span({ x: walls.minX, y }, { x: Math.max(walls.minX, box.minX), y }, walls.width - box.width),
    right: span({ x: Math.min(walls.maxX, box.maxX), y }, { x: walls.maxX, y }, walls.width - box.width),
    top: span({ x, y: walls.minY }, { x, y: Math.max(walls.minY, box.minY) }, walls.height - box.height),
    bottom: span({ x, y: Math.min(walls.maxY, box.maxY) }, { x, y: walls.maxY }, walls.height - box.height),
  };
}

export function getPartitionPositionForDistance(contour: PointMm[], partition: Partition, edge: DistanceEdge, distanceMm: number, partitions: Partition[]) {
  if (!Number.isInteger(distanceMm) || distanceMm < 0) return null;
  const box = getPartitionBounds(partition);
  const walls = getFloorZoneDistanceBounds(contour, box);
  const delta = {
    x: edge === 'left' ? walls.minX + distanceMm - box.minX : edge === 'right' ? walls.maxX - distanceMm - box.maxX : 0,
    y: edge === 'top' ? walls.minY + distanceMm - box.minY : edge === 'bottom' ? walls.maxY - distanceMm - box.maxY : 0,
  };
  const translate = (point: PointMm) => ({ x: point.x + Math.round(delta.x), y: point.y + Math.round(delta.y) });
  const position = { start: translate(partition.start), end: translate(partition.end) };
  if (!isSegmentWithinContour(contour, position.start, position.end)
    || partitions.some((other) => other.id !== partition.id && segmentsIntersect(position.start, position.end, other.start, other.end))) return null;
  // Recheck after translation: in an angled/concave room the wall along the
  // perpendicular ray may have changed. Never silently accept a different distance.
  const actual = getPartitionDistances(contour, { ...partition, ...position })[edge].value;
  return Math.abs(actual - distanceMm) <= 1 ? position : null;
}
