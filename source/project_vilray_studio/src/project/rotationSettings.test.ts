import { describe, expect, it } from 'vitest';
import type { TileProject } from '../types/project';
import {
  getInitialProject, updateZoneLayoutTurn, updateZoneLayoutOrigin, updateZoneLayoutPattern,
  updateZoneLayoutStagger, updateZoneLayoutOffset, updateZoneLayoutGrout,
  updateZoneTileMaterial, updateZoneCustomTileMaterial, updateZoneTileColor, ensureProjectDefaults,
} from './projectFactory';

describe('rotation with tile panel settings', () => {
  for (const type of ['floor', 'wall'] as const) for (const customZone of [false, true]) {
    it(`combines every tile setting on ${type}, custom zone: ${customZone}`, () => {
      let project = getInitialProject();
      const surface = project.surfaces.find((item) => item.type === type)!;
      if (customZone) surface.zones.push({ ...surface.zones[0], id: `${type}-custom-zone` });
      const id = surface.zones[customZone ? 1 : 0].id;
      const getLayout = (value: TileProject) => value.surfaces.find((item) => item.id === surface.id)!.zones.find((zone) => zone.id === id)!.layout;
      const untouched = project.surfaces.filter((item) => item.id !== surface.id);
      const sibling = surface.zones.filter((zone) => zone.id !== id);
      project = updateZoneLayoutTurn(project, surface.id, id, 37.5);
      project = updateZoneLayoutOrigin(project, surface.id, id, 'tile-center');
      const actions: Array<(value: TileProject) => TileProject> = [
        (p) => updateZoneTileMaterial(p, surface.id, id, { id: 'rotation-preset', label: '20×60', widthMm: 200, heightMm: 600 }),
        (p) => updateZoneCustomTileMaterial(p, surface.id, id, 250, 750),
        (p) => updateZoneTileColor(p, surface.id, id, '#AB78CD'),
        (p) => updateZoneLayoutGrout(p, surface.id, id, 3.5),
        (p) => updateZoneLayoutPattern(p, surface.id, id, 'herringbone'),
        (p) => updateZoneLayoutStagger(p, surface.id, id, 'third'),
        (p) => updateZoneLayoutOffset(p, surface.id, id, 10, -20),
        (p) => updateZoneLayoutOffset(p, surface.id, id, 0, 0),
        (p) => ensureProjectDefaults(JSON.parse(JSON.stringify(p))),
      ];
      for (const action of actions) {
        project = action(project);
        expect(getLayout(project)).toMatchObject({ turnDeg: 37.5, originMode: 'tile-center' });
        expect(project.surfaces.filter((item) => item.id !== surface.id)).toEqual(untouched);
        expect(project.surfaces.find((item) => item.id === surface.id)!.zones.filter((zone) => zone.id !== id)).toEqual(sibling);
      }
      expect(getLayout(project)).toMatchObject({ pattern: 'herringbone', stagger: 'third', groutMm: 3.5, originXmm: 0, originYmm: 0 });
      const resetTurn = updateZoneLayoutTurn(project, surface.id, id, 0);
      expect(getLayout(resetTurn)).toEqual({ ...getLayout(project), turnDeg: 0 });
    });
  }

  it('gives the same settings regardless of whether rotation or the starting point was chosen first', () => {
    const project = getInitialProject();
    const surface = project.surfaces[0];
    const zoneId = surface.zones[0].id;
    const a = updateZoneLayoutOrigin(updateZoneLayoutTurn(project, surface.id, zoneId, 50), surface.id, zoneId, 'corner-br');
    const b = updateZoneLayoutTurn(updateZoneLayoutOrigin(project, surface.id, zoneId, 'corner-br'), surface.id, zoneId, 50);
    expect(a.surfaces).toEqual(b.surfaces);
  });
});
