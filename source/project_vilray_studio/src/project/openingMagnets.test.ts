import { describe, expect, it } from 'vitest';
import { templates } from '../config/appConfig';
import type { Opening, TileProject } from '../types/project';
import {
  addFloorZone,
  addManualZone,
  addOpeningDetailed,
  addPartition,
  addRoomFromContour,
  addRoomFromTemplate,
  addRoomObject,
  connectRoomOpenings,
  constrainConnectedOpeningPosition,
  createProjectFromTemplate,
  ensureProjectDefaults,
  getConnectedAreaIds,
  getRoomMagnetMove,
  moveOpening,
  moveRoomAreaChecked,
  resizeOpening,
} from './projectFactory';

function fixture(kind: 'door' | 'passage' = 'door') {
  const project = addRoomFromTemplate(createProjectFromTemplate(templates[0], [1700, 2200]), templates[0], [1200, 1600]);
  const a = addOpeningDetailed(project, 'surface-wall-2', kind, { widthMm: 600, heightMm: 2000 });
  const b = addOpeningDetailed(a.project, 'surface-wall-room-2-4', kind, { widthMm: 600, heightMm: 2000 });
  const result = connectRoomOpenings(b.project, b.opening!.id, a.opening!.id);
  expect(result.error).toBeUndefined();
  return { project: result.project, a: a.opening!.id, b: b.opening!.id };
}

function opening(project: TileProject, id: string) { return project.room.openings!.find((item) => item.id === id)!; }
function center(project: TileProject, id: string) {
  const item = opening(project, id);
  const parts = project.surfaces.find((surface) => surface.id === item.surfaceId)!.sourceRef!.split(':');
  const points = project.room.areas!.find((area) => area.id === parts[1])!.contour;
  const start = points[Number(parts[2]) - 1];
  const end = points[Number(parts[2]) % points.length];
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  return { x: start.x + (end.x - start.x) / length * (item.xMm + item.widthMm / 2), y: start.y + (end.y - start.y) / length * (item.xMm + item.widthMm / 2) };
}
function expectAligned(project: TileProject, a: string, b: string) {
  expect(center(project, a).x).toBeCloseTo(center(project, b).x, 0);
  expect(center(project, a).y).toBeCloseTo(center(project, b).y, 0);
}

function chainFixture(count: number, kind: 'door' | 'passage' = 'door') {
  let { project, a, b } = fixture(kind);
  const joints = [[a, b]];
  for (let number = 3; number <= count; number += 1) {
    project = addRoomFromTemplate(project, templates[0], [1200, 1600]);
    const previous = addOpeningDetailed(project, `surface-wall-room-${number - 1}-2`, kind, { widthMm: 600, heightMm: 2000 });
    const next = addOpeningDetailed(previous.project, `surface-wall-room-${number}-4`, kind, { widthMm: 600, heightMm: 2000 });
    const connected = connectRoomOpenings(next.project, next.opening!.id, previous.opening!.id);
    expect(connected.error).toBeUndefined();
    project = connected.project;
    joints.push([previous.opening!.id, next.opening!.id]);
  }
  return { project, joints };
}

function expectMovedAreas(before: TileProject, after: TileProject, ids: string[], x: number, y: number) {
  for (const area of before.room.areas!) {
    expect(after.room.areas!.find((item) => item.id === area.id)!.contour).toEqual(
      area.contour.map((point) => ids.includes(area.id) ? { x: point.x + x, y: point.y + y } : point),
    );
  }
}

