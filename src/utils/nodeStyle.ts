import { t } from '../i18n';
import type { LayoutType, MindNode, NodeFontSize, NodeShape, ThemeConfig } from '../types';
import { mixHex } from './colorMix';
import { getNodeLineHeight, resolveIsBold } from './nodeDimensions';
import { getNodeFontPx, NODE_FONT_SIZES } from './nodeFontSizes';

// クラス文字列は Tailwind が拾えるよう、すべて完全な形で書く（一部を変数で組み立てない）

/**
 * 形状ごとの角丸・枠・余白のクラス。枠の色は getNodeBorderStyle が決める。
 * 余白や枠を変えたときは nodeDimensions.ts の getShapeBorderWidth・getShapeHorizontalPadding も合わせて直す（ずれるとノードが重なる）
 */
export function getNodeShapeClass(shape: NodeShape | undefined, isRoot: boolean): string {
  if (isRoot) return 'rounded-xl border px-3 py-2.5';
  switch (shape || 'rounded') {
    case 'pill':
      return 'rounded-full border px-3 py-2';
    case 'underline':
      return 'rounded-none border-b-2 bg-transparent pl-1.5 pr-1 py-1.5';
    case 'borderless':
      return 'rounded-md border-0 bg-transparent pl-2 pr-2.5 py-1.5';
    default:
      return 'rounded-lg border px-2.5 py-2';
  }
}

/** フォントサイズのクラス */
export function getNodeFontSizeClass(fontSize: NodeFontSize | undefined, isRoot: boolean): string {
  return NODE_FONT_SIZES[isRoot ? 'root' : 'node'][fontSize || 'base'].className;
}

