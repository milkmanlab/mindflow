import { describe, it, expect } from 'vitest';
import { getChildren, getDescendantIds } from '../treeOperations';
import { basicMap, buildMap } from './testHelpers';

describe('getChildren', () => {
  it('子を order の順に返すこと', () => {
    expect(getChildren(basicMap(), 'root').map((n) => n.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(getChildren(basicMap(), 'a').map((n) => n.id)).toEqual(['a1', 'a2']);
  });

  it('order が同じ・ないときは、作成順に並べること', () => {
    const map = buildMap([
      { id: 'root', parentId: null },
      { id: 'x', parentId: 'root', order: 1 },
      { id: 'y', parentId: 'root', order: 0, createdAt: 30 },
      { id: 'z', parentId: 'root', order: 0, createdAt: 20 },
      { id: 'w', parentId: 'root', order: undefined, createdAt: 10 },
    ]);
    expect(getChildren(map, 'root').map((n) => n.id)).toEqual(['w', 'z', 'y', 'x']);
  });

  it('子がない・存在しないノードは、空の一覧を返すこと', () => {
    expect(getChildren(basicMap(), 'd')).toEqual([]);
    expect(getChildren(basicMap(), 'missing')).toEqual([]);
  });
});

describe('getDescendantIds', () => {
  it('子孫の id を、親 → 子の順、兄弟は並び順で返すこと', () => {
    expect(getDescendantIds(basicMap(), 'root')).toEqual(['a', 'a1', 'a2', 'b', 'b1', 'c', 'c1', 'c11', 'd']);
    expect(getDescendantIds(basicMap(), 'c')).toEqual(['c1', 'c11']);
  });

  it('自分自身は含めないこと', () => {
    expect(getDescendantIds(basicMap(), 'c1')).toEqual(['c11']);
  });

  it('子がない・存在しないノードは、空の一覧を返すこと', () => {
    expect(getDescendantIds(basicMap(), 'd')).toEqual([]);
    expect(getDescendantIds(basicMap(), 'missing')).toEqual([]);
  });
});
