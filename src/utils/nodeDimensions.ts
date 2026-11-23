import { MindNode, NodeFontSize } from '../types';
import { getLatinWidthTable, type LatinWidthTable } from './fontMetrics';
import { resolveFontStyle } from './fontStyles';
import { IMAGE_TEXT_GAP, resolveImageBox } from './imageBox';
import { getNodeFontPx } from './nodeFontSizes';

/**
 * 全角の幅で描画される記号（‥ … ※、矢印、丸数字、罫線、図形）。
 * 半角として見積もると、こうした文字が並ぶノードで文字が枠からはみ出す
 */
function isWideSymbol(code: number): boolean {
  return (
    code === 0x2025 ||
    code === 0x2026 ||
    code === 0x203b ||
    (code >= 0x2190 && code <= 0x21ff) ||
    (code >= 0x2460 && code <= 0x25ff)
  );
}

/**
 * 絵文字として描画されうる文字。全角より広い（フォントサイズの約 1.4 倍）。
 * サロゲートペアは上位サロゲートで 1 文字分を数える（下位は isZeroWidth で 0 にする）
 */
function isEmojiLike(code: number): boolean {
  return (
    (code >= 0x2300 && code <= 0x23ff) ||
    (code >= 0x2600 && code <= 0x27bf) ||
    (code >= 0x2b00 && code <= 0x2bff) ||
    (code >= 0xd800 && code <= 0xdbff)
  );
}

/** 幅を持たない文字（下位サロゲート、異体字セレクタ、ゼロ幅接合子） */
function isZeroWidth(code: number): boolean {
  return (code >= 0xdc00 && code <= 0xdfff) || code === 0xfe0e || code === 0xfe0f || code === 0x200d;
}

/** 全角の文字（CJK、ひらがな、カタカナ、漢字、ハングル、全角の記号） */
function isFullWidthChar(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe19) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    isWideSymbol(code)
  );
}

/**
 * ギリシャ文字・キリル文字。同梱フォントにはなく、和文フォントが全角の字形で描く
 * （Hiragino Sans などで実測すると、14px のとき 1 文字 14px）
 */
function isFullWidthScript(code: number): boolean {
  return code >= 0x370 && code <= 0x52f;
}

// 和文・絵文字の 1 文字の幅（px、base のフォントサイズのとき）。ルートは通常のノードより 1 段大きいフォントで描画する。
// 欧文（同梱フォントで描く文字）は、字幅の表（fontMetrics.generated.json）から出す
/** 絵文字 1 つの幅。全角より広い（14px のとき約 19.2px） */
const EMOJI_CHAR_WIDTH = { root: 22.5, node: 19.5 };
/** 全角 1 文字の幅（和文のほか、ギリシャ文字・キリル文字もこの幅で数える） */
const FULL_WIDTH_CHAR_WIDTH = { root: 17.5, node: 15.5 };

/**
 * 同梱フォントにも和文にも当たらない文字（ラテン拡張の ł ş ğ ő、ベトナム語、半角カナ、タイ文字、アラビア文字など）の幅（em）。
 * これらは OS のフォントの、字幅のそろわない（プロポーショナルな）字形で描かれ、実測はおよそ 0.45〜0.6em。
 * 全角（約 1.1em）で数えると、ノードが 2 倍近く広くなる。はみ出さないよう、実測より少し大きめに取る
 */
const UNLISTED_CHAR_WIDTH_EM = 0.65;

/** 和文・絵文字のフォントサイズによる幅の倍率 */
const FONT_SCALES: Record<NodeFontSize, number> = { sm: 0.85, base: 1.0, lg: 1.2, xl: 1.45 };
/** 和文・絵文字の太字による幅の倍率（欧文は太字の字幅の表を使う） */
const BOLD_SCALE = 1.06;

interface TextFont {
  /** 書体・太さ・斜体に合う字幅の表。テキストごとに 1 回だけ引く */
  latinTable: LatinWidthTable;
  px: number;
  bold: boolean;
  /** 和文・絵文字の幅にかける倍率 */
  cjkScale: number;
}

/** 1 文字（UTF-16 の 1 単位）の幅（px） */
function getCharWidth(char: string, isRoot: boolean, font: TextFont): number {
  const code = char.charCodeAt(0);
  const key = isRoot ? 'root' : 'node';
  if (isZeroWidth(code)) return 0;
  if (isEmojiLike(code)) return EMOJI_CHAR_WIDTH[key] * font.cjkScale;
  // 全角の文字は、同梱フォントに字形があっても和文フォントの幅で数える（大きめに外れる側）
  if (isFullWidthChar(code) || isFullWidthScript(code)) return FULL_WIDTH_CHAR_WIDTH[key] * font.cjkScale;
  const em = font.latinTable[code];
  if (em !== undefined) {
    // ヒンティングが効く環境（Linux など）では、字送りが 1 文字ごとに整数 px へ丸められて描かれ、丸めで広がる分だけ全体が広くなる。
    // 丸めなしの幅と丸めた幅の大きいほうを取り、どちらの環境でも文字が箱からはみ出さないようにする（広がらない環境では平均 0.1px/字ほど大きめ）
    const px = em * font.px;
    return Math.max(px, Math.round(px));
  }
  return UNLISTED_CHAR_WIDTH_EM * font.px * (font.bold ? BOLD_SCALE : 1);
}

