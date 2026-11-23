import { describe, it, expect } from 'vitest';
import {
  AUTO_PAN_MARGIN,
  FIT_ZOOM_MAX,
  FIT_ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_MIN,
  Viewport,
  clampZoom,
  computeAutoPan,
  computeFitView,
  findNodesInRect,
  rectFromPoints,
  screenToWorld,
  worldToScreen,
  ZOOM_BUTTON_STEP,
  zoomAroundPoint,
  zoomAtPoint,
  zoomByStep,
} from './canvasGeometry';
import type { LayoutBounds, PositionedNode } from '../types';

const vp = (overrides: Partial<Viewport> = {}): Viewport => ({
  pan: { x: 0, y: 0 },
  zoom: 1,
  size: { width: 800, height: 600 },
  ...overrides,
});

const bounds = (minX: number, minY: number, maxX: number, maxY: number): LayoutBounds => ({
  minX,
  minY,
  maxX,
  maxY,
  width: maxX - minX,
  height: maxY - minY,
});

const box = (id: string, x: number, y: number, width = 100, height = 40): PositionedNode =>
  ({ id, x, y, width, height }) as PositionedNode;

describe('clampZoom', () => {
  it('ズームが上限と下限の間に収まること', () => {
    expect(clampZoom(10)).toBe(ZOOM_MAX);
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
    expect(clampZoom(1.3)).toBe(1.3);
  });
});

describe('座標の変換', () => {
  it('パンが 0・ズーム 1 のとき、ワールドの原点が画面の中心になること', () => {
    expect(worldToScreen({ x: 0, y: 0 }, vp())).toEqual({ x: 400, y: 300 });
    expect(screenToWorld({ x: 400, y: 300 }, vp())).toEqual({ x: 0, y: 0 });
  });

  it('screenToWorld と worldToScreen が逆変換になること', () => {
    const v = vp({ pan: { x: 37, y: -52 }, zoom: 1.7 });
    const world = { x: 123, y: -45 };
    const back = screenToWorld(worldToScreen(world, v), v);
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });

  it('rectFromPoints が 2 点の順番によらず同じ矩形を返すこと', () => {
    expect(rectFromPoints({ x: 10, y: 50 }, { x: 0, y: 20 })).toEqual({ minX: 0, minY: 20, maxX: 10, maxY: 50 });
  });
});

describe('zoomAtPoint', () => {
  it('上方向のホイールで拡大し、下方向で縮小すること', () => {
    expect(zoomAtPoint(vp(), { x: 0, y: 0 }, -1).zoom).toBeCloseTo(1.1);
    expect(zoomAtPoint(vp(), { x: 0, y: 0 }, 1).zoom).toBeCloseTo(0.9);
  });

  it('マウスの下にあるワールド座標が、ズームの前後で変わらないこと', () => {
    const before = vp({ pan: { x: 30, y: -20 }, zoom: 1.2 });
    const mouse = { x: 150, y: -80 }; // ビューポート中心基準
    const { pan, zoom } = zoomAtPoint(before, mouse, -1);
    const after = { ...before, pan, zoom };
    const toScreen = (m: { x: number; y: number }) => ({ x: m.x + 400, y: m.y + 300 });
    const w1 = screenToWorld(toScreen(mouse), before);
    const w2 = screenToWorld(toScreen(mouse), after);
    expect(w2.x).toBeCloseTo(w1.x);
    expect(w2.y).toBeCloseTo(w1.y);
  });

  it('上限を超えて拡大しないこと', () => {
    expect(zoomAtPoint(vp({ zoom: ZOOM_MAX }), { x: 0, y: 0 }, -1).zoom).toBe(ZOOM_MAX);
  });
});

describe('zoomAroundPoint', () => {
  it('指定した点の下にあるワールド座標が、ズームの前後で変わらないこと', () => {
    const before = vp({ pan: { x: -120, y: 45 }, zoom: 0.8 });
    const anchor = { x: 60, y: -90 };
    const { pan, zoom } = zoomAroundPoint(before, anchor, 2);
    expect(zoom).toBe(2);
    const toScreen = (m: { x: number; y: number }) => ({ x: m.x + 400, y: m.y + 300 });
    const w1 = screenToWorld(toScreen(anchor), before);
    const w2 = screenToWorld(toScreen(anchor), { ...before, pan, zoom });
    expect(w2.x).toBeCloseTo(w1.x);
    expect(w2.y).toBeCloseTo(w1.y);
  });

  it('上限・下限に収めたズームに合わせて、パンを補正すること', () => {
    const before = vp({ pan: { x: 100, y: 0 }, zoom: 2 });
    const { pan, zoom } = zoomAroundPoint(before, { x: 0, y: 0 }, 100);
    expect(zoom).toBe(ZOOM_MAX);
    expect(pan.x).toBeCloseTo((100 * ZOOM_MAX) / 2);
  });
});

