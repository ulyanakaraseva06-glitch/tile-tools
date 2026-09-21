import { describe, expect, it } from 'vitest';
import { snapExportBox } from './pdfExport';

describe('pdfExport', () => {
  it('rounds export boxes to integer pixels so html2canvas does not shift images', () => {
    expect(snapExportBox({ left: 12.4, top: 8.6, width: 220.2, height: 140.8 })).toEqual({
      left: 12,
      top: 9,
      width: 220,
      height: 141
    });
  });
});
