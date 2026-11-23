import type { PositionedNode } from '../types';
import { Size, Viewport, worldToScreen } from './canvasGeometry';

/** ノードとバーの間隔（px） */
export const NODE_BAR_GAP = 8;
/** 画面の端からの余白（px） */
export const NODE_BAR_EDGE_MARGIN = 8;

/** バーの拡大率の範囲。ノードのズームに合わせるが、小さすぎて読めない・大きすぎて邪魔にならない範囲で止める */
export const BAR_SCALE_MIN = 0.75;
export const BAR_SCALE_MAX = 1.4;

/** ズームに合わせたバーの拡大率 */
export function barScaleForZoom(zoom: number): number {
  return Math.min(BAR_SCALE_MAX, Math.max(BAR_SCALE_MIN, zoom));
}

/** ノードの画面上の矩形（コンテナ左上基準） */
export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** ノードの画面上の矩形。ノードの x・y は左上、width・height はワールド座標での大きさ */
export function nodeScreenRect(node: Pick<PositionedNode, 'x' | 'y' | 'width' | 'height'>, vp: Viewport): ScreenRect {
  const topLeft = worldToScreen({ x: node.x, y: node.y }, vp);
  return { left: topLeft.x, top: topLeft.y, width: node.width * vp.zoom, height: node.height * vp.zoom };
}

/** value を [min, max] に収める。範囲が逆転しているとき（バーが画面より広い）は min */
function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * ノードのバーの左上の位置（コンテナ左上基準）。ノードの上に、左端を揃えて置く。
 * 画面の上端・左右の端からはみ出すときは内側で止める（ノードに重なってよい）。
 * ノードが画面の外にあるときは null
 */
export function computeNodeBarPosition(args: {
  node: ScreenRect;
  bar: Size;
  viewport: Size;
}): { left: number; top: number } | null {
  const { node, bar, viewport } = args;

  const isOutside =
    node.left + node.width <= 0 ||
    node.top + node.height <= 0 ||
    node.left >= viewport.width ||
    node.top >= viewport.height;
  if (isOutside) return null;

  // 幅 0 の対象（関連線の中点）は、バーの中央を合わせる
  const alignLeft = node.width === 0 ? node.left - bar.width / 2 : node.left;
  const aboveTop = node.top - NODE_BAR_GAP - bar.height;
  return {
    left: clamp(alignLeft, NODE_BAR_EDGE_MARGIN, viewport.width - NODE_BAR_EDGE_MARGIN - bar.width),
    top: Math.max(aboveTop, NODE_BAR_EDGE_MARGIN),
  };
}
