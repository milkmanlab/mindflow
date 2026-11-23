import { describe, expect, it } from 'vitest';
import metrics from './fontMetrics.generated.json';
import { getAllFontFaces, getFontFaces } from './fontFaces';
import { FONT_STYLES } from './fontStyles';

describe('fontFaces', () => {
  it('同梱フォントは woff2 の data URI', () => {
    for (const face of getAllFontFaces()) {
      expect(face.dataUri.startsWith('data:font/woff2;base64,')).toBe(true);
    }
  });

  it('書体ごとのフォントが、字幅の表（fontMetrics.generated.json）と同じ組み合わせ', () => {
    for (const style of FONT_STYLES) {
      const keys = getFontFaces(style.id).map((f) => `${f.weight}-${f.style}`).sort();
      expect(keys).toEqual(Object.keys(metrics[style.id]).sort());
      expect(getFontFaces(style.id).every((f) => f.family === style.latinFamily)).toBe(true);
    }
  });
});
