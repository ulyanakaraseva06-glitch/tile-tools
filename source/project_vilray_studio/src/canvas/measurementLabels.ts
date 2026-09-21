import type { PointMm } from '../types/project';

export type LabelRequest = { id: string; position: PointMm };
const candidateOffsets = Array.from({ length: 17 }, (_, i) => i - 8).flatMap((x) =>
  Array.from({ length: 17 }, (_, i) => i - 8).map((y) => ({ x: x * 20, y: y * 24 })),
).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));

// Keep all values readable when several objects share the same measurement line.
// Coordinates are in canvas pixels, so the label footprint matches the drawing.
export function arrangeMeasurementLabels(requests: LabelRequest[], reserved: PointMm[] = []): Map<string, PointMm> {
  const occupied = [...reserved];
  const result = new Map<string, PointMm>();
  for (const request of requests) {
    const free = (position: PointMm) => occupied.every((other) => Math.abs(other.x - position.x) >= 80 || Math.abs(other.y - position.y) >= 25);
    let position: PointMm | undefined;
    for (const offset of candidateOffsets) {
      const candidate = { x: request.position.x + offset.x, y: request.position.y + offset.y };
      if (free(candidate)) { position = candidate; break; }
    }
    // Extremely dense plans still get a separate label, rather than hiding it.
    if (!position) {
      position = { ...request.position };
      while (!free(position)) position.y += 25;
    }
    result.set(request.id, position);
    occupied.push(position);
  }
  return result;
}
