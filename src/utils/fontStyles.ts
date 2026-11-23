import type { MessageKey } from '../i18n';

/**
 * マップの書体。欧文は同梱フォント（Noto、`fontFaces.ts`）、和文は OS のフォントで描く。
 * 画面（MindCanvas）・見積もり（nodeDimensions）・書き出し（exportUtils）・フォント選択パネルが、ここの決まりを使う
 */
export type FontStyleId = 'sans' | 'serif' | 'mono';

export interface FontStyle {
  id: FontStyleId;
  nameKey: MessageKey;
  /** 同梱フォントを登録する名前。利用者の PC に入っている別の版の Noto と混ざらないよう、専用の名前にする */
  latinFamily: string;
  /** 和文フォント。Mac → Windows → Linux の順（Mac にも游書体があるので、ヒラギノを先に置く） */
  cjkFamilies: readonly string[];
  generic: 'sans-serif' | 'serif' | 'monospace';
  /** 斜体の同梱フォントがあるか。ない書体は、ブラウザが通常の字を傾けて代用する（字幅は変わらない） */
  hasItalic: boolean;
}

const CJK_GOTHIC = [
  'Hiragino Sans',
  'Hiragino Kaku Gothic ProN',
  'Yu Gothic UI',
  'Meiryo',
  'Noto Sans CJK JP',
  'Noto Sans JP',
] as const;

const CJK_MINCHO = ['Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif CJK JP', 'Noto Serif JP'] as const;

export const FONT_STYLES: readonly FontStyle[] = [
  {
    id: 'sans',
    nameKey: 'font.sans',
    latinFamily: 'Mindflow Sans',
    cjkFamilies: CJK_GOTHIC,
    generic: 'sans-serif',
    hasItalic: true,
  },
  {
    id: 'serif',
    nameKey: 'font.serif',
    latinFamily: 'Mindflow Serif',
    cjkFamilies: CJK_MINCHO,
    generic: 'serif',
    hasItalic: true,
  },
  {
    id: 'mono',
    nameKey: 'font.mono',
    latinFamily: 'Mindflow Mono',
    // 和文の等幅フォント（MS ゴシックなど）は古く見えるので、ゴシックを使う。全角はもともと幅がそろう
    cjkFamilies: CJK_GOTHIC,
    generic: 'monospace',
    hasItalic: false,
  },
];

/**
 * 同梱フォントで描かない文字（‥ …）。日本語の文中では和文フォントの字形（全角・中央の点）で描きたいので、
 * 同梱フォントの unicode-range から外し、和文フォントに任せる。見積もり（fontMetrics.ts）も全角として数える
 */
export const CJK_PREFERRED_CODE_POINTS: readonly number[] = [0x2025, 0x2026];

/** 同梱フォントの unicode-range（CJK_PREFERRED_CODE_POINTS を除いた全体）。fontStyles.test.ts が一致を確かめる */
export const LATIN_UNICODE_RANGE = 'U+0-2024, U+2027-10FFFF';

/** 新しいマップ・fontFamily のないマップの書体 */
export const DEFAULT_FONT_STYLE_ID: FontStyleId = 'sans';

/**
 * MindMap.fontFamily から書体を決める。大文字小文字と前後の空白は区別しない（手で書いた `Serif` や ` mono ` も効く）。
 * なくした書体（rounded・handwriting）、知らない id、CSS のフォント名は、既定の書体として扱う。
 * ファイルの値は書き換えない（利用者が選び直したときだけ変わる）
 */
export function resolveFontStyle(fontFamily: string | undefined): FontStyle {
  const id = fontFamily?.trim().toLowerCase();
  return FONT_STYLES.find((s) => s.id === id) ?? FONT_STYLES.find((s) => s.id === DEFAULT_FONT_STYLE_ID)!;
}

/**
 * CSS の font-family の値。欧文（同梱）→ 和文（名前で指定）→ 総称 の順。
 * 和文を名前で指定するので、`<html lang>` が en でも中国語の字形にならない。
 * quote は、SVG の属性に入れるときに "'" を使う
 */
export function buildFontFamilyCss(style: FontStyle, quote: '"' | "'" = '"'): string {
  return [style.latinFamily, ...style.cjkFamilies].map((name) => `${quote}${name}${quote}`).concat(style.generic).join(', ');
}
