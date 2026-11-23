import type { MessageKey } from './i18n';

export type LayoutType = 'mindmap' | 'tree-right' | 'tree-left';
/** 新しいマップ・layoutType のないマップのレイアウト */
export const DEFAULT_LAYOUT_TYPE: LayoutType = 'tree-right';
/** 接続線の種類。保存形式（フロントマターの connectorStyle）の値でもある */
export const CONNECTOR_STYLES = ['curved', 'rounded', 'straight', 'arc'] as const;
export type ConnectorStyle = (typeof CONNECTOR_STYLES)[number];
/** 新しいマップ・connectorStyle のないマップ・知らない値のときの接続線 */
export const DEFAULT_CONNECTOR_STYLE: ConnectorStyle = 'arc';
export type NodeShape = 'rounded' | 'pill' | 'underline' | 'borderless';
export type EditInputMode = 'overwrite' | 'append';
export type SaveStatus = 'saved' | 'saving' | 'error';
export type NodeFontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface MindNode {
  id: string;
  parentId: string | null;
  text: string;
  note?: string;
  link?: string;
  image?: string; // Image URL or Data URL (base64)
  imageWidth?: number; // 画像の表示の幅（px）。つまみで変えたときだけ入る
  imageAspect?: number; // 画像の縦横比（幅 ÷ 高さ）。分かったときだけ入る
  color?: string; // Custom node or branch color override
  icon?: string; // Lucide icon name
  progress?: number; // 0, 25, 50, 75, 100
  isFolded?: boolean;
  shape?: NodeShape;
  fontSize?: NodeFontSize;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  side?: 'left' | 'right'; // For root's direct children in radial mindmap
  order?: number; // Sibling order index
  createdAt: number;
  updatedAt: number;
}

export interface MindRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string; // 関連線のラベル（例: "起因する", "依存"）
  color?: string; // 線の色 override
  style?: 'dashed' | 'solid'; // 線種（デフォルト: dashed）
  arrow?: 'forward' | 'both' | 'none'; // 矢印の向き（デフォルト: forward）
}

export interface MindMap {
  id: string;
  title: string;
  rootId: string;
  nodes: Record<string, MindNode>;
  relationships?: Record<string, MindRelationship>;
  themeId: string;
  /** 書体の id（`fontStyles.ts` の FontStyleId）。なくした書体・知らない値も、ファイルの値を保つため string のまま持つ */
  fontFamily?: string;
  layoutType: LayoutType;
  connectorStyle: ConnectorStyle;
  createdAt: number;
  updatedAt: number;
}

export interface PositionedNode extends MindNode {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  effectiveSide: 'left' | 'right';
  hasChildren: boolean;
  childrenCount: number;
  branchColor: string;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  path: string;
  color: string;
  isRootBranch: boolean;
  sourcePoint: { x: number; y: number };
  targetPoint: { x: number; y: number };
}

export interface LayoutBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  nodes: PositionedNode[];
  connections: Connection[];
  bounds: LayoutBounds;
  nodeMap: Map<string, PositionedNode>;
}

/** UI（ツールバー・メニュー・パネルなど）の灰色。いずれも 16 進の色。画面は CSS 変数（--mf-*）で使う */
export interface UiPalette {
  /** メニュー・パネル・バー・モーダルの面 */
  surface: string;
  /** 沈んだ面（読み込み中の画面・一覧の地・ミニマップ） */
  surfaceSunken: string;
  /** hover の面、選択中の面、灰色の枠 */
  surfaceMuted: string;
  /** 一段濃い面（muted の上の hover、kbd） */
  surfaceStrong: string;
  /** 区切り線 */
  lineSubtle: string;
  /** 外枠・入力欄・ボタンの枠 */
  line: string;
  /** 濃い枠、スイッチのオフ、スクロールバー */
  lineStrong: string;
  /** 補助文字・アイコン・プレースホルダー */
  inkMuted: string;
  /** 本文、スイッチのオン */
  ink: string;
  /** 見出し・選択中の文字・アプリ全体の文字色 */
  inkStrong: string;
}

export interface ThemeConfig {
  id: string;
  nameKey: MessageKey;
  bgClass: string;
  isDark: boolean;
  canvasGridClass: string;
  /** 状態色（選択・フォーカス・ドロップ位置）。16 進の色 */
  accent: string;
  /** accent の上に載せる文字の色。16 進の色 */
  onAccent: string;
  /** 完了の色（進捗 100% のバッジとチェック）。16 進の色 */
  done: string;
  /** ルートノードの色。いずれも 16 進の色（画面は CSS 変数、書き出しは SVG の属性で使う） */
  root: {
    bg: string;
    text: string;
    border: string;
  };
  /** 通常のノードの色。いずれも 16 進の色（ルートと同じく、画面は CSS 変数、書き出しは SVG の属性で使う） */
  node: {
    bg: string;
    text: string;
    border: string;
  };
  /** UI の灰色（面・境界・文字） */
  ui: UiPalette;
  lineColor: string;
  branchColors: string[];
}
