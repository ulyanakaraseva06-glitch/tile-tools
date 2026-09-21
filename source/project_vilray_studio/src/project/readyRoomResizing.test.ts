import { describe, expect, it } from 'vitest';
import { templates } from '../config/appConfig';
import { getBoundingBox, segmentLength, validateContour } from './geometry';
import {
  addRoomFromContour,
  addRoomFromTemplate,
  confirmRoomAreaDimensions,
  createProjectFromTemplate,
  ensureProjectDefaults,
  moveRoomAreaWall,
  previewRoomAreaWall,
} from './projectFactory';

describe('ready room wall drag direction', () => {
  for (const template of templates.filter((item) => item.id !== 'custom')) {
    for (const additional of [false, true]) {
      it(`${template.id}: every wall follows positive and negative drags in ${additional ? 'an added' : 'the first'} room`, () => {
        const project = additional
          ? addRoomFromTemplate(createProjectFromTemplate(templates[0]), template)
          : createProjectFromTemplate(template);
        const area = project.room.areas![additional ? 1 : 0];
        const oldBox = getBoundingBox(area.contour);
        for (let index = 0; index < area.contour.length; index += 1) {
          const nextIndex = (index + 1) % area.contour.length;
          const axis = area.contour[index].x === area.contour[nextIndex].x ? 'x' : 'y';
          for (const delta of [-100, 100]) {
            const preview = previewRoomAreaWall(area, index, delta);
            expect(preview[index][axis]).toBe(area.contour[index][axis] + delta);
            expect(preview[nextIndex][axis]).toBe(area.contour[nextIndex][axis] + delta);
            expect(validateContour(preview).ok).toBe(true);
            if (template.id === 'square') {
              const box = getBoundingBox(preview);
              expect(box.width).toBe(box.height);
              const oppositeIndex = (index + 2) % area.contour.length;
              expect(preview[oppositeIndex][axis]).toBe(area.contour[oppositeIndex][axis]);
              expect(axis === 'x' ? box.minY + box.maxY : box.minX + box.maxX)
                .toBe(axis === 'x' ? oldBox.minY + oldBox.maxY : oldBox.minX + oldBox.maxX);
            } else {
              expect(preview).toEqual(area.contour.map((point, i) => i === index || i === nextIndex ? { ...point, [axis]: point[axis] + delta } : point));
            }
            const moved = moveRoomAreaWall(project, area.id, index, delta);
            expect(moved.room.areas!.find((item) => item.id === area.id)!.contour).toEqual(preview);
            if (additional) expect(moved.room.areas![0]).toEqual(project.room.areas![0]);
            const lengths = preview.map((point, i) => segmentLength(point, preview[(i + 1) % preview.length]));
            const saved = confirmRoomAreaDimensions(moved, area.id, lengths);
            expect(saved.error).toBeUndefined();
            const restored = ensureProjectDefaults(JSON.parse(JSON.stringify(saved.project)));
            expect(restored.room.areas!.find((item) => item.id === area.id)).toMatchObject({ contour: preview, shapeLocked: true });
          }
        }
      });
    }
  }

  it('expands into negative plan coordinates and restores the original shape with reverse drags', () => {
    const project = createProjectFromTemplate(templates[0], [1700, 2000]);
    const drags = [[0, -500], [3, -400], [1, 300], [2, 200]];
    let edited = project;
    for (const [index, delta] of drags) edited = moveRoomAreaWall(edited, 'room-1', index, delta);
    expect(getBoundingBox(edited.room.contour)).toMatchObject({ minX: -400, minY: -500, maxX: 2000, maxY: 2200 });
    for (const [index, delta] of [...drags].reverse()) edited = moveRoomAreaWall(edited, 'room-1', index, -delta);
    expect(edited.room.contour).toEqual(project.room.contour);
  });

  it('keeps the edited dimensions when an additional-room draft is saved into the plan', () => {
    const existing = createProjectFromTemplate(templates[0], [1700, 2000]);
    let draft = createProjectFromTemplate(templates[0], [1700, 2000]);
    draft = moveRoomAreaWall(draft, 'room-1', 0, -500);
    draft = moveRoomAreaWall(draft, 'room-1', 3, -400);
    const contour = draft.room.contour;
    const saved = confirmRoomAreaDimensions(draft, 'room-1', contour.map((point, index) => segmentLength(point, contour[(index + 1) % contour.length])));
    const appended = addRoomFromContour(existing, saved.project.room.contour, true, 'rectangle');
    expect(appended.room.areas![0]).toEqual(existing.room.areas![0]);
    expect(getBoundingBox(appended.room.areas![1].contour)).toMatchObject({ width: 2100, height: 2500 });
    expect(appended.room.areas![1].shapeLocked).toBe(true);
  });

  it('does not invert a rectangle or a square when dragged across its opposite wall', () => {
    for (const template of [templates[0], templates[1]]) {
      const project = createProjectFromTemplate(template, [1500, 1500]);
      for (const [index, delta] of [[0, 1600], [3, 1600], [1, -1600], [2, -1600]]) {
        expect(moveRoomAreaWall(project, 'room-1', index, delta).room.contour).toEqual(project.room.contour);
      }
    }
  });

  it('still rejects stretching an added room into a neighbouring room', () => {
    const project = addRoomFromTemplate(createProjectFromTemplate(templates[0]), templates[0]);
    const edited = moveRoomAreaWall(project, 'room-2', 3, -700);
    expect(edited.room.areas).toEqual(project.room.areas);
  });
});
