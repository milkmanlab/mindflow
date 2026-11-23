import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFontMetrics } from '../../scripts/fontMetricsCore.mjs';
import metrics from './fontMetrics.generated.json';
import { getLatinCharWidthEm, getLatinWidthTable } from './fontMetrics';
import { FONT_STYLES } from './fontStyles';

describe('fontMetrics.generated.json', () => {
  it('同梱フォントから作り直したものと一致する（Fontsource の版を上げたら npm run fonts:metrics）', () => {
    expect(buildFontMetrics(path.resolve(__dirname, '../..'))).toEqual(metrics);
  });

  it('すべての書体に、500・700 と、斜体があるなら斜体の表がある', () => {
    for (const style of FONT_STYLES) {
      const keys = Object.keys(metrics[style.id]).sort();
      expect(keys).toEqual(
        style.hasItalic ? ['500-italic', '500-normal', '700-italic', '700-normal'] : ['500-normal', '700-normal']
      );
    }
  });

  it('等幅の ASCII は、すべて同じ幅', () => {
    const table: Record<string, number> = metrics.mono['500-normal'];
    const widths = new Set(Array.from({ length: 0x7f - 0x20 }, (_, i) => table[String(0x20 + i)]));
    expect([...widths]).toEqual([0.6]);
  });
});

describe('getLatinCharWidthEm', () => {
  it('同梱フォントの字幅を、太さ・斜体ごとに引く', () => {
    expect(getLatinCharWidthEm('sans', false, false, 0x4d)).toBe(metrics.sans['500-normal']['77']);
    expect(getLatinCharWidthEm('sans', true, true, 0x4d)).toBe(metrics.sans['700-italic']['77']);
  });

  it('斜体のない等幅は、通常の表を使う', () => {
    expect(getLatinCharWidthEm('mono', false, true, 0x69)).toBe(0.6);
  });

  it('同梱フォントにない文字・和文フォントに任せる文字は undefined', () => {
    expect(getLatinCharWidthEm('sans', false, false, 0x3042)).toBeUndefined(); // あ
    expect(getLatinCharWidthEm('sans', false, false, 0x3b1)).toBeUndefined(); // α
    expect(getLatinCharWidthEm('serif', false, false, 0x2026)).toBeUndefined(); // …
    expect(getLatinCharWidthEm('serif', false, false, 0x2025)).toBeUndefined(); // ‥
  });
});

describe('getLatinWidthTable', () => {
  it('テキストごとに 1 回引いた表を、文字ごとに使い回せる（同じ組み合わせなら同じ表）', () => {
    expect(getLatinWidthTable('sans', false, false)).toBe(getLatinWidthTable('sans', false, false));
    expect(getLatinWidthTable('sans', true, false)).not.toBe(getLatinWidthTable('sans', false, false));
    // 等幅は斜体の表がないので、通常の表と同じ
    expect(getLatinWidthTable('mono', false, true)).toBe(getLatinWidthTable('mono', false, false));
  });

  it('和文フォントに任せる ‥ … は表に入っていない', () => {
    for (const style of FONT_STYLES) {
      const table = getLatinWidthTable(style.id, false, false);
      expect(table[0x2025]).toBeUndefined();
      expect(table[0x2026]).toBeUndefined();
      expect(table[0x41]).toBeGreaterThan(0);
    }
  });
});
