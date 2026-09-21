import { describe, expect, it } from 'vitest';
import { frameRoomEditor, frameSavedRoom } from './roomEditorViewport';
import { resetViewport } from './viewport';

const room = { minX: 170, minY: 160, maxX: 306, maxY: 320 };
const desktop = { width: 900, height: 640 };

describe('ready room editor framing', () => {
  it('starts the room lower down with space for pulling the top wall upwards', () => {
    const view = frameRoomEditor(resetViewport(), room, desktop, true);
    expect(view.y + room.minY * view.zoom).toBe(220);
    expect(view.x).toBe(0);
    expect(view.zoom).toBe(1);
  });

  it('allows upward stretching within the spare space without moving the camera', () => {
    const view = frameRoomEditor(resetViewport(), room, desktop, true);
    expect(frameRoomEditor(view, { ...room, minY: 90 }, desktop)).toBe(view);
  });

  it('moves the whole view down after the top edge would disappear under the toolbar', () => {
    const view = frameRoomEditor(resetViewport(), room, desktop, true);
    const enlarged = { ...room, minY: 10 };
    const framed = frameRoomEditor(view, enlarged, desktop);
    expect(framed.y).toBeGreaterThan(view.y);
    expect(framed.y + enlarged.minY * framed.zoom).toBe(220);
    expect(framed.y + enlarged.maxY * framed.zoom).toBeLessThanOrEqual(desktop.height - 52);
    expect(framed.zoom).toBe(view.zoom);
  });

  it('keeps negative coordinates and left dimension labels in view at 52% zoom', () => {
    const enlarged = { minX: -80, minY: -45, maxX: 360, maxY: 520 };
    const view = frameRoomEditor({ x: 0, y: 38, zoom: 0.52 }, enlarged, desktop);
    expect(view.x + enlarged.minX * view.zoom).toBeGreaterThanOrEqual(100);
    expect(view.y + enlarged.minY * view.zoom).toBe(220);
    expect(view.zoom).toBe(0.52);
  });

  it.each([{ width: 780, height: 630 }, { width: 1360, height: 450 }, { width: 400, height: 420 }])('fits large rooms and their labels into a $width by $height workspace', (size) => {
    const enlarged = { minX: -700, minY: -800, maxX: 650, maxY: 700 };
    const view = frameRoomEditor(resetViewport(), enlarged, size, true);
    expect(view.zoom).toBeGreaterThan(0);
    expect(view.zoom).toBeLessThan(1);
    expect(view.x + enlarged.minX * view.zoom).toBeGreaterThanOrEqual(Math.min(100, size.width * 0.16) - 0.01);
    expect(view.y + enlarged.minY * view.zoom).toBeGreaterThanOrEqual(Math.min(120, size.height * 0.25) - 0.01);
    expect(view.x + enlarged.maxX * view.zoom).toBeLessThanOrEqual(size.width - Math.min(270, size.width * 0.35) + 0.01);
    expect(view.y + enlarged.maxY * view.zoom).toBeLessThanOrEqual(size.height - Math.min(52, size.height * 0.12) + 0.01);
    expect(frameRoomEditor(view, enlarged, size)).toBe(view);
  });

  it('does not change room coordinates or repeatedly shift an already visible room', () => {
    const before = { ...room };
    const view = frameRoomEditor(resetViewport(), room, desktop, true);
    expect(frameRoomEditor(view, room, desktop)).toBe(view);
    expect(room).toEqual(before);
  });

  it('does not calculate a frame before the container has a valid size', () => {
    const view = resetViewport();
    expect(frameRoomEditor(view, room, { width: 0, height: 0 })).toBe(view);
  });

  it('restores a fully visible floor after saving a large room from a displaced editor view', () => {
    const largeRoom = { minX: -240, minY: -680, maxX: 980, maxY: 1050 };
    const view = frameSavedRoom(largeRoom, { width: 1360, height: 820 });
    expect(view.x + largeRoom.minX * view.zoom).toBeGreaterThanOrEqual(99.99);
    expect(view.y + largeRoom.minY * view.zoom).toBeGreaterThanOrEqual(119.99);
    expect(view.x + largeRoom.maxX * view.zoom).toBeLessThanOrEqual(1090);
    expect(view.y + largeRoom.maxY * view.zoom).toBeLessThanOrEqual(768);
    expect(view.zoom).toBeLessThan(1);
  });
});
