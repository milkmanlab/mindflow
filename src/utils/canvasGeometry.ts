import type { LayoutBounds, PositionedNode } from '../types';

// ズーム
export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 4;
export const ZOOM_BUTTON_STEP = 0.15;
export const WHEEL_ZOOM_IN_FACTOR = 1.1;
export const WHEEL_ZOOM_OUT_FACTOR = 0.9;

// 全体表示（画面に収める）
export const FIT_PADDING = 100;
export const FIT_MIN_AVAILABLE_SIZE = 200;
export const FIT_ZOOM_MIN = 0.3;
export const FIT_ZOOM_MAX = 1.15;

/** 選択ノードがこの距離（px）より画面の端に近づいたら自動でパンする */
export const AUTO_PAN_MARGIN = 120;
/** これより小さいドラッグは範囲選択とみなさない（px） */
export const RUBBER_BAND_MIN_DRAG = 5;
/** 実測前のビューポートの大きさ */
export const DEFAULT_VIEWPORT_SIZE: Size = { width: 800, height: 600 };

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** ワールド座標の原点は、パンが 0 のときビューポートの中心に来る */
export interface Viewport {
  pan: Point;
  zoom: number;
  size: Size;
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/** コンテナ左上基準の画面座標 → ワールド座標 */
export function screenToWorld(p: Point, vp: Viewport): Point {
  return {
    x: (p.x - vp.size.width / 2 - vp.pan.x) / vp.zoom,
    y: (p.y - vp.size.height / 2 - vp.pan.y) / vp.zoom,
  };
}

/** ワールド座標 → コンテナ左上基準の画面座標 */
export function worldToScreen(p: Point, vp: Viewport): Point {
  return {
    x: vp.size.width / 2 + vp.pan.x + p.x * vp.zoom,
    y: vp.size.height / 2 + vp.pan.y + p.y * vp.zoom,
  };
}

export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

/**
 * anchor の下にあるワールド座標が動かないようにズームを変える。anchor はビューポート中心を原点とする座標。
 * 新しいズームは上限・下限に収め、パンはその収めた後のズームに合わせて補正する
 */
export function zoomAroundPoint(vp: Viewport, anchor: Point, newZoom: number): { pan: Point; zoom: number } {
  const zoom = clampZoom(newZoom);
  return {
    zoom,
    pan: {
      x: anchor.x - ((anchor.x - vp.pan.x) / vp.zoom) * zoom,
      y: anchor.y - ((anchor.y - vp.pan.y) / vp.zoom) * zoom,
    },
  };
}

/**
 * ホイール 1 回分のズーム。mouse はビューポート中心を原点とする座標。
 * マウスの下にあるワールド座標が動かないようにパンを補正する。
 */
export function zoomAtPoint(vp: Viewport, mouse: Point, deltaY: number): { pan: Point; zoom: number } {
  const factor = deltaY < 0 ? WHEEL_ZOOM_IN_FACTOR : WHEEL_ZOOM_OUT_FACTOR;
  return zoomAroundPoint(vp, mouse, vp.zoom * factor);
}

/** ボタン 1 回分のズーム（step が負なら縮小）。画面の中心にあるワールド座標が動かないようにパンを補正する */
export function zoomByStep(vp: Viewport, step: number): { pan: Point; zoom: number } {
  return zoomAroundPoint(vp, { x: 0, y: 0 }, vp.zoom + step);
}

/** 全体を画面に収めるための中心（ワールド座標）とズーム。マップの幅か高さが 0 なら null */
export function computeFitView(bounds: LayoutBounds, size: Size): { center: Point; zoom: number } | null {
  if (bounds.width === 0 || bounds.height === 0) return null;

  const availW = Math.max(FIT_MIN_AVAILABLE_SIZE, size.width - FIT_PADDING * 2);
  const availH = Math.max(FIT_MIN_AVAILABLE_SIZE, size.height - FIT_PADDING * 2);
  const scale = Math.min(availW / bounds.width, availH / bounds.height);

  return {
    center: { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 },
    zoom: Math.max(FIT_ZOOM_MIN, Math.min(FIT_ZOOM_MAX, scale)),
  };
}

/** ノードが画面の端から AUTO_PAN_MARGIN 以内にあれば、収まるように調整したパンを返す。不要なら null */
export function computeAutoPan(nodePos: Point, vp: Viewport): Point | null {
  const screen = worldToScreen(nodePos, vp);
  const { width, height } = vp.size;
  const offsetX = marginOffset(screen.x, width);
  const offsetY = marginOffset(screen.y, height);
  if (offsetX === 0 && offsetY === 0) return null;
  return { x: vp.pan.x + offsetX, y: vp.pan.y + offsetY };
}

/** 1 軸ぶんの、余白内に戻すためのずらし量 */
function marginOffset(pos: number, length: number): number {
  if (pos < AUTO_PAN_MARGIN) return AUTO_PAN_MARGIN - pos;
  if (pos > length - AUTO_PAN_MARGIN) return length - AUTO_PAN_MARGIN - pos;
  return 0;
}

/** ワールド座標の矩形と重なるノードの id */
export function findNodesInRect(nodes: PositionedNode[], rect: Rect): string[] {
  return nodes
    .filter(
      (n) =>
        !(n.x + n.width < rect.minX || n.x > rect.maxX || n.y + n.height < rect.minY || n.y > rect.maxY)
    )
    .map((n) => n.id);
}
