import { describe, expect, it } from 'vitest';
import type { LayoutSettings } from '../types/project';
import { generateRectLayout, generatePolygonLayout, getResolvedOrigin } from './layoutEngine';

const base: LayoutSettings = { pattern: 'straight', rotation: 0, originMode: 'corner-tl', originXmm: 0, originYmm: 0, groutMm: 0, criticalCutMm: 40, turnDeg: 37 };
const patterns: LayoutSettings['pattern'][] = ['straight', 'brick', 'wood-random', 'diagonal', 'herringbone'];
const origins: LayoutSettings['originMode'][] = ['corner-tl', 'corner-t', 'corner-tr', 'corner-l', 'tile-center', 'joint-center', 'corner-r', 'corner-bl', 'corner-b', 'corner-br'];
const staggers = ['none', 'half', 'third', 'quarter'] as const;

describe('rotation combinations', () => {
  for (const pattern of patterns) for (const originMode of origins) for (const stagger of staggers) {
    it(`${pattern} / ${originMode} / ${stagger}: fills the entire rotated surface without gaps or excess area`, () => {
      const result = generateRectLayout({ widthMm: 1200, heightMm: 900, tileWidthMm: 600, tileHeightMm: 200, layout: { ...base, pattern, originMode, stagger, originXmm: 13, originYmm: -17 } });
      expect(result.truncated).toBe(false);
      expect(result.pieces.length).toBeGreaterThan(0);
      expect(result.pieces.reduce((sum, piece) => sum + piece.areaMm2!, 0)).toBeCloseTo(1200 * 900, 0);
      expect(result.pieces.every((piece) => piece.polygon!.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= -0.01 && point.x <= 1200.01 && point.y >= -0.01 && point.y <= 900.01))).toBe(true);
    });
  }

  it.each(patterns)('%s keeps the center of the starting tile at the surface center while turning', (pattern) => {
    const result = generateRectLayout({ widthMm: 3000, heightMm: 2400, tileWidthMm: 600, tileHeightMm: 200, layout: { ...base, pattern, originMode: 'tile-center' } });
    const centered = result.pieces.find((piece) => piece.polygon?.length === 4 && Math.abs(piece.areaMm2! - 120000) < 1 && Math.abs(piece.polygon.reduce((sum, p) => sum + p.x, 0) / 4 - 1500) < 0.01 && Math.abs(piece.polygon.reduce((sum, p) => sum + p.y, 0) / 4 - 1200) < 0.01);
    expect(centered).toBeDefined();
  });

  it.each(origins)('%s retains its anchor when moving the rotated grid in screen coordinates', (originMode) => {
    const first = getResolvedOrigin({ ...base, originMode }, 1200, 900, 600, 200);
    const shifted = getResolvedOrigin({ ...base, originMode, originXmm: 10, originYmm: -20 }, 1200, 900, 600, 200);
    expect(shifted.xMm - first.xMm).toBeCloseTo(10);
    expect(shifted.yMm - first.yMm).toBeCloseTo(-20);
  });

  it.each(patterns)('%s combines grout, different tile sizes, blockers and a polygon zone with rotation', (pattern) => {
    const points = [{ x: 0, y: 0 }, { x: 1200, y: 0 }, { x: 1200, y: 900 }, { x: 600, y: 900 }, { x: 600, y: 600 }, { x: 0, y: 600 }];
    for (const rotation of [0, 90] as const) for (const turnDeg of [0.1, 45, 90, 180, 359.9]) {
      const layout = { ...base, pattern, rotation, turnDeg, groutMm: 3, originMode: 'joint-center' as const, stagger: 'third' as const };
      const result = generatePolygonLayout({ points, tileWidthMm: 400, tileHeightMm: 200, layout, blockedRects: [{ type: 'rect', xMm: 100, yMm: 100, widthMm: 200, heightMm: 200 }] });
      expect(result.truncated).toBe(false);
      expect(result.pieces.length).toBeGreaterThan(0);
      expect(result.pieces.reduce((sum, piece) => sum + piece.areaMm2!, 0)).toBeLessThan(900000);
    }
  });
});