describe('door/passage magnets', () => {
  for (const kind of ['door', 'passage'] as const) {
    it(`${kind}: automatically flips a room when equal openings approach with the same orientation`, () => {
      const base = addRoomFromTemplate(createProjectFromTemplate(templates[0], [1700, 2200]), templates[0], [1200, 1600]);
      const first = addOpeningDetailed(base, 'surface-wall-2', kind, { widthMm: 600, heightMm: 2000 });
      const second = addOpeningDetailed(first.project, 'surface-wall-room-2-2', kind, { widthMm: 600, heightMm: 2000 });
      const before = second.project.room.areas!.find((area) => area.id === 'room-2')!.contour;
      const sourceCenter = center(second.project, second.opening!.id);
      const targetCenter = center(second.project, first.opening!.id);
      const delta = { x: targetCenter.x - sourceCenter.x, y: targetCenter.y - sourceCenter.y };

      const preview = getRoomMagnetMove(second.project, 'room-2', delta.x, delta.y);
      expect(preview.connection?.sourceId).toBe(second.opening!.id);
      expect(Math.abs(preview.rotationRad)).toBeCloseTo(Math.PI, 5);

      const result = moveRoomAreaChecked(second.project, 'room-2', delta.x, delta.y);
      expect(result.error).toBeUndefined();
      expectAligned(result.project, first.opening!.id, second.opening!.id);
      expect(opening(result.project, first.opening!.id).connectedOpeningId).toBe(second.opening!.id);
      const after = result.project.room.areas!.find((area) => area.id === 'room-2')!.contour;
      expect(after[1].x - after[0].x).toBeCloseTo(-(before[1].x - before[0].x), 5);
      expect(after[1].y - after[0].y).toBeCloseTo(-(before[1].y - before[0].y), 5);
    });
  }

  it('passage: automatically flips and joins openings on equally oriented horizontal walls', () => {
    const base = addRoomFromTemplate(createProjectFromTemplate(templates[0], [1700, 2200]), templates[0], [1200, 1600]);
    const first = addOpeningDetailed(base, 'surface-wall-1', 'passage', { widthMm: 600 });
    const second = addOpeningDetailed(first.project, 'surface-wall-room-2-1', 'passage', { widthMm: 600 });
    const sourceCenter = center(second.project, second.opening!.id);
    const targetCenter = center(second.project, first.opening!.id);
    const delta = { x: targetCenter.x - sourceCenter.x, y: targetCenter.y - sourceCenter.y };

    // A real pointer drop is rarely pixel-perfect. The magnet should capture
    // the horizontal passage while it is visibly close and finish alignment.
    const preview = getRoomMagnetMove(second.project, 'room-2', delta.x + 180, delta.y);
    expect(preview.connection?.sourceId).toBe(second.opening!.id);
    expect(Math.abs(preview.rotationRad)).toBeCloseTo(Math.PI, 5);
    const result = moveRoomAreaChecked(second.project, 'room-2', delta.x + 180, delta.y);
    expect(result.error).toBeUndefined();
    expectAligned(result.project, first.opening!.id, second.opening!.id);
    expect(opening(result.project, first.opening!.id).connectedOpeningId).toBe(second.opening!.id);
  });

  it('passage: rotates a room by a quarter turn to join a horizontal opening to a vertical one', () => {
    const base = addRoomFromTemplate(createProjectFromTemplate(templates[0], [1700, 2200]), templates[0], [1200, 1600]);
    const first = addOpeningDetailed(base, 'surface-wall-2', 'passage', { widthMm: 600 });
    const second = addOpeningDetailed(first.project, 'surface-wall-room-2-1', 'passage', { widthMm: 600 });
    const sourceCenter = center(second.project, second.opening!.id);
    const targetCenter = center(second.project, first.opening!.id);
    const delta = { x: targetCenter.x - sourceCenter.x, y: targetCenter.y - sourceCenter.y };

    const preview = getRoomMagnetMove(second.project, 'room-2', delta.x, delta.y);
    expect(preview.connection?.sourceId).toBe(second.opening!.id);
    expect(Math.abs(preview.rotationRad)).toBeCloseTo(Math.PI / 2, 5);
    const result = moveRoomAreaChecked(second.project, 'room-2', delta.x, delta.y);
    expect(result.error).toBeUndefined();
    expectAligned(result.project, first.opening!.id, second.opening!.id);
  });

  for (const kind of ['door', 'passage'] as const) {
    it(`${kind}: slides from either room, keeps both rooms static, clamps to their common wall`, () => {
      const { project, a, b } = fixture(kind);
      for (const id of [a, b]) for (const delta of [-10000, -100, 100, 10000]) {
        const result = moveOpening(project, id, opening(project, id).xMm + delta);
        expect(result.room.areas).toEqual(project.room.areas);
        expect(result.objects).toEqual(project.objects);
        expectAligned(result, a, b);
        for (const item of [opening(result, a), opening(result, b)]) {
          const surface = result.surfaces.find((s) => s.id === item.surfaceId)!;
          expect(item.xMm).toBeGreaterThanOrEqual(0);
          expect(item.xMm + item.widthMm).toBeLessThanOrEqual(surface.widthMm);
        }
        if (Math.abs(delta) === 100) expect(opening(result, id).xMm).toBe(opening(project, id).xMm + delta);
      }
    });

    it(`${kind}: stays attached for a small tug; pulling one room far enough detaches both ends`, () => {
      const { project, a, b } = fixture(kind);
      const small = moveRoomAreaChecked(project, 'room-2', 200, 0).project;
      expect(small.room.areas).toEqual(project.room.areas);
      expect(opening(small, a).connectedOpeningId).toBe(b);
      const result = moveRoomAreaChecked(project, 'room-2', 600, 0);
      expect(result.error).toBeUndefined();
      expect(result.project.room.areas![0]).toEqual(project.room.areas![0]);
      expect(result.project.room.areas![1].contour[0].x).toBe(project.room.areas![1].contour[0].x + 600);
      expect(opening(result.project, a).connectedOpeningId).toBeUndefined();
      expect(opening(result.project, b).connectedOpeningId).toBeUndefined();
      expect(getConnectedAreaIds(result.project, 'room-2').size).toBe(1);
      const restored = ensureProjectDefaults(JSON.parse(JSON.stringify(result.project)));
      expect(opening(restored, a).connectedOpeningId).toBeUndefined();
    });

    it(`${kind}: reconnects nearby matching openings without moving the stationary room`, () => {
      const { project, a, b } = fixture(kind);
      const separated = moveRoomAreaChecked(project, 'room-2', 600, 0).project;
      const far = getRoomMagnetMove(separated, 'room-2', -350, 0);
      expect(far.connection).toBeNull();
      const preview = getRoomMagnetMove(separated, 'room-2', -510, 10);
      expect(preview.connection?.sourceId).toBe(b);
      const result = moveRoomAreaChecked(separated, 'room-2', -510, 10);
      expect(result.error).toBeUndefined();
      expect(opening(result.project, a).connectedOpeningId).toBe(b);
      expect(opening(result.project, b).connectedOpeningId).toBe(a);
      expect(result.project.room.areas![0]).toEqual(project.room.areas![0]);
      expectAligned(result.project, a, b);
    });

    it(`${kind}: independently moves each opening after detaching`, () => {
      const { project, a, b } = fixture(kind);
      const separate = moveRoomAreaChecked(project, 'room-2', 600, 0).project;
      const moved = moveOpening(separate, b, opening(separate, b).xMm + 100);
      expect(opening(moved, a)).toEqual(opening(separate, a));
      expect(opening(moved, b).xMm).toBe(opening(separate, b).xMm + 100);
      expect(moved.room.areas).toEqual(separate.room.areas);
    });
  }

  it('cannot push a connected room into its neighbour and does not drop the connection on rejection', () => {
    const { project, a, b } = fixture();
    const result = moveRoomAreaChecked(project, 'room-2', -600, 0);
    expect(result.error).toContain('накладывать');
    expect(result.project.room.areas).toEqual(project.room.areas);
    expect(opening(result.project, a).connectedOpeningId).toBe(b);
  });

  it('respects another opening on the paired wall during preview and commit', () => {
    const { project, a, b } = fixture();
    const source = opening(project, a);
    const obstacle: Opening = { ...source, id: 'obstacle', connectedOpeningId: undefined, xMm: source.xMm + source.widthMm + 100, widthMm: 300 };
    const crowded = ensureProjectDefaults({ ...project, room: { ...project.room, openings: [...project.room.openings!, obstacle] } });
    const preview = constrainConnectedOpeningPosition(crowded, b, -10000);
    const moved = moveOpening(crowded, b, -10000);
    expect(opening(moved, b).xMm).toBe(preview.xMm);
    expect(opening(moved, a).xMm + source.widthMm).toBeLessThanOrEqual(obstacle.xMm);
    expectAligned(moved, a, b);
  });

  it('resizes a linked pair together without moving rooms or breaking alignment', () => {
    const { project, a, b } = fixture();
    const source = opening(project, a);
    const resized = resizeOpening(project, a, { ...source, widthMm: 700 });
    expect(opening(resized, a).widthMm).toBe(700);
    expect(opening(resized, b).widthMm).toBe(700);
    expect(resized.room.areas).toEqual(project.room.areas);
    expectAligned(resized, a, b);
  });

  it('moves windows along a separate floor wall and never magnetizes them', () => {
    const base = addRoomFromTemplate(createProjectFromTemplate(templates[0], [1700, 2200]), templates[0], [1200, 1600]);
    const a = addOpeningDetailed(base, 'surface-wall-2', 'window', { widthMm: 600, heightMm: 600 });
    const b = addOpeningDetailed(a.project, 'surface-wall-room-2-4', 'window', { widthMm: 600, heightMm: 600 });
    const moved = moveOpening(b.project, a.opening!.id, 400);
    expect(opening(moved, a.opening!.id).xMm).toBe(400);
    expect(moved.room.areas).toEqual(b.project.room.areas);
    expect(getRoomMagnetMove(moved, 'room-2', -500, 0).connection).toBeNull();
  });

  it('does not join unlike opening types or mismatched widths', () => {
    const { project, a, b } = fixture();
    const separated = moveRoomAreaChecked(project, 'room-2', 600, 0).project;
    for (const patch of [{ kind: 'passage' as const }, { widthMm: 400 }]) {
      const changed = { ...separated, room: { ...separated.room, openings: separated.room.openings!.map((item) => item.id === b ? { ...item, ...patch } : item) } };
      expect(getRoomMagnetMove(changed, 'room-2', -590, 0).connection).toBeNull();
      expect(opening(changed, a).connectedOpeningId).toBeUndefined();
    }
  });

  it('supports a slanted shared wall without changing either contour', () => {
    const primary = addRoomFromContour(createProjectFromTemplate(templates[0], [1700, 2200]), [{ x: 0, y: 0 }, { x: 1800, y: 0 }, { x: 3000, y: 900 }, { x: 0, y: 2400 }]);
    const a = addOpeningDetailed(primary, 'surface-wall-2', 'door', { widthMm: 600, heightMm: 2000 });
    const b = addOpeningDetailed(a.project, 'surface-wall-room-2-2', 'door', { widthMm: 600, heightMm: 2000 });
    const connected = connectRoomOpenings(b.project, a.opening!.id, b.opening!.id);
    expect(connected.error).toBeUndefined();
    const moved = moveOpening(connected.project, a.opening!.id, opening(connected.project, a.opening!.id).xMm + 100);
    expect(moved.room.areas).toEqual(connected.project.room.areas);
    expectAligned(moved, a.opening!.id, b.opening!.id);
  });

  it('carries objects, partitions and floor zones with the detached room, preserving tile settings', () => {
    let { project } = fixture();
    for (const area of project.room.areas!) {
      const minX = Math.min(...area.contour.map((point) => point.x));
      const minY = Math.min(...area.contour.map((point) => point.y));
      const floorId = area.id === 'room-1' ? 'surface-floor' : `surface-floor-${area.id}`;
      project = addManualZone(project, floorId, [
        { x: minX + 100, y: minY + 100 },
        { x: minX + 500, y: minY + 100 },
        { x: minX + 500, y: minY + 500 },
      ]).project;
      project = addFloorZone(project, 'rect', floorId);
      project = addRoomObject(project, { areaId: area.id, name: 'Тумба', widthMm: 200, lengthMm: 300, heightMm: 500 }).project;
      project = addPartition(project, { x: minX + 700, y: minY }, { x: minX + 700, y: minY + 600 }, area.id);
    }
    project = {
      ...project,
      surfaces: project.surfaces.map((surface) => ({
        ...surface,
        zones: surface.zones.map((zone) => ({ ...zone, layout: { ...zone.layout, turnDeg: 30, originMode: 'corner-tr', stagger: 'third' } })),
      })),
    };
    const result = moveRoomAreaChecked(project, 'room-2', 600, 300);
    expect(result.error).toBeUndefined();
    const moved = ensureProjectDefaults(JSON.parse(JSON.stringify(result.project)));
    for (const item of project.objects) {
      const dx = item.areaId === 'room-2' ? 600 : 0;
      const dy = item.areaId === 'room-2' ? 300 : 0;
      expect(moved.objects.find((other) => other.id === item.id)).toEqual({ ...item, xMm: item.xMm + dx, yMm: item.yMm + dy, initialXmm: item.initialXmm + dx, initialYmm: item.initialYmm + dy });
    }
    for (const item of project.room.partitions!) {
      const dx = item.areaId === 'room-2' ? 600 : 0;
      const dy = item.areaId === 'room-2' ? 300 : 0;
      const shift = (point: { x: number; y: number }) => ({ x: point.x + dx, y: point.y + dy });
      expect(moved.room.partitions!.find((other) => other.id === item.id)).toEqual({ ...item, start: shift(item.start), end: shift(item.end), initialStart: shift(item.initialStart!), initialEnd: shift(item.initialEnd!) });
    }
    for (const surface of project.surfaces) {
      const next = moved.surfaces.find((item) => item.id === surface.id)!;
      for (const [index, zone] of surface.zones.entries()) {
        expect(next.zones[index].layout).toEqual(zone.layout);
        expect(next.zones[index].materialId).toEqual(zone.materialId);
        if (index === 0) continue;
        const expectedShape = surface.id === 'surface-floor-room-2' && zone.shape.type === 'polygon'
          ? { type: 'polygon', points: zone.shape.points.map((point) => ({ x: point.x + 600, y: point.y + 300 })) }
          : zone.shape;
        expect(next.zones[index].shape).toEqual(expectedShape);
      }
    }
  });

  it('detaches just the selected room from a three-room chain and preserves the other connection', () => {
    const { project, a, b } = fixture();
    const third = addRoomFromTemplate(project, templates[0], [1200, 1600]);
    const c = addOpeningDetailed(third, 'surface-wall-room-2-2', 'passage', { widthMm: 600 });
    const d = addOpeningDetailed(c.project, 'surface-wall-room-3-4', 'passage', { widthMm: 600 });
    const joined = connectRoomOpenings(d.project, d.opening!.id, c.opening!.id);
    expect(joined.error).toBeUndefined();
    expect(getConnectedAreaIds(joined.project, 'room-1').size).toBe(3);
    const result = moveRoomAreaChecked(joined.project, 'room-1', -600, 0);
    expect(result.error).toBeUndefined();
    expect(result.project.room.areas!.slice(1)).toEqual(joined.project.room.areas!.slice(1));
    expect(opening(result.project, a).connectedOpeningId).toBeUndefined();
    expect(opening(result.project, b).connectedOpeningId).toBeUndefined();
    expect(opening(result.project, c.opening!.id).connectedOpeningId).toBe(d.opening!.id);
    expect(opening(result.project, d.opening!.id).connectedOpeningId).toBe(c.opening!.id);
    expect(getConnectedAreaIds(result.project, 'room-2').size).toBe(2);
    expectAligned(result.project, c.opening!.id, d.opening!.id);
  });

  for (const kind of ['door', 'passage'] as const) {
    for (const count of [3, 4]) {
      it(`${kind}: pulling room 2 away from room 1 carries the remaining ${count - 2} rooms, cutting only their first joint`, () => {
        const { project, joints } = chainFixture(count, kind);
        const movingIds = project.room.areas!.slice(1).map((area) => area.id);
        const preview = getRoomMagnetMove(project, 'room-2', 600, 0);
        expect([...preview.movingAreaIds].sort()).toEqual(movingIds);
        expect([...preview.detachedOpeningIds].sort()).toEqual([...joints[0]].sort());
        const result = moveRoomAreaChecked(project, 'room-2', 600, 0, preview.detachingOpeningId);
        expect(result.error).toBeUndefined();
        const restored = ensureProjectDefaults(JSON.parse(JSON.stringify(result.project)));
        expectMovedAreas(project, restored, movingIds, 600, 0);
        for (const [index, [a, b]] of joints.entries()) {
          expect(opening(restored, a).connectedOpeningId).toBe(index === 0 ? undefined : b);
          expect(opening(restored, b).connectedOpeningId).toBe(index === 0 ? undefined : a);
          if (index > 0) expectAligned(restored, a, b);
        }
        expect(getConnectedAreaIds(restored, 'room-2').size).toBe(count - 1);
        const pair = joints[1];
        const movedDoor = moveOpening(restored, pair[0], opening(restored, pair[0]).xMm + 100);
        expect(movedDoor.room.areas).toEqual(restored.room.areas);
        expectAligned(movedDoor, pair[0], pair[1]);
      });
    }
  }

  it('pulling the middle room the other way preserves the branch on its other side', () => {
    const { project, joints } = chainFixture(4);
    const result = moveRoomAreaChecked(project, 'room-2', -600, 0);
    expect(result.error).toBeUndefined();
    expectMovedAreas(project, result.project, ['room-1', 'room-2'], -600, 0);
    expect(opening(result.project, joints[1][0]).connectedOpeningId).toBeUndefined();
    expect(opening(result.project, joints[1][1]).connectedOpeningId).toBeUndefined();
    for (const [a, b] of [joints[0], joints[2]]) {
      expect(opening(result.project, a).connectedOpeningId).toBe(b);
      expectAligned(result.project, a, b);
    }
  });

  it('keeps the chosen joint throughout one drag even when the pointer changes direction', () => {
    const { project, joints } = chainFixture(3);
    const initial = getRoomMagnetMove(project, 'room-2', 600, 0);
    const redirected = getRoomMagnetMove(project, 'room-2', -600, 3000, initial.detachingOpeningId);
    expect(redirected.detachingOpeningId).toBe(initial.detachingOpeningId);
    expect([...redirected.movingAreaIds].sort()).toEqual(['room-2', 'room-3']);
    const result = moveRoomAreaChecked(project, 'room-2', -600, 3000, initial.detachingOpeningId);
    expect(result.error).toBeUndefined();
    expectMovedAreas(project, result.project, ['room-2', 'room-3'], -600, 3000);
    expect(opening(result.project, joints[1][0]).connectedOpeningId).toBe(joints[1][1]);
    const cancelled = moveRoomAreaChecked(project, 'room-2', 0, 0, initial.detachingOpeningId);
    expect(cancelled.project.room).toEqual(project.room);
  });

  it('rejects the whole branch move when a following room would overlap another room', () => {
    const { project } = chainFixture(3);
    const crowded = addRoomFromTemplate(project, templates[0], [1200, 1600]);
    const result = moveRoomAreaChecked(crowded, 'room-2', 600, 0);
    expect(result.error).toContain('накладывать');
    expect(result.project.room).toEqual(crowded.room);
  });

  it('carries every untouched branch of a T-shaped group, not only a straight chain', () => {
    const chain = chainFixture(3);
    const fourth = addRoomFromTemplate(chain.project, templates[0], [600, 1000]);
    const bottom = addOpeningDetailed(fourth, 'surface-wall-room-2-3', 'passage', { widthMm: 400 });
    const top = addOpeningDetailed(bottom.project, 'surface-wall-room-4-1', 'passage', { widthMm: 400 });
    const joined = connectRoomOpenings(top.project, top.opening!.id, bottom.opening!.id);
    expect(joined.error).toBeUndefined();
    const result = moveRoomAreaChecked(joined.project, 'room-2', 600, 0);
    expect(result.error).toBeUndefined();
    expectMovedAreas(joined.project, result.project, ['room-2', 'room-3', 'room-4'], 600, 0);
    expect(opening(result.project, chain.joints[0][0]).connectedOpeningId).toBeUndefined();
    for (const [a, b] of [chain.joints[1], [bottom.opening!.id, top.opening!.id]]) {
      expect(opening(result.project, a).connectedOpeningId).toBe(b);
      expectAligned(result.project, a, b);
    }
  });

  it('translates the contents of a following room together with its contour', () => {
    let { project } = chainFixture(3);
    const area = project.room.areas![2];
    const x = Math.min(...area.contour.map((point) => point.x));
    const y = Math.min(...area.contour.map((point) => point.y));
    project = addRoomObject(project, { areaId: area.id, name: 'Тумба', widthMm: 200, lengthMm: 300, heightMm: 500 }).project;
    project = addPartition(project, { x: x + 700, y }, { x: x + 700, y: y + 600 }, area.id);
    project = addManualZone(project, 'surface-floor-room-3', [{ x: x + 100, y: y + 100 }, { x: x + 500, y: y + 100 }, { x: x + 500, y: y + 500 }]).project;
    const result = moveRoomAreaChecked(project, 'room-2', 600, 0);
    expect(result.error).toBeUndefined();
    expect(result.project.objects[0].xMm).toBe(project.objects[0].xMm + 600);
    expect(result.project.objects[0].initialXmm).toBe(project.objects[0].initialXmm + 600);
    expect(result.project.room.partitions![0].start.x).toBe(project.room.partitions![0].start.x + 600);
    const before = project.surfaces.find((surface) => surface.id === 'surface-floor-room-3')!.zones[1];
    const after = result.project.surfaces.find((surface) => surface.id === 'surface-floor-room-3')!.zones[1];
    expect(before.shape.type).toBe('polygon');
    if (before.shape.type !== 'polygon') return;
    expect(after.shape).toEqual({ type: 'polygon', points: before.shape.points.map((point) => ({ x: point.x + 600, y: point.y })) });
    expect(after.layout).toEqual(before.layout);
    expect(after.materialId).toBe(before.materialId);
  });
});
