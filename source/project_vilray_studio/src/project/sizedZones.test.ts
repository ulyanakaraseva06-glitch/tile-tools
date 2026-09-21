import { describe, expect, it } from 'vitest';
import { templates } from '../config/appConfig';
import { addManualZone, addPartition, addRoomFromTemplate, addSizedZone, createProjectFromTemplate, ensureProjectDefaults, updateZonePolygonPoints } from './projectFactory';
import { getBoundingBox, segmentLength } from './geometry';
import { updateZoneSegmentLength } from './zoneGeometry';
import { parseProjectFile, serializeProjectFile } from './storage';

describe('sized zones', () => {
  const project = () => createProjectFromTemplate(templates[0], [4000, 3000]);

  it.each(['surface-floor', 'surface-wall-1'])('creates exactly the requested size only on %s', (surfaceId) => {
    const original = project();
    const result = addSizedZone(original, surfaceId, 750, 1100, 'Акцент');
    expect(result.error).toBeUndefined();
    expect(result.zone).toMatchObject({ name: 'Акцент', shape: { type: 'rect', widthMm: 750, heightMm: 1100 }, materialId: original.surfaces.find((surface) => surface.id === surfaceId)!.zones[0].materialId });
    result.project.surfaces.forEach((surface, index) => expect(surface.zones.length).toBe(original.surfaces[index].zones.length + Number(surface.id === surfaceId)));
    expect(original.surfaces.every((surface) => surface.zones.length === 1)).toBe(true);
  });

  it('works on an added room using local rectangle coordinates', () => {
    const original = addRoomFromTemplate(project(), templates[0], [1700, 2000]);
    const result = addSizedZone(original, 'surface-floor-room-2', 700, 900);
    expect(result.zone?.shape).toEqual({ type: 'rect', xMm: 500, yMm: 550, widthMm: 700, heightMm: 900 });
    expect(result.project.surfaces.find((surface) => surface.id === 'surface-floor')!.zones).toHaveLength(1);
  });

  it('works on a partition side', () => {
    const original = addPartition(project(), { x: 2000, y: 200 }, { x: 2000, y: 1800 }, 'room-1');
    const surface = original.surfaces.find((item) => item.sourceRef?.startsWith('partition:'))!;
    expect(addSizedZone(original, surface.id, 500, 600).zone?.shape).toMatchObject({ widthMm: 500, heightMm: 600 });
  });

  it('rejects invalid or oversized sizes without silently shrinking or modifying the project', () => {
    const original = project();
    for (const [width, height] of [[0, 500], [99, 500], [NaN, 500], [500.5, 500], [5000, 500], [500, 5000]]) {
      const result = addSizedZone(original, 'surface-floor', width, height);
      expect(result.error).toBeTruthy();
      expect(result.zone).toBeNull();
      expect(result.project).toBe(original);
    }
    expect(addSizedZone(original, 'missing', 500, 500).zone).toBeNull();
  });

  it('finds space inside an L-shaped floor and rejects a rectangle spanning its notch', () => {
    const original = createProjectFromTemplate(templates.find((template) => template.id === 'l-shape')!, [4000, 3000]);
    expect(addSizedZone(original, 'surface-floor', 600, 900).zone).not.toBeNull();
    expect(addSizedZone(original, 'surface-floor', 4000, 3000).zone).toBeNull();
  });

  it.each([{ x: 500, y: 400 }, { x: 6500, y: -1200 }])('keeps the draft anchor at $x/$y during numeric resizing', (anchor) => {
    const points = [{ ...anchor }, { x: anchor.x + 1000, y: anchor.y }, { x: anchor.x + 1000, y: anchor.y + 800 }, { x: anchor.x, y: anchor.y + 800 }];
    const resized = updateZoneSegmentLength(points, 0, 1600);
    expect(resized[0]).toEqual(anchor);
    expect(segmentLength(resized[0], resized[1])).toBe(1600);
    expect(getBoundingBox(resized)).toMatchObject({ minX: anchor.x, minY: anchor.y, width: 1600, height: 800 });
  });

  it('editing a manual contour preserves its identity, tile, layout and saved position', () => {
    const original = project();
    const created = addManualZone(original, 'surface-floor', [{ x: 500, y: 400 }, { x: 1500, y: 400 }, { x: 1500, y: 1200 }, { x: 500, y: 1200 }]);
    const zone = created.zone!;
    zone.layout = { ...zone.layout, turnDeg: 27, stagger: 'half' };
    const points = updateZoneSegmentLength(zone.shape.type === 'polygon' ? zone.shape.points : [], 0, 1300);
    const changed = updateZonePolygonPoints(created.project, 'surface-floor', zone.id, points);
    const restored = ensureProjectDefaults(parseProjectFile(serializeProjectFile(changed))!);
    const saved = restored.surfaces.find((surface) => surface.id === 'surface-floor')!.zones[1];
    expect(saved).toMatchObject({ id: zone.id, name: zone.name, materialId: zone.materialId, locked: zone.locked, shape: { type: 'polygon', points }, layout: { turnDeg: 27, stagger: 'half' } });
  });
});
