import { expect, it } from 'vitest';
import { arrangeMeasurementLabels } from './measurementLabels';

it('keeps every crowded label visible without overlapping other labels or the length control', () => {
  const requests = Array.from({ length: 30 }, (_, i) => ({ id: String(i), position: { x: 250 + (i % 3) * 30, y: 300 } }));
  const reserved = { x: 250, y: 320 };
  const positions = arrangeMeasurementLabels(requests, [reserved]);
  expect(positions.size).toBe(requests.length);
  const all = [reserved, ...positions.values()];
  all.forEach((a, i) => all.slice(i + 1).forEach((b) => expect(Math.abs(a.x - b.x) >= 80 || Math.abs(a.y - b.y) >= 25).toBe(true)));
  expect(arrangeMeasurementLabels(requests, [reserved])).toEqual(positions);
});

it('leaves well-spaced labels at their original measurement anchors', () => {
  const requests = [{ id: 'left', position: { x: 100, y: 100 } }, { id: 'right', position: { x: 400, y: 100 } }];
  const positions = arrangeMeasurementLabels(requests);
  requests.forEach((request) => expect(positions.get(request.id)).toEqual(request.position));
});
