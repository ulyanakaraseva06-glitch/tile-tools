import { describe, expect, it } from 'vitest';
import { generateRectLayout } from './layoutEngine';
import type { LayoutSettings } from '../types/project';

const fractions = [['half', 2], ['third', 3], ['quarter', 4]] as const;
const layout: LayoutSettings = { pattern: 'straight', rotation: 0, originMode: 'manual', originXmm: 1000, originYmm: 1000, groutMm: 2, criticalCutMm: 30 };

describe('vertical fraction stagger', () => {
  for (const pattern of ['straight', 'brick', 'wood-random', 'diagonal'] as const) {
    for (const [stagger, denominator] of fractions) for (const turnDeg of [0, 37]) {
      it(`${pattern}, ${stagger}, ${turnDeg} degrees: shifts along local Y, not X`, () => {
        const width = pattern === 'brick' ? 600 : 200;
        const height = pattern === 'brick' ? 200 : 600;
        const result = generateRectLayout({ widthMm: 3000, heightMm: 3000, tileWidthMm: 200, tileHeightMm: 600, layout: { ...layout, pattern, stagger, turnDeg } });
        const angle = (turnDeg + (pattern === 'diagonal' ? 45 : 0)) * Math.PI / 180;
        // Test grid coordinates on intact tiles; edge clips may still be
        // classified as full when the missing sliver is within the area tolerance.
        const full = result.pieces.filter((piece) => piece.kind === 'full' && (!piece.polygon || (piece.polygon.length === 4 && piece.polygon.every((point) => point.x > 0.01 && point.y > 0.01 && point.x < 2999.99 && point.y < 2999.99))));
        expect(full.some((piece) => piece.col === 1)).toBe(true);
        for (const piece of full) {
          const center = piece.polygon
            ? { x: piece.polygon.reduce((sum, point) => sum + point.x, 0) / 4, y: piece.polygon.reduce((sum, point) => sum + point.y, 0) / 4 }
            : { x: piece.xMm + width / 2, y: piece.yMm + height / 2 };
          const dx = center.x - 1000;
          const dy = center.y - 1000;
          const x = dx * Math.cos(angle) + dy * Math.sin(angle) - width / 2;
          const y = -dx * Math.sin(angle) + dy * Math.cos(angle) - height / 2;
          expect(x).toBeCloseTo(piece.col * (width + 2), 5);
          const shift = ((piece.col % denominator) + denominator) % denominator * height / denominator;
          const rows = (y - shift) / (height + 2);
          expect(rows).toBeCloseTo(Math.round(rows), 5);
        }
      });
    }
  }

  it.each(fractions)('herringbone %s shifts the whole weave on local Y without deforming it', (stagger, denominator) => {
    const run = (offset: LayoutSettings['stagger']) => generateRectLayout({ widthMm: 3000, heightMm: 3000, tileWidthMm: 200, tileHeightMm: 600, layout: { ...layout, groutMm: 0, pattern: 'herringbone', stagger: offset, turnDeg: 37 } }).pieces.find((piece) => piece.id === 'h-r0-p0-horizontal')!;
    const a = run('none').polygon!;
    const b = run(stagger).polygon!;
    const angle = 82 * Math.PI / 180;
    expect(b[0].x - a[0].x).toBeCloseTo(-Math.sin(angle) * 600 / denominator);
    expect(b[0].y - a[0].y).toBeCloseTo(Math.cos(angle) * 600 / denominator);
  });
});
