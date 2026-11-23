import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDefaultMindMap, generateId, getChildren } from './treeOperations';
import { DEFAULT_THEME_ID } from './themes';

describe('generateId', () => {
  it('「node_」で始まり、呼ぶたびに違う id を返すこと', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateId()));
    expect(ids.size).toBe(200);
    ids.forEach((id) => expect(id).toMatch(/^node_[a-z0-9]+_[a-z0-9]+$/));
  });
});

describe('createDefaultMindMap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(5000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ルートと 4 つの子（右側、作成順）を持つ、右ツリーのマップを作ること', () => {
    const map = createDefaultMindMap('テーマ');
    expect(map).toMatchObject({
      id: 'map_' + (5000).toString(36),
      title: 'テーマ',
      themeId: DEFAULT_THEME_ID,
      layoutType: 'tree-right',
      connectorStyle: 'arc',
      createdAt: 5000,
      updatedAt: 5000,
    });
    expect(Object.keys(map.nodes)).toHaveLength(5);

    const root = map.nodes[map.rootId];
    expect(root).toEqual({ id: map.rootId, parentId: null, text: 'テーマ', createdAt: 5000, updatedAt: 5000 });

    const children = getChildren(map, map.rootId);
    expect(children.map(({ id, ...rest }) => rest)).toEqual(
      [1, 2, 3, 4].map((n) => ({
        parentId: map.rootId,
        text: `アイデア ${n}`,
        side: 'right',
        order: n - 1,
        createdAt: 5000 + n,
        updatedAt: 5000 + n,
      }))
    );
    expect(Object.keys(map.nodes)).toEqual([map.rootId, ...children.map((c) => c.id)]);
  });

  it('タイトルを省くと「メインテーマ」になること', () => {
    const map = createDefaultMindMap();
    expect(map.title).toBe('メインテーマ');
    expect(map.nodes[map.rootId].text).toBe('メインテーマ');
  });
});
