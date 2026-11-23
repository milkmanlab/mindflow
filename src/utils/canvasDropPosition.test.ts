import { describe, it, expect } from 'vitest';
import { computeDropPosition, computeRootDropSide, resolveDropPosition, DropPositionInput } from './canvasDropPosition';

const input = (overrides: Partial<DropPositionInput> = {}): DropPositionInput => ({
  ratioX: 0.5,
  ratioY: 0.5,
  isAlt: false,
  isRoot: false,
  childSide: 'right',
  ...overrides,
});

describe('computeDropPosition', () => {
  it('ルートには常に中へ入れること', () => {
    expect(computeDropPosition(input({ isRoot: true, ratioY: 0 }))).toBe('inside');
    expect(computeDropPosition(input({ isRoot: true, isAlt: true, ratioY: 1 }))).toBe('inside');
  });

  it('Alt を押しているときは、上半分で前・下半分で後ろになり、中には入らないこと', () => {
    expect(computeDropPosition(input({ isAlt: true, ratioY: 0.49 }))).toBe('before');
    expect(computeDropPosition(input({ isAlt: true, ratioY: 0.5 }))).toBe('after');
  });

  it('子が伸びる側では、上下 15% だけが前後になること', () => {
    // 右に伸びるノードの右寄り
    expect(computeDropPosition(input({ ratioX: 0.8, ratioY: 0.14 }))).toBe('before');
    expect(computeDropPosition(input({ ratioX: 0.8, ratioY: 0.2 }))).toBe('inside');
    expect(computeDropPosition(input({ ratioX: 0.8, ratioY: 0.8 }))).toBe('inside');
    expect(computeDropPosition(input({ ratioX: 0.8, ratioY: 0.86 }))).toBe('after');
  });

  it('親の線が来る側では、上下 25% が前後になること', () => {
    // 右に伸びるノードの左寄り
    expect(computeDropPosition(input({ ratioX: 0.2, ratioY: 0.2 }))).toBe('before');
    expect(computeDropPosition(input({ ratioX: 0.2, ratioY: 0.5 }))).toBe('inside');
    expect(computeDropPosition(input({ ratioX: 0.2, ratioY: 0.8 }))).toBe('after');
  });

  it('左に伸びるノードでは、左寄りが子の伸びる側になること', () => {
    expect(computeDropPosition(input({ childSide: 'left', ratioX: 0.2, ratioY: 0.2 }))).toBe('inside');
    expect(computeDropPosition(input({ childSide: 'left', ratioX: 0.8, ratioY: 0.2 }))).toBe('before');
  });

  it('横位置の境界（右に伸びる 0.4、左に伸びる 0.6）は子の伸びる側に含むこと', () => {
    expect(computeDropPosition(input({ ratioX: 0.4, ratioY: 0.2 }))).toBe('inside');
    expect(computeDropPosition(input({ childSide: 'left', ratioX: 0.6, ratioY: 0.2 }))).toBe('inside');
  });
});

describe('resolveDropPosition', () => {
  it('位置が未定なら中へ入れること', () => {
    expect(resolveDropPosition(null, false, false)).toBe('inside');
  });

  it('Alt を押していてルート以外なら、中へではなく後ろに並べること', () => {
    expect(resolveDropPosition('inside', true, false)).toBe('after');
    expect(resolveDropPosition(null, true, false)).toBe('after');
  });

  it('ルートへの Alt ドロップは中へのままにすること', () => {
    expect(resolveDropPosition('inside', true, true)).toBe('inside');
  });

  it('前後が決まっていればそのまま使うこと', () => {
    expect(resolveDropPosition('before', true, false)).toBe('before');
    expect(resolveDropPosition('after', false, false)).toBe('after');
  });
});

describe('computeRootDropSide', () => {
  const base = { ratioX: 0.2, isRoot: true, layoutType: 'mindmap' as const };

  it('放射状のルートでは、左半分なら左・右半分なら右になること', () => {
    expect(computeRootDropSide({ ...base, ratioX: 0 })).toBe('left');
    expect(computeRootDropSide({ ...base, ratioX: 0.49 })).toBe('left');
    expect(computeRootDropSide({ ...base, ratioX: 0.5 })).toBe('right');
    expect(computeRootDropSide({ ...base, ratioX: 1 })).toBe('right');
  });

  it('放射状以外では undefined になること', () => {
    expect(computeRootDropSide({ ...base, layoutType: 'tree-right' })).toBeUndefined();
    expect(computeRootDropSide({ ...base, layoutType: 'tree-left' })).toBeUndefined();
  });

  it('ルート以外では undefined になること', () => {
    expect(computeRootDropSide({ ...base, isRoot: false })).toBeUndefined();
  });
});
