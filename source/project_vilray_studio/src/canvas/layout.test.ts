import { describe, expect, it } from 'vitest';
import { MAJOR_GRID_PX } from './scale';
import { CANVAS_GRID_TOP_PX } from './viewport';
import { calculateWallsStartY, FLOOR_TO_WALLS_GAP_PX, PLAN_BLOCK_TOP_PX, PLAN_OFFSET_Y, WALLS_BASE_Y } from './layout';

describe('canvas layout', () => {
  it('starts floor and wall blocks two major grid cells below the grid origin', () => {
    expect(PLAN_BLOCK_TOP_PX).toBe(CANVAS_GRID_TOP_PX + MAJOR_GRID_PX * 2);
    expect(PLAN_OFFSET_Y).toBe(PLAN_BLOCK_TOP_PX + 76);
    expect(WALLS_BASE_Y).toBeGreaterThan(PLAN_OFFSET_Y);
  });

  it('keeps walls at the base position for compact rooms', () => {
    expect(calculateWallsStartY(260)).toBe(WALLS_BASE_Y);
  });

  it('pushes wall frames below a resized floor plan', () => {
    const floorBottomY = 560;
    expect(calculateWallsStartY(floorBottomY)).toBe(floorBottomY + FLOOR_TO_WALLS_GAP_PX);
  });
});
