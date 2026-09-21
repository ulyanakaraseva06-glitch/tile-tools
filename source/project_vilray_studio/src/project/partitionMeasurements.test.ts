import { describe, expect, it } from 'vitest';
import { templates } from '../config/appConfig';
import type { Partition } from '../types/project';
import { segmentLength } from './geometry';
import { getPartitionBounds, getPartitionDistances, getPartitionPositionForDistance } from './partitionMeasurements';
import { addPartition, createProjectFromTemplate, ensureProjectDefaults, movePartition } from './projectFactory';
import { parseProjectFile, serializeProjectFile } from './storage';
import type { DistanceEdge } from './wallDistances';

const contour = [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }];
const partition: Partition = { id: 'p', areaId: 'room-1', name: 'Перегородка', start: { x: 1500, y: 800 }, end: { x: 1500, y: 2000 }, thicknessMm: 100, heightMm: 2500 };

describe('partition clearances', () => {
  it('measures from the physical sides and flat ends, including zero clearance', () => {
    expect(getPartitionBounds(partition)).toEqual({ minX: 1450, maxX: 1550, minY: 800, maxY: 2000, width: 100, height: 1200 });
    expect(Object.values(getPartitionDistances(contour, partition)).map((metric) => metric.value)).toEqual([1450, 2450, 800, 1000]);
    const full = { ...partition, start: { x: 1500, y: 0 }, end: { x: 1500, y: 3000 } };
    expect(getPartitionDistances(contour, full).top.value).toBe(0);
    expect(getPartitionDistances(contour, full).bottom.value).toBe(0);
  });

  for (const edge of ['left', 'right', 'top', 'bottom'] as DistanceEdge[]) {
    for (const distance of [0, 350]) {
      it(`sets ${edge} to ${distance} mm without changing length/direction`, () => {
        const position = getPartitionPositionForDistance(contour, partition, edge, distance, [partition]);
        expect(position).not.toBeNull();
        const moved = { ...partition, ...position! };
        expect(getPartitionDistances(contour, moved)[edge].value).toBe(distance);
        expect(segmentLength(moved.start, moved.end)).toBe(1200);
        expect(moved.end.x - moved.start.x).toBe(0);
      });
    }
  }

  it('measures and moves a diagonal partition without changing its angle', () => {
    const diagonal = { ...partition, end: { x: 2400, y: 1700 } };
    const box = getPartitionBounds(diagonal);
    expect(box.minX).toBeCloseTo(1500 - 50 / Math.sqrt(2));
    const position = getPartitionPositionForDistance(contour, diagonal, 'right', 200, [diagonal])!;
    expect(position).not.toBeNull();
    expect(getPartitionDistances(contour, { ...diagonal, ...position }).right.value).toBe(200);
    expect(position.end.x - position.start.x).toBe(900);
    expect(position.end.y - position.start.y).toBe(900);
  });

  it('uses the actual nearby wall in a concave room', () => {
    const notched = [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 1000 }, { x: 2000, y: 1000 }, { x: 2000, y: 3000 }, { x: 0, y: 3000 }];
    const inNiche = { ...partition, start: { x: 1500, y: 1300 } };
    expect(getPartitionDistances(notched, inNiche).right.value).toBe(450);
    expect(getPartitionPositionForDistance(notched, inNiche, 'left', 2300, [inNiche])).toBeNull();
    const moved = getPartitionPositionForDistance(notched, inNiche, 'right', 100, [inNiche])!;
    expect(getPartitionDistances(notched, { ...inNiche, ...moved }).right.value).toBe(100);
  });

  it('rejects invalid values, crossing room walls and crossing another partition', () => {
    for (const value of [-1, 0.5, NaN, Infinity, 5000]) expect(getPartitionPositionForDistance(contour, partition, 'left', value, [partition])).toBeNull();
    const other = { ...partition, id: 'other', start: { x: 2000, y: 1400 }, end: { x: 3500, y: 1400 } };
    expect(getPartitionPositionForDistance(contour, partition, 'left', 2450, [partition, other])).toBeNull();
  });

  it('persists an edited clearance through project save/load and surface regeneration', () => {
    const project = addPartition(createProjectFromTemplate(templates[0], [4000, 3000]), partition.start, partition.end, 'room-1');
    const savedPartition = project.room.partitions![0];
    const position = getPartitionPositionForDistance(contour, savedPartition, 'bottom', 600, project.room.partitions!)!;
    const changed = movePartition(project, savedPartition.id, position.start, position.end);
    const restored = ensureProjectDefaults(parseProjectFile(serializeProjectFile(changed))!);
    expect(restored.room.partitions![0]).toMatchObject(position);
    expect(getPartitionDistances(contour, restored.room.partitions![0]).bottom.value).toBe(600);
    expect(restored.surfaces.filter((surface) => surface.sourceRef?.startsWith(`partition:${savedPartition.id}:`))).toHaveLength(2);
  });
});
