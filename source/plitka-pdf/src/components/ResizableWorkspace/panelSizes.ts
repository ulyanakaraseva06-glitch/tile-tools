export type PanelSizes = { left: number; right: number };
export const panelMinimums: PanelSizes = { left: 180, right: 220 };
export const defaultPanelSizes: PanelSizes = { left: 260, right: 300 };
export const centerMinimum = 400;

export function fitPanelSizes(sizes: PanelSizes, width: number): PanelSizes {
  const available = Math.max(400, width - centerMinimum);
  let left = Math.max(panelMinimums.left, Math.min(480, sizes.left));
  let right = Math.max(panelMinimums.right, Math.min(480, sizes.right));
  const excess = left + right - available;
  if (excess > 0) {
    const leftRoom = left - panelMinimums.left;
    const rightRoom = right - panelMinimums.right;
    const room = leftRoom + rightRoom;
    if (room > 0) {
      left -= excess * leftRoom / room;
      right -= excess * rightRoom / room;
    }
  }
  return { left, right };
}
