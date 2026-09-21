import { describe, expect, it } from 'vitest';
import { resizeZone, type ResizeDirection } from './resizeZone';

describe('resizeZone', () => {
  const initial = { x: 20, y: 30, w: 40, h: 30 };

  it.each<[ResizeDirection, number[]]>([
    ['n', [20, 35, 40, 25]], ['s', [20, 30, 40, 35]],
    ['w', [25, 30, 35, 30]], ['e', [20, 30, 45, 30]],
    ['nw', [25, 35, 35, 25]], ['ne', [20, 35, 45, 25]],
    ['sw', [25, 30, 35, 35]], ['se', [20, 30, 45, 35]]
  ])('resizes %s while keeping the opposite edges fixed', (direction, [x, y, w, h]) => {
    expect(resizeZone(initial, direction, 5, 5, 1, 1)).toEqual({ x, y, w, h });
  });

  it('stops at all page edges', () => {
    expect(resizeZone(initial, 'nw', -200, -200, 1, 1)).toEqual({ x: 0, y: 0, w: 60, h: 60 });
    expect(resizeZone(initial, 'se', 200, 200, 1, 1)).toEqual({ x: 20, y: 30, w: 80, h: 70 });
  });

  it('prevents edges crossing and preserves minimum sizes', () => {
    expect(resizeZone(initial, 'nw', 200, 200, 1, 1)).toEqual({ x: 56, y: 57, w: 4, h: 3 });
    expect(resizeZone(initial, 'se', -200, -200, 1, 1)).toEqual({ x: 20, y: 30, w: 4, h: 3 });
  });

  it('snaps only the moving edges to the grid', () => {
    expect(resizeZone(initial, 'e', 7, 80, 5, 5)).toEqual({ x: 20, y: 30, w: 45, h: 30 });
  });

  it('does not move an off-grid edge without movement on that axis', () => {
    const offGrid = { x: 21, y: 31, w: 40, h: 30 };
    expect(resizeZone(offGrid, 'nw', 0, 0, 5, 5)).toEqual(offGrid);
  });
});