function getCjkScale(fontSize: NodeFontSize | undefined, bold: boolean | undefined): number {
  // 想定外の値（手で書き換えた Markdown など）は、これまでどおり base として扱う
  const scale = FONT_SCALES[fontSize || 'base'] ?? FONT_SCALES.base;
  return bold ? scale * BOLD_SCALE : scale;
}

/**
 * テキストの見た目の幅（px）を見積もる。複数行のときは、最も長い行の幅。
 * DOM では測らず、欧文は同梱フォントの字幅の表、和文・絵文字は文字の種類ごとの幅から計算する
 */
export function calculateTextVisualWidth(
  text: string,
  isRoot: boolean,
  fontSize?: NodeFontSize,
  bold?: boolean,
  fontFamily?: string,
  italic?: boolean
): number {
  if (!text) return 0;
  const font: TextFont = {
    latinTable: getLatinWidthTable(resolveFontStyle(fontFamily).id, !!bold, !!italic),
    px: getNodeFontPx(fontSize, isRoot),
    bold: !!bold,
    cjkScale: getCjkScale(fontSize, bold),
  };

  let maxWidth = 0;
  for (const line of text.split('\n')) {
    let width = 0;
    for (let i = 0; i < line.length; i++) {
      width += getCharWidth(line[i], isRoot, font);
    }
    if (width > maxWidth) maxWidth = width;
  }
  return maxWidth;
}

/**
 * Whether the node text is rendered bold (explicit setting wins, root defaults to bold).
 * Must match the rendering in MindNodeComponent.
 */
export function resolveIsBold(node: Pick<MindNode, 'bold'>, isRoot: boolean): boolean {
  return node.bold !== undefined ? node.bold : isRoot;
}

/** 形ごとの左右の余白（px）。MindNodeComponent の形のクラス（getNodeShapeClass）と同じ値 */
export function getShapePadding(
  shape: MindNode['shape'] | undefined,
  isRoot: boolean
): { left: number; right: number } {
  if (isRoot) return { left: 12, right: 12 }; // px-3
  switch (shape) {
    case 'pill':
      return { left: 12, right: 12 }; // px-3
    case 'underline':
      return { left: 6, right: 4 }; // pl-1.5 pr-1
    case 'borderless':
      return { left: 8, right: 10 }; // pl-2 pr-2.5
    default:
      return { left: 10, right: 10 }; // px-2.5
  }
}

/**
 * 左右の枠線の幅（px、片側）。ルート・角丸・ピルは 1px の枠、「下線のみ」は下辺だけ、「枠なし」は枠なし。
 * MindNodeComponent の枠（getNodeShapeClass）と書き出しで同じ値を使う
 */
export function getShapeBorderWidth(shape: MindNode['shape'] | undefined, isRoot: boolean): number {
  if (isRoot) return 1;
  return shape === 'underline' || shape === 'borderless' ? 0 : 1;
}

/**
 * Horizontal padding (left + right) actually applied by MindNodeComponent's shape classes,
 * plus the 1px border on both sides (none for underline / borderless).
 * Keep in sync with `getNodeShapeClass` in nodeStyle.ts.
 */
export function getShapeHorizontalPadding(
  shape: MindNode['shape'] | undefined,
  isRoot: boolean
): number {
  const { left, right } = getShapePadding(shape, isRoot);
  return left + right + getShapeBorderWidth(shape, isRoot) * 2;
}

/** ノードの 1 行（アイコン・バッジ・文字・印）の寸法。幅の見積もりと書き出しで同じ値を使う */
export const NODE_ROW = {
  gap: 6, // gap-1.5 between icon / badge / text / indicators
  indicatorGap: 4, // gap-1 between note and link
  iconWidth: 16, // w-4
  noteWidth: 14, // w-3.5
  linkWidth: 18, // w-3.5 + p-0.5
} as const;
const MIN_WIDTH_ROOT = 80;
const MIN_WIDTH_NODE = 48;

/** 進捗バッジの幅。px-1.5 (12px) + チェック印 (w-3) または text-xs の「NN%」 */
export function estimateProgressBadgeWidth(progress: number): number {
  if (progress === 100) return 12 + 12;
  return 12 + String(progress).length * 7 + 8;
}

/**
 * Estimate the full node width for the given text, including shape padding,
 * icon, progress badge, note/link indicators and the gaps between them.
 * Shared by layout and the inline editor so both stay in sync.
 */
