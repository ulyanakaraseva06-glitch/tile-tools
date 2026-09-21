import { PLAN_BLOCK_TOP_PX } from './viewport';

/** Padding from the floor section top to the room contour, for the «Пол» title. */
export const FLOOR_TITLE_GAP_PX = 76;
export { PLAN_BLOCK_TOP_PX };
export const PLAN_OFFSET_Y = PLAN_BLOCK_TOP_PX + FLOOR_TITLE_GAP_PX;
/** Keep the walls section the same distance below the floor origin as before the two-cell shift. */
export const WALLS_BASE_Y = PLAN_OFFSET_Y + 190;
export const FLOOR_TO_WALLS_GAP_PX = 118;

export function calculateWallsStartY(floorBottomY: number, baseY = WALLS_BASE_Y, gapPx = FLOOR_TO_WALLS_GAP_PX): number {
  return Math.max(baseY, Math.ceil(floorBottomY + gapPx));
}
