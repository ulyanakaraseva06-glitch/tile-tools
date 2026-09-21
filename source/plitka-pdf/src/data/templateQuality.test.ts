/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { allPageTemplates, pageTemplates } from './pageTemplates';

const bundledAssets = import.meta.glob('/public/**/*', { query: '?url', import: 'default' });

describe('template quality', () => {
  it.each(allPageTemplates)('$id: zones fit the page and bundled images exist', (template) => {
    for (const [key, zone] of Object.entries(template.defaultZones)) {
      expect(zone.id, `${template.id}/${key}`).toBe(key);
      const { x, y, w, h } = zone.layout;
      expect([x, y, w, h].every(Number.isFinite)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
      expect(x + w).toBeLessThanOrEqual(100.001);
      expect(y + h).toBeLessThanOrEqual(100.001);
      if (zone.kind === 'image' && zone.src.startsWith('/')) {
        expect(`/public${zone.src}` in bundledAssets, zone.src).toBe(true);
      }
    }
  });

  it('preserves photo proportions and keeps footers free of editor instructions', () => {
    for (const template of pageTemplates) {
      for (const zone of Object.values(template.defaultZones)) {
        if (zone.kind === 'image' && zone.imageRole === 'interior') expect(zone.fit).toBe('cover');
        if (zone.id === 'pageBottomMeta' && zone.kind === 'text') {
          expect(zone.value).not.toMatch(/contain|cover|можно заменить|ячейки универсальны/);
        }
      }
    }
  });
});
