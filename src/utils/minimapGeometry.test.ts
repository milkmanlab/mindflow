import { describe, expect, it } from 'vitest';
import type { LayoutBounds } from '../types';
import {
  MINIMAP_HEIGHT,
  MINIMAP_WIDTH,
  MinimapTransform,
  createMinimapTransform,
  getMinimapNodeRect,
  getMinimapSelectionRect,
  getMinimapViewportRect,
  minimapToWorld,
  worldToMinimap,
} from './minimapGeometry';

function boundsOf(minX: number, minY: number, maxX: number, maxY: number): LayoutBounds {
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** 計算しやすい縮尺（0.1）で、範囲の中心が (100, -50) にある対応 */
const T: MinimapTransform = { scale: 0.1, boundsCenterX: 100, boundsCenterY: -50 };

describe('createMinimapTransform', () => {
  it('小さなマップは、範囲の下限（700 × 450）で縮尺を決めること', () => {
    const t = createMinimapTransform(boundsOf(-50, -50, 50, 50));
    expect(t.scale).toBeCloseTo((200 / 700) * 0.82, 10);
  });

  it('横に長いマップは、幅に合わせて縮尺を決めること', () => {
    const t = createMinimapTransform(boundsOf(-1000, -325, 1000, 325));
    expect(t.scale).toBeCloseTo(0.1 * 0.82, 10);
  });

  it('縦に長いマップは、高さに合わせて縮尺を決めること', () => {
    const t = createMinimapTransform(boundsOf(-350, -650, 350, 650));
    expect(t.scale).toBeCloseTo(0.1 * 0.82, 10);
  });

  it('範囲の中心を求めること', () => {
    const t = createMinimapTransform(boundsOf(-100, -300, 500, 100));
    expect(t.boundsCenterX).toBe(200);
    expect(t.boundsCenterY).toBe(-100);
  });
});

describe('worldToMinimap / minimapToWorld', () => {
  it('範囲の中心が、ミニマップの中心に来ること', () => {
    expect(worldToMinimap({ x: 100, y: -50 }, T)).toEqual({ x: MINIMAP_WIDTH / 2, y: MINIMAP_HEIGHT / 2 });
  });

  it('中心からの距離が、縮尺のぶんだけ縮むこと', () => {
    expect(worldToMinimap({ x: 200, y: 50 }, T)).toEqual({ x: 110, y: 75 });
  });

  it('枠の中の座標は、往復して元に戻ること', () => {
    const mini = worldToMinimap({ x: 200, y: 50 }, T);
    const world = minimapToWorld(mini, T);
    expect(world.x).toBeCloseTo(200, 10);
    expect(world.y).toBeCloseTo(50, 10);
  });

  it('枠の外の座標は、枠の端に寄せてから変換すること', () => {
    const world = minimapToWorld({ x: -20, y: 500 }, T);
    expect(world.x).toBeCloseTo(-900, 10);
    expect(world.y).toBeCloseTo(600, 10);
  });
});

describe('getMinimapNodeRect', () => {
  it('ノードの左上の位置と、縮めた大きさになること', () => {
    expect(getMinimapNodeRect({ x: 200, y: 50, width: 120, height: 40 }, T)).toEqual({
      left: 110,
      top: 75,
      width: 12,
      height: 4,
    });
  });

  it('小さなノードは、下限（4 × 2.5）の大きさになること', () => {
    const rect = getMinimapNodeRect({ x: 200, y: 50, width: 10, height: 10 }, T);
    expect(rect.width).toBe(4);
    expect(rect.height).toBe(2.5);
  });
});

describe('getMinimapSelectionRect', () => {
  it('ノードより 4px ずつ外側に広がること', () => {
    expect(getMinimapSelectionRect({ x: 200, y: 50, width: 120, height: 40 }, T)).toEqual({
      left: 106,
      top: 71,
      width: 20,
      height: 12,
    });
  });

  it('小さなノードは、下限（12 × 10）の大きさになること', () => {
    const rect = getMinimapSelectionRect({ x: 200, y: 50, width: 10, height: 10 }, T);
    expect(rect.width).toBe(12);
    expect(rect.height).toBe(10);
  });
});

describe('getMinimapViewportRect', () => {
  it('パンが 0・ズーム 100% のとき、ワールドの原点を中心にした範囲になること', () => {
    const rect = getMinimapViewportRect({ pan: { x: 0, y: 0 }, zoom: 1, size: { width: 800, height: 600 } }, T);
    expect(rect).toEqual({ left: 50, top: 40, width: 80, height: 60 });
  });

  it('パンとズームを変えると、位置が動き、大きさがズームのぶんだけ小さくなること', () => {
    const rect = getMinimapViewportRect(
      { pan: { x: -200, y: 100 }, zoom: 2, size: { width: 800, height: 600 } },
      T
    );
    expect(rect).toEqual({ left: 80, top: 50, width: 40, height: 30 });
  });

  it('小さくなりすぎるときは、下限（10 × 10）の大きさになること', () => {
    const rect = getMinimapViewportRect(
      { pan: { x: 0, y: 0 }, zoom: 2.5, size: { width: 200, height: 200 } },
      T
    );
    expect(rect.width).toBe(10);
    expect(rect.height).toBe(10);
  });
});