export interface NodeFontSpec {
  px: number;
  lineHeight: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

/** 書き出し用の文字の指定。画面の getNodeFontSizeClass / resolveIsBold / getNodeLineHeight と同じ決まり */
export function getNodeFontSpec(
  node: Pick<MindNode, 'fontSize' | 'bold' | 'italic' | 'underline'>,
  isRoot: boolean
): NodeFontSpec {
  return {
    px: getNodeFontPx(node.fontSize, isRoot),
    lineHeight: getNodeLineHeight(node.fontSize, isRoot),
    bold: resolveIsBold(node, isRoot),
    italic: !!node.italic,
    underline: !!node.underline,
  };
}

export interface NodeShapeSpec {
  /** 角丸の半径（px） */
  radius: number;
  /** 塗りがあるか。underline / borderless は透明 */
  filled: boolean;
  /** 下辺だけの線を引くか（underline） */
  bottomLine: boolean;
}

/**
 * 書き出し用の形の指定。画面の getNodeShapeClass と同じ決まり（rounded-xl = 12、rounded-lg = 8、rounded-md = 6）。
 * 画面の枠線は、ルート・角丸・ピルが 1px の四辺、underline が下辺の 2px、borderless はなし
 */
export function getNodeShapeSpec(shape: NodeShape | undefined, isRoot: boolean, height: number): NodeShapeSpec {
  if (isRoot) return { radius: 12, filled: true, bottomLine: false };
  switch (shape || 'rounded') {
    case 'pill':
      return { radius: height / 2, filled: true, bottomLine: false };
    case 'underline':
      return { radius: 0, filled: false, bottomLine: true };
    case 'borderless':
      return { radius: 6, filled: false, bottomLine: false };
    default:
      return { radius: 8, filled: true, bottomLine: false };
  }
}

export interface NodeColors {
  /** 塗りの色（6 桁の 16 進）。不透明度は fillOpacity */
  fill: string;
  fillOpacity: number;
  text: string;
  /** 下辺の線（underline）の色 */
  line: string;
  /** アイコンの色。ルートは文字の色、ほかはブランチの色 */
  icon: string | undefined;
  /** 枠の色（塗りのある形の四辺）。不透明度は borderOpacity */
  border: string;
  borderOpacity: number;
}

/** 色を指定したノードの塗りの透明度（16 進の 2 桁）。画面の `${color}15` と同じ */
export const NODE_FILL_ALPHA = '15';
/** NODE_FILL_ALPHA を 0〜1 にした値（SVG の fill-opacity 用） */
const NODE_FILL_OPACITY = parseInt(NODE_FILL_ALPHA, 16) / 255;

/** 枝の色（色を指定したノードは指定色）の枠の、ふだんの透明度（16 進の 2 桁）。ホバーで 100% になる */
export const NODE_BORDER_ALPHA = '99';
const NODE_BORDER_OPACITY = parseInt(NODE_BORDER_ALPHA, 16) / 255;

/** 書き出し用の色。画面（MindNodeComponent・NodeInfoBadges）の塗り・文字・枠・アイコンの決まりと同じ（枠はホバーしない状態） */
export function getNodeColors(
  node: Pick<MindNode, 'color' | 'textColor'> & { depth: number; branchColor?: string },
  isRoot: boolean,
  theme: ThemeConfig
): NodeColors {
  if (isRoot) {
    return {
      fill: node.color || theme.root.bg,
      fillOpacity: 1,
      text: node.textColor || theme.root.text,
      line: theme.root.border,
      icon: node.textColor || theme.root.text,
      border: node.color || theme.root.border,
      borderOpacity: 1,
    };
  }
  return {
    fill: node.color || theme.node.bg,
    fillOpacity: node.color ? NODE_FILL_OPACITY : 1,
    text: node.textColor || theme.node.text,
    line: node.color || node.branchColor || theme.node.border,
    icon: node.branchColor,
    border: node.color || node.branchColor || theme.node.border,
    borderOpacity: node.color || node.branchColor ? NODE_BORDER_OPACITY : 1,
  };
}

export interface NodeBorderStyle {
  /** 枠の色のクラス（色を指定していないとき） */
  className: string;
  /** インラインの指定（色を指定したとき、枠のない形のホバー） */
  style: { borderColor?: string; backgroundColor?: string };
}

/** 枠のない形（下線のみ・枠なし）のホバーの塗り。文字色を薄めて作るので、どのテーマでも合う */
const HOVER_FILL = 'color-mix(in srgb, var(--mf-on-node) 6%, transparent)';

/**
 * 画面の枠の色とホバーの表し方（書き出しは getNodeColors の border / line）。
 * - 塗りのある形：ふだんは枝の色の薄め（色を指定したノードは指定色）、ホバーで 100%。枝の色がないときだけテーマの枠
 * - 下線のみ：下線は指定色か枝色のまま、ホバーで薄い塗り。枠なし：ホバーで薄い塗り
 */
export function getNodeBorderStyle(
  node: Pick<MindNode, 'color' | 'shape'> & { branchColor?: string },
  isRoot: boolean,
  isHovered: boolean
): NodeBorderStyle {
  if (isRoot) {
    if (isHovered) return { className: 'border-on-root/60', style: {} };
    return node.color ? { className: '', style: { borderColor: node.color } } : { className: 'border-root-line', style: {} };
  }
  const hoverFill = isHovered && !node.color ? HOVER_FILL : undefined;
  switch (node.shape || 'rounded') {
    case 'borderless':
      return { className: '', style: { backgroundColor: hoverFill } };
    case 'underline': {
      const line = node.color || node.branchColor;
      return {
        className: line ? '' : 'border-node-line',
        style: { borderColor: line, backgroundColor: hoverFill },
      };
    }
    default: {
      const color = node.color || node.branchColor;
      if (color) return { className: '', style: { borderColor: isHovered ? color : `${color}${NODE_BORDER_ALPHA}` } };
      return { className: isHovered ? 'border-on-node/45' : 'border-node-line', style: {} };
    }
  }
}

export interface ProgressBadgeSpec {
  /** 画面のクラス（背景と文字の色。色は CSS 変数のトークン） */
  className: string;
  /** 100% のチェック印の画面のクラス（文字の色） */
  checkClassName: string;
  /** 書き出し用の背景色・文字色・チェックの色（クラスと同じ色の 16 進） */
  bg: string;
  text: string;
  check: string;
}

/** 完了の色を面に混ぜる割合と、文字色を面に混ぜる割合（画面のクラス bg-done/15・bg-on-node/10 と同じ） */
const BADGE_DONE_MIX = 0.15;
const BADGE_NEUTRAL_MIX = 0.1;

/**
 * 進捗バッジの色。100% だけテーマの完了色、それ以外はノードの文字色の薄い面にする。
 * ルートは面が濃いので、ルートの文字色で薄い面を作る（完了色は使わない）
 */
export function getProgressBadgeSpec(progress: number, isRoot: boolean, theme: ThemeConfig): ProgressBadgeSpec {
  if (isRoot) {
    return {
      className: 'bg-on-root/15 text-on-root',
      checkClassName: 'text-on-root',
      bg: mixHex(theme.root.text, theme.root.bg, 0.15),
      text: theme.root.text,
      check: theme.root.text,
    };
  }
  if (progress === 100) {
    return {
      className: 'bg-done/15 text-done',
      checkClassName: 'text-done',
      bg: mixHex(theme.done, theme.node.bg, BADGE_DONE_MIX),
      text: theme.done,
      check: theme.done,
    };
  }
  return {
    className: 'bg-on-node/10 text-on-node',
    checkClassName: 'text-on-node',
    bg: mixHex(theme.node.text, theme.node.bg, BADGE_NEUTRAL_MIX),
    text: theme.node.text,
    check: theme.node.text,
  };
}

/** 太字・斜体・下線のクラス（編集欄と表示用のテキストで共通） */
export function getNodeTextDecorationClass(opts: { isBold: boolean; isItalic: boolean; isUnderline: boolean }): string {
  return [
    opts.isBold ? 'font-bold' : 'font-medium',
    opts.isItalic ? 'italic' : '',
    opts.isUnderline ? 'underline underline-offset-2' : '',
  ].join(' ');
}

/** 編集中の幅。編集を始めた瞬間は node.width のままにし、文字がはみ出したときだけ広げる */
export function getEditingWidth(nodeWidth: number, estimatedWidth: number, overflowBoost: number): number {
  return Math.max(nodeWidth, estimatedWidth) + overflowBoost;
}

/**
 * 外枠の高さ。編集中に元のテキストより行が増えたときだけ、高さを固定せず中身に合わせる
 * @returns CSS の height。undefined なら中身に合わせる
 */
export function getNodeHeightStyle(
  nodeHeight: number,
  isEditing: boolean,
  editText: string,
  nodeText: string
): string | undefined {
  if (!isEditing) return `${nodeHeight}px`;
  const editLines = (editText || '').split('\n').length;
  const originalLines = Math.max(1, (nodeText || '').split('\n').length);
  return editLines <= originalLines ? `${nodeHeight}px` : undefined;
}

/** 外枠の x 座標。編集中に幅が広がるとき、左側のノードは右端、ルートは中央を固定する */
export function getNodeTranslateX(
  node: { x: number; width: number; effectiveSide: 'left' | 'right' },
  isRoot: boolean,
  isEditing: boolean,
  editingWidth: number
): number {
  if (isEditing && node.effectiveSide === 'left') return node.x - (editingWidth - node.width);
  if (isRoot && isEditing) return node.x - (editingWidth - node.width) / 2;
  return node.x;
}

export interface ChildAddButtonSpec {
  side: 'left' | 'right';
  /** DOM の id の接頭辞。後ろにノードの id を付ける */
  idPrefix: string;
  title: string;
}

/** 子ノード追加ボタンを出す向き。ルートのマインドマップ型は左右の 2 つ、それ以外は子が伸びる側に 1 つ */
export function getChildAddSides(
  isRoot: boolean,
  layoutType: LayoutType,
  effectiveSide: 'left' | 'right'
): ChildAddButtonSpec[] {
  if (isRoot && layoutType === 'mindmap') {
    return [
      { side: 'right', idPrefix: 'btn-add-child-right-', title: t('node.addChildRight') },
      { side: 'left', idPrefix: 'btn-add-child-left-', title: t('node.addChildLeft') },
    ];
  }
  const side = isRoot ? (layoutType === 'tree-left' ? 'left' : 'right') : effectiveSide;
  return [{ side, idPrefix: 'btn-add-child-', title: t('node.addChild') }];
}

/** 折りたたみの印の種類。count は閉じているノードの数の印、collapse は開いているノードの「折りたためる」印 */
export type FoldMarker = { kind: 'count'; count: number } | { kind: 'collapse' };

/**
 * 折りたたみの印を出すか。閉じているときは常に数を出し、開いているときはホバーか選択のときだけ小さな印を出す。
 * 子がないノードと編集中のノードには出さない
 */
export function getFoldMarker(
  node: { hasChildren: boolean; isFolded?: boolean; childrenCount: number },
  state: { isEditing: boolean; isHovered: boolean; isSelected: boolean }
): FoldMarker | null {
  if (!node.hasChildren || state.isEditing) return null;
  if (node.isFolded) return { kind: 'count', count: node.childrenCount };
  return state.isHovered || state.isSelected ? { kind: 'collapse' } : null;
}

/** 数の印の最小の幅（px）。1 桁で丸になり、桁が増えると横に伸びる。画面と書き出しで同じ値を使う */
export const FOLD_COUNT_HEIGHT = 16;
export function getFoldCountWidth(count: number): number {
  return Math.max(FOLD_COUNT_HEIGHT, String(count).length * 7 + 8);
}

/**
 * 折りたたみの印を置く側（子が伸びる側）。ルートのマインドマップ型は、今までどおり右。
 * ルートのツリー型は、子が伸びる側
 */
export function getFoldSide(
  isRoot: boolean,
  layoutType: LayoutType,
  effectiveSide: 'left' | 'right'
): 'left' | 'right' {
  if (!isRoot) return effectiveSide;
  return layoutType === 'tree-left' ? 'left' : 'right';
}