export function estimateNodeContentWidth(
  node: MindNode,
  isRoot: boolean,
  text: string,
  fontFamily?: string
): number {
  const textWidth = calculateTextVisualWidth(
    text,
    isRoot,
    node.fontSize,
    resolveIsBold(node, isRoot),
    fontFamily,
    node.italic
  );

  let items = 1; // text column
  let extra = 0;
  if (node.icon) {
    items++;
    extra += NODE_ROW.iconWidth;
  }
  if (node.progress !== undefined) {
    items++;
    extra += estimateProgressBadgeWidth(node.progress);
  }
  if (node.note || node.link) {
    items++;
    extra += (node.note ? NODE_ROW.noteWidth : 0) + (node.link ? NODE_ROW.linkWidth : 0);
    if (node.note && node.link) extra += NODE_ROW.indicatorGap;
  }
  // The note/link container is always rendered (empty when unused) and still takes a flex gap
  extra += (node.note || node.link ? items - 1 : items) * NODE_ROW.gap;

  const padding = getShapeHorizontalPadding(node.shape, isRoot);
  return Math.max(isRoot ? MIN_WIDTH_ROOT : MIN_WIDTH_NODE, padding + textWidth + extra);
}

const ROOT_LINE_HEIGHTS: Record<NodeFontSize, number> = { sm: 20, base: 24, lg: 28, xl: 34 };
const NODE_LINE_HEIGHTS: Record<NodeFontSize, number> = { sm: 18, base: 20, lg: 24, xl: 28 };

/**
 * ノードのテキスト 1 行の高さ（px）。描画・編集欄・サイズの推定で同じ値を使う。
 * ずれると、編集中に文字の上下が切れたり、ノードが重なったりする
 */
export function getNodeLineHeight(fontSize: NodeFontSize | undefined, isRoot: boolean): number {
  return (isRoot ? ROOT_LINE_HEIGHTS : NODE_LINE_HEIGHTS)[fontSize || 'base'];
}

/** 縦横比が分からない画像付きノードの最小の幅（従来の値） */
const IMAGE_MIN_WIDTH = { root: 200, node: 190 };
/** ノードの最小の高さ */
const MIN_HEIGHT = { root: 40, node: 34 };
/** 上下の余白と枠線の見積もり。通常は py-2（16px）+ 枠線 2px、ルートは py-2.5（20px）+ 枠線 2px */
const VERTICAL_PADDING = { root: 22, node: 18 };

/**
 * ノードの幅と高さを、テキスト・アイコン・バッジ・フォントの設定から見積もる。
 * DOM では測らないため、MindNodeComponent の余白やフォントを変えたときは、このファイルも合わせて直す
 */
export function estimateNodeDimensions(
  node: MindNode,
  isRoot: boolean,
  fontFamily?: string
): { width: number; height: number } {
  const key = isRoot ? 'root' : 'node';
  const text = node.text || '';
  const totalLines = Math.max(text.split('\n').length, 1);
  const lineHeight = getNodeLineHeight(node.fontSize || 'base', isRoot);
  const imageBox = resolveImageBox(node);

  let width = estimateNodeContentWidth(node, isRoot, text, fontFamily);
  if (imageBox) {
    // 幅が決まっている画像は、余白の内側に収まる幅にする。縦横比が分からない画像は、従来の最小の幅
    const imageWidth =
      imageBox.width === null ? IMAGE_MIN_WIDTH[key] : imageBox.width + getShapeHorizontalPadding(node.shape, isRoot);
    width = Math.max(width, imageWidth);
  }

  const height =
    Math.max(MIN_HEIGHT[key], VERTICAL_PADDING[key] + totalLines * lineHeight) +
    (imageBox ? imageBox.height + IMAGE_TEXT_GAP : 0);

  return { width, height };
}

/**
 * ノードの中の画像の枠の位置と大きさ（ノードの左上が原点）。画像がなければ null。
 * 幅の決まっている画像は、文字の行が広いときも、中身の領域の中央に置く
 */
export function getImageRect(
  node: MindNode,
  isRoot: boolean,
  nodeWidth: number
): { x: number; y: number; width: number; height: number } | null {
  const box = resolveImageBox(node);
  if (!box) return null;
  const padding = getShapePadding(node.shape, isRoot);
  const border = getShapeBorderWidth(node.shape, isRoot);
  const contentX = padding.left + border;
  const contentWidth = Math.max(0, nodeWidth - padding.left - padding.right - border * 2);
  const width = box.width === null ? contentWidth : Math.min(box.width, contentWidth);
  return {
    x: contentX + (contentWidth - width) / 2,
    y: VERTICAL_PADDING[isRoot ? 'root' : 'node'] / 2,
    width,
    height: box.height,
  };
}

/** 画像の下の文字の領域の上端と下端（ノードの左上が原点）。画像付きノードで、文字の行の中央を決めるのに使う */
export function getTextAreaSpan(
  node: MindNode,
  isRoot: boolean,
  nodeWidth: number,
  nodeHeight: number
): { top: number; bottom: number } {
  const rect = getImageRect(node, isRoot, nodeWidth);
  const verticalPadding = VERTICAL_PADDING[isRoot ? 'root' : 'node'] / 2;
  return { top: rect ? rect.y + rect.height + IMAGE_TEXT_GAP : verticalPadding, bottom: nodeHeight - verticalPadding };
}
