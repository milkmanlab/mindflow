// 同梱フォント（Noto、Fontsource の latin サブセット）。Vite の `?inline` で data URI として JS に取り込む。
// CSP に connect-src がなく fetch でフォントを読めないため、画面（fontLoader）と書き出し（exportUtils）が同じ data URI を使う。
// ファイルを替えたら scripts/fontMetricsCore.mjs と npm run fonts:metrics も合わせる
import monoBold from '@fontsource/noto-sans-mono/files/noto-sans-mono-latin-700-normal.woff2?inline';
import monoMedium from '@fontsource/noto-sans-mono/files/noto-sans-mono-latin-500-normal.woff2?inline';
import sansBoldItalic from '@fontsource/noto-sans/files/noto-sans-latin-700-italic.woff2?inline';
import sansBold from '@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2?inline';
import sansMediumItalic from '@fontsource/noto-sans/files/noto-sans-latin-500-italic.woff2?inline';
import sansMedium from '@fontsource/noto-sans/files/noto-sans-latin-500-normal.woff2?inline';
import serifBoldItalic from '@fontsource/noto-serif/files/noto-serif-latin-700-italic.woff2?inline';
import serifBold from '@fontsource/noto-serif/files/noto-serif-latin-700-normal.woff2?inline';
import serifMediumItalic from '@fontsource/noto-serif/files/noto-serif-latin-500-italic.woff2?inline';
import serifMedium from '@fontsource/noto-serif/files/noto-serif-latin-500-normal.woff2?inline';
import { FONT_STYLES, type FontStyleId } from './fontStyles';

export type FontWeight = 500 | 700;
export type FontSlant = 'normal' | 'italic';

export interface FontFaceSource {
  family: string;
  weight: FontWeight;
  style: FontSlant;
  dataUri: string;
}

const DATA_URIS: Record<FontStyleId, Partial<Record<`${FontWeight}-${FontSlant}`, string>>> = {
  sans: {
    '500-normal': sansMedium,
    '500-italic': sansMediumItalic,
    '700-normal': sansBold,
    '700-italic': sansBoldItalic,
  },
  serif: {
    '500-normal': serifMedium,
    '500-italic': serifMediumItalic,
    '700-normal': serifBold,
    '700-italic': serifBoldItalic,
  },
  // Noto Sans Mono には斜体がない
  mono: { '500-normal': monoMedium, '700-normal': monoBold },
};

/** 書体の同梱フォント（太さ・字形ごと） */
export function getFontFaces(styleId: FontStyleId): FontFaceSource[] {
  const style = FONT_STYLES.find((s) => s.id === styleId)!;
  return Object.entries(DATA_URIS[styleId]).map(([key, dataUri]) => {
    const [weight, slant] = key.split('-') as [string, FontSlant];
    return { family: style.latinFamily, weight: Number(weight) as FontWeight, style: slant, dataUri: dataUri! };
  });
}

/** すべての書体の同梱フォント */
export function getAllFontFaces(): FontFaceSource[] {
  return FONT_STYLES.flatMap((s) => getFontFaces(s.id));
}
