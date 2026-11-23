import metrics from './fontMetrics.generated.json';
import { CJK_PREFERRED_CODE_POINTS, type FontStyleId } from './fontStyles';

/** コードポイント → 字幅（em）。同梱フォントで描く文字だけが入る */
export type LatinWidthTable = Readonly<Record<string, number | undefined>>;

const CJK_PREFERRED = new Set(CJK_PREFERRED_CODE_POINTS.map(String));

/**
 * 同梱フォントで描かない文字（‥ …、和文フォントに任せる）を除いた表を、起動時に 1 回だけ作る。
 * 文字ごとに除外を調べなくてよいので、見積もりの内側のループは、表を引くだけで済む
 */
const TABLES: Record<FontStyleId, Record<string, LatinWidthTable>> = Object.fromEntries(
  Object.entries(metrics).map(([styleId, tables]) => [
    styleId,
    Object.fromEntries(
      Object.entries(tables).map(([key, table]) => [
        key,
        Object.fromEntries(Object.entries(table).filter(([codePoint]) => !CJK_PREFERRED.has(codePoint))),
      ])
    ),
  ])
) as Record<FontStyleId, Record<string, LatinWidthTable>>;

/**
 * 書体・太さ・斜体に合う字幅の表。文字ごとではなく、テキストごとに 1 回だけ引いて、その表を使い回す。
 * 斜体の表がない書体（等幅）は、通常の表を使う（ブラウザが字を傾けて代用するので、幅は変わらない）
 */
export function getLatinWidthTable(styleId: FontStyleId, bold: boolean, italic: boolean): LatinWidthTable {
  const tables = TABLES[styleId];
  const weight = bold ? '700' : '500';
  return (italic && tables[`${weight}-italic`]) || tables[`${weight}-normal`];
}

/**
 * 同梱フォントで描く文字の幅（em）。同梱フォントにない文字・和文フォントに任せる文字（‥ …）は undefined。
 * 1 文字だけ調べるときの入口（テストなど）。見積もりの中では、getLatinWidthTable で表を 1 回引いて使う
 */
export function getLatinCharWidthEm(
  styleId: FontStyleId,
  bold: boolean,
  italic: boolean,
  codePoint: number
): number | undefined {
  return getLatinWidthTable(styleId, bold, italic)[codePoint];
}
