import { beforeEach, afterEach, vi } from 'vitest';
import type { MindMap, MindNode } from '../../types';

/** フィクスチャのノードの updatedAt */
export const T0 = 1000;
/** テスト中の Date.now() の値。操作で更新されたノードは updatedAt がこの値になる */
export const NOW = 5000;

/** Date.now() を NOW に固定する（describe の中で呼ぶ） */
export function useFixedTime(): void {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });
}

export type NodeSpec = Partial<MindNode> & { id: string; parentId: string | null };

/** id を指定してマップを組み立てる。order は同じ親の中での出現順、createdAt は全体での出現順 */
export function buildMap(specs: NodeSpec[], overrides: Partial<MindMap> = {}): MindMap {
  const nodes: Record<string, MindNode> = {};
  const childCounts = new Map<string, number>();
  specs.forEach((spec, index) => {
    const base: MindNode = { id: spec.id, parentId: spec.parentId, text: spec.id, createdAt: T0 + index, updatedAt: T0 };
    if (spec.parentId) {
      base.order = childCounts.get(spec.parentId) ?? 0;
      childCounts.set(spec.parentId, base.order + 1);
    }
    nodes[spec.id] = { ...base, ...spec };
  });
  return {
    id: 'map',
    title: 'テスト',
    rootId: 'root',
    nodes,
    themeId: 'oceanic',
    layoutType: 'mindmap',
    connectorStyle: 'curved',
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}

/**
 * 基本のマップ（マインドマップ型）
 *
 *   b ─ b1          a ─ a1, a2
 *   d        root   c ─ c1 ─ c11
 */
export function basicMap(overrides: Partial<MindMap> = {}): MindMap {
  return buildMap(
    [
      { id: 'root', parentId: null },
      { id: 'a', parentId: 'root', side: 'right' },
      { id: 'b', parentId: 'root', side: 'left' },
      { id: 'c', parentId: 'root', side: 'right' },
      { id: 'd', parentId: 'root', side: 'left' },
      { id: 'a1', parentId: 'a', side: 'right' },
      { id: 'a2', parentId: 'a', side: 'right' },
      { id: 'b1', parentId: 'b', side: 'left' },
      { id: 'c1', parentId: 'c', side: 'right' },
      { id: 'c11', parentId: 'c1', side: 'right' },
    ],
    overrides
  );
}

/**
 * マップのノードを、1 行 1 ノードの文字列にする（スナップショット用）。
 * 「touched」は、操作で updatedAt が更新されたノード
 * @param names id を読みやすい名前に置き換える対応（新しく作られたノードの id など）
 */
export function dump(map: MindMap, names: Record<string, string> = {}): string {
  const label = (id: string | null | undefined) => (id ? names[id] ?? id : '-');
  const lines = Object.values(map.nodes).map((n) =>
    [
      `${label(n.id)} <- ${label(n.parentId)}`,
      `side=${n.side ?? '-'}`,
      `order=${n.order ?? '-'}`,
      ...(n.isFolded !== undefined ? [`folded=${n.isFolded}`] : []),
      ...(n.updatedAt === NOW ? ['touched'] : []),
    ].join(' | ')
  );
  return '\n' + lines.join('\n') + '\n';
}

/** 操作で元のマップが書き換わっていないことを確かめるための写し */
export function snapshotOf(map: MindMap): MindMap {
  return structuredClone(map);
}
