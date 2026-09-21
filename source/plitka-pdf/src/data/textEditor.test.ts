import { describe, expect, it } from 'vitest';
import {
  availableFontSizes,
  clampFontSizePt,
  defaultFontSizePt,
  highlightSwatches,
  inferredFontFamily,
  isTextBold,
  mixHex,
  parseFontSizePt,
  sizeFromFontSizePt,
  textColorSwatches
} from './textEditor';

describe('textEditor', () => {
  it('maps size presets to point sizes used by the editor', () => {
    expect(defaultFontSizePt('hero')).toBe(33);
    expect(defaultFontSizePt('h1')).toBe(22);
    expect(defaultFontSizePt('body')).toBe(11);
    expect(defaultFontSizePt('small')).toBe(8);
  });

  it('keeps badge style when the user only changes point size', () => {
    expect(sizeFromFontSizePt(18, 'badge')).toBe('badge');
    expect(sizeFromFontSizePt(32)).toBe('hero');
    expect(sizeFromFontSizePt(11)).toBe('body');
  });

  it('infers serif headings and sans body text until a font is chosen', () => {
    expect(inferredFontFamily({ size: 'hero' })).toBe('serif');
    expect(inferredFontFamily({ size: 'body' })).toBe('sans');
    expect(inferredFontFamily({ size: 'hero', fontFamily: 'arial' })).toBe('arial');
  });

  it('treats headings and badges as bold until the user turns weight off', () => {
    expect(isTextBold({ size: 'h1' })).toBe(true);
    expect(isTextBold({ size: 'h1', fontWeight: 'normal' })).toBe(false);
    expect(isTextBold({ size: 'body' })).toBe(false);
    expect(isTextBold({ size: 'body', fontWeight: 'bold' })).toBe(true);
  });

  it('builds highlight swatches in the document accent tone', () => {
    const purple = highlightSwatches({ documentTheme: 'light', documentAccent: 'purple' });
    const gold = highlightSwatches({ documentTheme: 'light', documentAccent: 'gold' });
    const dark = highlightSwatches({ documentTheme: 'dark', documentAccent: 'gold' });

    expect(purple.length).toBeGreaterThanOrEqual(6);
    expect(purple.every((color) => /^#[0-9a-f]{6}$/.test(color))).toBe(true);
    expect(purple).not.toEqual(gold);
    expect(dark).not.toEqual(gold);
    expect(purple).toContain('#f7f4ef');
  });

  it('puts document text colors first in the text swatch row', () => {
    const swatches = textColorSwatches({
      documentTheme: 'light',
      documentAccent: 'beige',
      documentTextPrimaryColor: '#112233',
      documentTextSecondaryColor: '#445566'
    });

    expect(swatches[0]).toBe('#112233');
    expect(swatches[1]).toBe('#445566');
    expect(swatches).toContain('#8f5f3b');
  });

  it('mixes hex colors for template-tinted highlights', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(availableFontSizes(13)).toContain(13);
    expect(availableFontSizes(11)).not.toContain(13);
  });

  it('parses a typed font size and clamps it to a usable range', () => {
    expect(parseFontSizePt('13')).toBe(13);
    expect(parseFontSizePt('13 pt')).toBe(13);
    expect(parseFontSizePt('10,5')).toBe(10.5);
    expect(parseFontSizePt('3')).toBe(6);
    expect(parseFontSizePt('200')).toBe(72);
    expect(parseFontSizePt('')).toBeNull();
    expect(parseFontSizePt('abc')).toBeNull();
    expect(clampFontSizePt(11.4)).toBe(11.5);
  });
});
