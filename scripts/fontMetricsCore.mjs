// 同梱フォント（Fontsource の latin サブセット）から、文字ごとの字幅（em）の表を作る。
// scripts/generateFontMetrics.mjs（書き出し）と src/utils/fontMetrics.test.ts（突き合わせ）が使う。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as fontkit from 'fontkit';

/** 書体 id → Fontsource のパッケージ名。等幅（Noto Sans Mono）には斜体がない */
export const FONT_PACKAGES = {
  sans: { pkg: 'noto-sans', italic: true },
  serif: { pkg: 'noto-serif', italic: true },
  mono: { pkg: 'noto-sans-mono', italic: false },
};

export const FONT_WEIGHTS = [500, 700];

/** 1 書体・1 太さ・1 字形の woff2 のパス */
export function fontFilePath(rootDir, styleId, weight, style) {
  const { pkg } = FONT_PACKAGES[styleId];
  return path.join(rootDir, 'node_modules', '@fontsource', pkg, 'files', `${pkg}-latin-${weight}-${style}.woff2`);
}

/** フォントファイルに入っている文字の字幅（em、小数 4 桁）。キーはコードポイント */
function readAdvanceWidths(file) {
  const font = fontkit.create(readFileSync(file));
  const widths = {};
  for (const cp of [...font.characterSet].sort((a, b) => a - b)) {
    // 制御文字は描かれないので表に入れない
    if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) continue;
    const glyph = font.glyphForCodePoint(cp);
    widths[cp] = Math.round((glyph.advanceWidth / font.unitsPerEm) * 10000) / 10000;
  }
  return widths;
}

/** { sans: { '500-normal': { '32': 0.26, ... }, ... }, ... } */
export function buildFontMetrics(rootDir) {
  const result = {};
  for (const [styleId, { italic }] of Object.entries(FONT_PACKAGES)) {
    result[styleId] = {};
    for (const weight of FONT_WEIGHTS) {
      for (const style of italic ? ['normal', 'italic'] : ['normal']) {
        result[styleId][`${weight}-${style}`] = readAdvanceWidths(fontFilePath(rootDir, styleId, weight, style));
      }
    }
  }
  return result;
}
