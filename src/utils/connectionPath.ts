import { Connection, ConnectorStyle, NodeShape } from '../types';

/** 接続線の太さ（px）。ルートから出る枝と、それ以外。画面と書き出しで同じ値を使う */
export const CONNECTION_WIDTH = { rootBranch: 2.5, branch: 1.6 } as const;

/** 「角丸」の線の角の半径（線が短いときは、縦・横の距離の半分まで小さくする） */
const ROUNDED_CORNER_RADIUS = 16;
/** 「角丸」の線で、始点と終点の高さの差がこれ未満なら直線にする */
const ROUNDED_STRAIGHT_THRESHOLD = 4;
/** 「曲線」の制御点を、横の距離のどの割合の位置に置くか */
const CURVE_CONTROL_RATIO = 0.45;
/** 「弧」の制御点を、横の距離のどの割合の位置に置くか（0 なら親から垂直に出る） */
const ARC_CONTROL_RATIO = 0.4;

interface Point {
  x: number;
  y: number;
}

/** 位置と大きさ。PositionedNode をそのまま渡せる */
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  /** ノードの形。「下線のみ」のときは、線を下線の高さにつなぐ */
  shape?: NodeShape;
  /** 階層。0 はルート（ルートは形によらず、辺の中央につなぐ） */
  depth?: number;
}

/** 「下線のみ」の下線（幅 2px）の中央が、ノードの下端から何 px 上か */
const UNDERLINE_CENTER_OFFSET = 1;

/** 接続線がノードにつながる高さ。ふつうは辺の中央、「下線のみ」は下線の高さ */
export function getAnchorY(node: Rect): number {
  if (node.shape === 'underline' && (node.depth ?? 1) > 0) return node.y + node.height - UNDERLINE_CENTER_OFFSET;
  return node.y + node.height / 2;
}

export interface ConnectionParams {
  parent: Rect;
  child: Rect;
  /** 子が親のどちら側にあるか */
  side: 'left' | 'right';
  sourceId: string;
  targetId: string;
  color: string;
  isRootBranch: boolean;
  style: ConnectorStyle;
}

function straightPath(start: Point, end: Point): string {
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

/** 中間の x で直角に曲がり、角を丸めた線 */
function roundedPath(start: Point, end: Point): string {
  if (Math.abs(end.y - start.y) < ROUNDED_STRAIGHT_THRESHOLD) return straightPath(start, end);

  const midX = (start.x + end.x) / 2;
  const r = Math.min(ROUNDED_CORNER_RADIUS, Math.abs(end.y - start.y) / 2, Math.abs(end.x - start.x) / 2);
  const dirY = end.y > start.y ? 1 : -1;
  const dirX = end.x > start.x ? 1 : -1;
  return `M ${start.x} ${start.y} L ${midX - dirX * r} ${start.y} Q ${midX} ${start.y} ${midX} ${start.y + dirY * r} L ${midX} ${end.y - dirY * r} Q ${midX} ${end.y} ${midX + dirX * r} ${end.y} L ${end.x} ${end.y}`;
}

/** S 字のベジェ曲線 */
function curvedPath(start: Point, end: Point, side: 'left' | 'right'): string {
  const dx = Math.abs(end.x - start.x);
  const cp1x = side === 'right' ? start.x + dx * CURVE_CONTROL_RATIO : start.x - dx * CURVE_CONTROL_RATIO;
  const cp2x = side === 'right' ? end.x - dx * CURVE_CONTROL_RATIO : end.x + dx * CURVE_CONTROL_RATIO;
  return `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp2x} ${end.y}, ${end.x} ${end.y}`;
}

/** 親の 1 点から子の方向へ斜めに出て、子へは水平に入る、曲がりが 1 回の線 */
function arcPath(start: Point, end: Point, side: 'left' | 'right'): string {
  const dx = Math.abs(end.x - start.x) * ARC_CONTROL_RATIO;
  const cx = side === 'right' ? start.x + dx : start.x - dx;
  return `M ${start.x} ${start.y} Q ${cx} ${end.y} ${end.x} ${end.y}`;
}

/** 始点から終点へ引く線のパス（設定メニューの見本も、これで描く） */
export function buildPath(start: Point, end: Point, side: 'left' | 'right', style: ConnectorStyle): string {
  if (style === 'straight') return straightPath(start, end);
  if (style === 'rounded') return roundedPath(start, end);
  if (style === 'arc') return arcPath(start, end, side);
  return curvedPath(start, end, side);
}

/**
 * 親と子をつなぐ接続線（始点・終点・SVG のパス）を作る。
 * 親の、子がある側の辺の中央から、子の、親に近い側の辺の中央へ引く（「下線のみ」のノードは、下線の高さ）
 */
export function createConnection(params: ConnectionParams): Connection {
  const { parent, child, side, sourceId, targetId } = params;
  const start: Point = {
    x: side === 'right' ? parent.x + parent.width : parent.x,
    y: getAnchorY(parent),
  };
  const end: Point = {
    x: side === 'right' ? child.x : child.x + child.width,
    y: getAnchorY(child),
  };

  return {
    id: `${sourceId}->${targetId}`,
    sourceId,
    targetId,
    path: buildPath(start, end, side, params.style),
    color: params.color,
    isRootBranch: params.isRootBranch,
    sourcePoint: start,
    targetPoint: end,
  };
}