describe('zoomByStep', () => {
  const center = { x: 400, y: 300 }; // 800 × 600 の画面の中心（コンテナ左上基準）

  it.each([ZOOM_BUTTON_STEP, -ZOOM_BUTTON_STEP])('step=%s のとき、画面の中心にあるワールド座標が変わらないこと', (step) => {
    // ルートから離れた場所を見ている（パンが 0 でない）状態
    const before = vp({ pan: { x: -500, y: 260 }, zoom: 1.3 });
    const { pan, zoom } = zoomByStep(before, step);
    expect(zoom).toBeCloseTo(1.3 + step);
    const w1 = screenToWorld(center, before);
    const w2 = screenToWorld(center, { ...before, pan, zoom });
    expect(w2.x).toBeCloseTo(w1.x);
    expect(w2.y).toBeCloseTo(w1.y);
  });

  it('パンが 0（ルートが中心）のときは、パンが 0 のままであること', () => {
    expect(zoomByStep(vp(), ZOOM_BUTTON_STEP).pan).toEqual({ x: 0, y: 0 });
  });

  it('上限・下限では、ズームもパンも変わらないこと', () => {
    const atMax = vp({ pan: { x: -80, y: 40 }, zoom: ZOOM_MAX });
    expect(zoomByStep(atMax, ZOOM_BUTTON_STEP)).toEqual({ zoom: ZOOM_MAX, pan: { x: -80, y: 40 } });
    const atMin = vp({ pan: { x: -80, y: 40 }, zoom: ZOOM_MIN });
    const out = zoomByStep(atMin, -ZOOM_BUTTON_STEP);
    expect(out.zoom).toBe(ZOOM_MIN);
    expect(out.pan.x).toBeCloseTo(-80);
    expect(out.pan.y).toBeCloseTo(40);
  });
});

describe('computeFitView', () => {
  it('マップの幅か高さが 0 のとき null を返すこと', () => {
    expect(computeFitView(bounds(0, 0, 0, 100), { width: 800, height: 600 })).toBeNull();
  });

  it('マップの中心を返すこと', () => {
    const fit = computeFitView(bounds(-100, -50, 300, 150), { width: 800, height: 600 });
    expect(fit?.center).toEqual({ x: 100, y: 50 });
  });

  it('ズームが全体表示用の上限と下限に収まること', () => {
    expect(computeFitView(bounds(0, 0, 10, 10), { width: 800, height: 600 })?.zoom).toBe(FIT_ZOOM_MAX);
    expect(computeFitView(bounds(0, 0, 100000, 100000), { width: 800, height: 600 })?.zoom).toBe(FIT_ZOOM_MIN);
  });

  it('余白を除いた領域に収まるズームを選ぶこと', () => {
    // 利用できる領域は 600 x 400。幅 1000 なら 0.6
    expect(computeFitView(bounds(0, 0, 1000, 100), { width: 800, height: 600 })?.zoom).toBeCloseTo(0.6);
  });
});

describe('computeAutoPan', () => {
  it('ノードが画面の中央付近にあるときはパンしないこと', () => {
    expect(computeAutoPan({ x: 0, y: 0 }, vp())).toBeNull();
  });

  it('ノードが右端に近いとき、余白の内側に戻るようにパンすること', () => {
    const v = vp();
    const pan = computeAutoPan({ x: 390, y: 0 }, v);
    expect(pan).not.toBeNull();
    const screen = worldToScreen({ x: 390, y: 0 }, { ...v, pan: pan! });
    expect(screen.x).toBe(800 - AUTO_PAN_MARGIN);
    expect(pan!.y).toBe(0);
  });

  it('ノードが左上に近いとき、両方向にパンすること', () => {
    const pan = computeAutoPan({ x: -390, y: -290 }, vp());
    expect(pan).toEqual({ x: AUTO_PAN_MARGIN - 10, y: AUTO_PAN_MARGIN - 10 });
  });
});

describe('findNodesInRect', () => {
  const nodes = [box('a', 0, 0), box('b', 200, 0), box('c', 0, 200)];

  it('矩形と重なるノードだけを返すこと', () => {
    expect(findNodesInRect(nodes, { minX: 50, minY: 10, maxX: 250, maxY: 20 })).toEqual(['a', 'b']);
  });

  it('端が接しているだけのノードも含むこと', () => {
    expect(findNodesInRect(nodes, { minX: 100, minY: 240, maxX: 150, maxY: 300 })).toEqual(['c']);
  });

  it('どのノードとも重ならなければ空配列を返すこと', () => {
    expect(findNodesInRect(nodes, { minX: 500, minY: 500, maxX: 600, maxY: 600 })).toEqual([]);
  });
});
