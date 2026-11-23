import { describe, expect, it } from 'vitest';
import {
  buildFontFamilyCss,
  CJK_PREFERRED_CODE_POINTS,
  DEFAULT_FONT_STYLE_ID,
  FONT_STYLES,
  LATIN_UNICODE_RANGE,
  resolveFontStyle,
} from './fontStyles';

describe('resolveFontStyle', () => {
  it.each(['sans', 'serif', 'mono'])('%s はその書体になる', (id) => {
    expect(resolveFontStyle(id).id).toBe(id);
  });

  it.each([
    ['Serif', 'serif'],
    ['SERIF', 'serif'],
    [' mono ', 'mono'],
    ['Sans\n', 'sans'],
  ])('手で書いた %j は、大文字小文字と前後の空白を区別せず %s になる', (value, id) => {
    expect(resolveFontStyle(value).id).toBe(id);
  });

  it.each([undefined, '', 'rounded', 'handwriting', 'unknown', '"Yu Mincho", serif'])(
    '%s は既定の書体（ゴシック）になる',
    (value) => {
      expect(resolveFontStyle(value).id).toBe(DEFAULT_FONT_STYLE_ID);
      expect(DEFAULT_FONT_STYLE_ID).toBe('sans');
    }
  );
});

describe('buildFontFamilyCss', () => {
  it('欧文（同梱）→ 和文 → 総称 の順に並ぶ', () => {
    expect(buildFontFamilyCss(resolveFontStyle('sans'))).toBe(
      '"Mindflow Sans", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", "Noto Sans JP", sans-serif'
    );
    expect(buildFontFamilyCss(resolveFontStyle('serif'))).toBe(
      '"Mindflow Serif", "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif CJK JP", "Noto Serif JP", serif'
    );
  });

  it('どの書体も、Mac・Windows・Linux の和文フォントを名前で含む（lang に左右されない）', () => {
    for (const style of FONT_STYLES) {
      const css = buildFontFamilyCss(style);
      expect(css).toMatch(/Hiragino/);
      expect(css).toMatch(/Yu (Gothic UI|Mincho)/);
      expect(css).toMatch(/Noto (Sans|Serif) CJK JP/);
      expect(css.endsWith(style.generic)).toBe(true);
    }
  });

  it('SVG の属性用に、一重引用符で囲める', () => {
    const css = buildFontFamilyCss(resolveFontStyle('mono'), "'");
    expect(css).not.toContain('"');
    expect(css.startsWith("'Mindflow Mono', ")).toBe(true);
  });
});

describe('LATIN_UNICODE_RANGE', () => {
  it('和文フォントに任せる文字（‥ …）だけを外した全体になっている', () => {
    const ranges = LATIN_UNICODE_RANGE.split(', ').map((r) => r.replace('U+', '').split('-').map((h) => parseInt(h, 16)));
    const inRange = (cp: number) => ranges.some(([from, to]) => cp >= from && cp <= to);
    for (const cp of CJK_PREFERRED_CODE_POINTS) expect(inRange(cp)).toBe(false);
    for (const cp of [0x20, 0x41, 0xd7, 0x2014, 0x2024, 0x2027, 0x3042, 0x10ffff]) expect(inRange(cp)).toBe(true);
  });
});
