import type { LayoutBounds } from '../types';
import type { Point, Viewport } from './canvasGeometry';

/** ミニマップの枠の大きさ（px） */
export const MINIMAP_WIDTH = 200;
export const MINIMAP_HEIGHT = 130;

/** 縮尺を決めるときの、マップの範囲の下限。小さなマップが大きく映りすぎないようにする */
const MIN_BOUNDS_WIDTH = 700;
const MIN_BOUNDS_HEIGHT = 450;
/** 枠いっぱいにせず、周りに余白を残すための係数 */
const FILL_RATIO = 0.82;

/** 小さくなりすぎて見えなくならないための、大きさの下限（px） */
const MIN_NODE_WIDTH = 4;
const MIN_NODE_HEIGHT = 2.5;
const MIN_VIEWPORT_RECT_SIZE = 10;
const MIN_SELECTION_WIDTH = 12;
const MIN_SELECTION_HEIGHT = 10;
/** 選択の印を、ノードより外側に広げる幅（px） */
const SELECTION_PADDING = 4;

/** ワールド座標とミニマップ上の座標の対応。マップの範囲の中心が、ミニマップの中心に来る */
export interface MinimapTransform {
  scale: number;
  boundsCenterX: number;
  boundsCenterY: number;
}

/** ミニマップの枠の左上を基準にした位置と大きさ（px） */
export interface MinimapRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface WorldBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function createMinimapTransform(bounds: LayoutBounds): MinimapTransform {
  const boundW = Math.max(bounds.width, MIN_BOUNDS_WIDTH);
  const boundH = Math.max(bounds.height, MIN_BOUNDS_HEIGHT);
  return {
    scale: Math.min(MINIMAP_WIDTH / boundW, MINIMAP_HEIGHT / boundH) * FILL_RATIO,
    boundsCenterX: (bounds.minX + bounds.maxX) / 2,
    boundsCenterY: (bounds.minY + bounds.maxY) / 2,
  };
}

export function worldToMinimap(p: Point, t: MinimapTransform): Point {
  return {
    x: MINIMAP_WIDTH / 2 + (p.x - t.boundsCenterX) * t.scale,
    y: MINIMAP_HEIGHT / 2 + (p.y - t.boundsCenterY) * t.scale,
  };
}

/** ミニマップ上の座標 → ワールド座標。枠の外の座標は、枠の端に寄せてから変換する */
export function minimapToWorld(p: Point, t: MinimapTransform): Point {
  const x = Math.max(0, Math.min(MINIMAP_WIDTH, p.x));
  const y = Math.max(0, Math.min(MINIMAP_HEIGHT, p.y));
  return {
    x: t.boundsCenterX + (x - MINIMAP_WIDTH / 2) / t.scale,
    y: t.boundsCenterY + (y - MINIMAP_HEIGHT / 2) / t.scale,
  };
}

export function getMinimapNodeRect(node: WorldBox, t: MinimapTransform): MinimapRect {
  const pos = worldToMinimap(node, t);
  return {
    left: pos.x,
    top: pos.y,
    width: Math.max(MIN_NODE_WIDTH, node.width * t.scale),
    height: Math.max(MIN_NODE_HEIGHT, node.height * t.scale),
  };
}

/** 選択中のノードを囲む印 */
export function getMinimapSelectionRect(node: WorldBox, t: MinimapTransform): MinimapRect {
  const pos = worldToMinimap(node, t);
  return {
    left: pos.x - SELECTION_PADDING,
    top: pos.y - SELECTION_PADDING,
    width: Math.max(MIN_SELECTION_WIDTH, node.width * t.scale + SELECTION_PADDING * 2),
    height: Math.max(MIN_SELECTION_HEIGHT, node.height * t.scale + SELECTION_PADDING * 2),
  };
}

/** いま画面に映っている範囲を示す枠 */
export function getMinimapViewportRect(vp: Viewport, t: MinimapTransform): MinimapRect {
  // 画面の左上に映っているワールド座標
  const topLeft = worldToMinimap(
    {
      x: (-vp.pan.x - vp.size.width / 2) / vp.zoom,
      y: (-vp.pan.y - vp.size.height / 2) / vp.zoom,
    },
    t
  );
  return {
    left: topLeft.x,
    top: topLeft.y,
    width: Math.max(MIN_VIEWPORT_RECT_SIZE, (vp.size.width / vp.zoom) * t.scale),
    height: Math.max(MIN_VIEWPORT_RECT_SIZE, (vp.size.height / vp.zoom) * t.scale),
  };
}
