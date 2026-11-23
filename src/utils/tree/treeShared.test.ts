import { describe, it, expect } from 'vitest';
import { buildChildrenMap, compareSiblingOrder, getReorderSiblings } from './treeQueries';
import {
  reindexSiblings,
  removeNodes,
  setDescendantsSide,
  sideForNewChild,
  sideForNewSibling,
  sideForSiblingDrop,
  sideUnderParent,
} from './treeShared';
import type { MindNode } from '../../types';
import { NOW, T0, basicMap, buildMap, snapshotOf } from './testHelpers';

const ids = (nodes: MindNode[]) => nodes.map((n) => n.id);

describe('compareSiblingOrder / buildChildrenMap', () => {
  it('order の順、同じなら作成順に並べること（order がなければ 0 として扱う）', () => {
    const map = buildMap([
      { id: 'root', parentId: null },
      { id: 'x', parentId: 'root', order: 1 },
      { id: 'y', parentId: 'root', order: 0, createdAt: 30 },
      { id: 'z', parentId: 'root', order: undefined, createdAt: 20 },
    ]);
    const { x, y, z } = map.nodes;
    expect([x, y, z].sort(compareSiblingOrder).map((n) => n.id)).toEqual(['z', 'y', 'x']);
    expect(ids(buildChildrenMap(map.nodes).get('root')!)).toEqual(['z', 'y', 'x']);
  });

  it('親ごとに子をまとめ、子のないノードは入れないこと', () => {
    const childrenMap = buildChildrenMap(basicMap().nodes);
    expect([...childrenMap.keys()]).toEqual(['root', 'a', 'b', 'c', 'c1']);
    expect(ids(childrenMap.get('root')!)).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(childrenMap.get('a')!)).toEqual(['a1', 'a2']);
    expect(childrenMap.get('d')).toBeUndefined();
  });
});

describe('getReorderSiblings', () => {
  it('ルートの子でなければ、すべての兄弟を返すこと', () => {
    const map = basicMap();
    expect(ids(getReorderSiblings(map, map.nodes.a2))).toEqual(['a1', 'a2']);
  });

  it('マインドマップ型のルートの子は、同じ側の兄弟だけを返すこと', () => {
    const map = basicMap();
    expect(ids(getReorderSiblings(map, map.nodes.a))).toEqual(['a', 'c']);
    expect(ids(getReorderSiblings(map, map.nodes.d))).toEqual(['b', 'd']);
  });

  it('side のないルートの子は、右側として扱うこと', () => {
    const map = basicMap();
    const noSide = { ...map, nodes: { ...map.nodes, b: { ...map.nodes.b, side: undefined } } };
    expect(ids(getReorderSiblings(noSide, noSide.nodes.b))).toEqual(['a', 'b', 'c']);
    expect(ids(getReorderSiblings(noSide, map.nodes.d))).toEqual(['d']);
  });

  it('ツリー型のルートの子は、左右に関係なくすべての兄弟を返すこと', () => {
    const map = basicMap({ layoutType: 'tree-left' });
    expect(ids(getReorderSiblings(map, map.nodes.a))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('親のないノードは、空の一覧を返すこと', () => {
    const map = basicMap();
    expect(getReorderSiblings(map, map.nodes.root)).toEqual([]);
  });
});

describe('reindexSiblings / setDescendantsSide', () => {
  it('並びの順に order を振り直し、作業用のコピーだけを書き換えること', () => {
    const map = basicMap();
    const before = snapshotOf(map);
    const nodes = { ...map.nodes };
    reindexSiblings(nodes, [map.nodes.a2, map.nodes.a1], NOW);
    expect(nodes.a2).toMatchObject({ order: 0, updatedAt: NOW });
    expect(nodes.a1).toMatchObject({ order: 1, updatedAt: NOW });
    expect(map).toEqual(before);
  });

  it('作業用のコピーにある最新の内容を引き継ぐこと', () => {
    const map = basicMap();
    const nodes = { ...map.nodes, a1: { ...map.nodes.a1, parentId: 'b' } };
    reindexSiblings(nodes, [map.nodes.a1], NOW);
    expect(nodes.a1).toMatchObject({ parentId: 'b', order: 0 });
  });

  it('子孫すべての side を書き換え、自分自身は変えないこと', () => {
    const map = basicMap();
    const before = snapshotOf(map);
    const nodes = { ...map.nodes };
    setDescendantsSide(nodes, buildChildrenMap(map.nodes), 'c', 'left', NOW);
    expect(nodes.c).toBe(map.nodes.c);
    expect(nodes.c1).toMatchObject({ side: 'left', updatedAt: NOW });
    expect(nodes.c11).toMatchObject({ side: 'left', updatedAt: NOW });
    expect(nodes.a1).toBe(map.nodes.a1);
    expect(map).toEqual(before);
  });
});

describe('removeNodes', () => {
  it('指定したノードと、それにつながる関連線を取り除くこと', () => {
    const map = {
      ...basicMap(),
      relationships: {
        r1: { id: 'r1', sourceId: 'a1', targetId: 'b1' },
        r2: { id: 'r2', sourceId: 'b', targetId: 'd' },
      },
    };
    const result = removeNodes(map, new Set(['a1', 'c']), NOW);
    expect(Object.keys(result.nodes)).toEqual(['root', 'a', 'b', 'd', 'a2', 'b1', 'c1', 'c11']);
    expect(Object.keys(result.relationships!)).toEqual(['r2']);
    expect(result.updatedAt).toBe(NOW);
    expect(map.updatedAt).toBe(T0);
  });
});

describe('side の決め方', () => {
  it('sideForNewChild：ツリー型はレイアウトの向きになること', () => {
    const right = basicMap({ layoutType: 'tree-right' });
    const left = basicMap({ layoutType: 'tree-left' });
    expect(sideForNewChild(right, right.nodes.b, [], 'left')).toBe('right');
    expect(sideForNewChild(left, left.nodes.root, [], 'right')).toBe('left');
  });

  it('sideForNewChild：マインドマップ型のルートは、指定された側、なければ右を先に 5 本埋める決まりになること', () => {
    const map = basicMap();
    const { root, a, b, c } = map.nodes;
    expect(sideForNewChild(map, root, [a, b], 'left')).toBe('left');
    expect(sideForNewChild(map, root, [a, b])).toBe('right');
    expect(sideForNewChild(map, root, [a, b, c])).toBe('right');
    expect(sideForNewChild(map, root, [])).toBe('right');
    const five = [1, 2, 3, 4, 5].map((i) => ({ ...a, id: `r${i}`, side: 'right' as const }));
    expect(sideForNewChild(map, root, five)).toBe('left');
    expect(sideForNewChild(map, root, [...five, { ...b, id: 'l1' }])).toBe('left');
  });

  it('sideForNewChild：ルート以外は親と同じ側（指定は無視、親に side がなければ右）になること', () => {
    const map = basicMap();
    expect(sideForNewChild(map, map.nodes.b, [], 'right')).toBe('left');
    expect(sideForNewChild(map, { ...map.nodes.b, side: undefined }, [])).toBe('right');
  });

  it('sideForNewSibling：ツリー型はレイアウトの向き、マインドマップ型は基準のノードと同じ側になること', () => {
    expect(sideForNewSibling(basicMap(), basicMap().nodes.b1)).toBe('left');
    expect(sideForNewSibling(basicMap({ layoutType: 'tree-right' }), basicMap().nodes.b1)).toBe('right');
    expect(sideForNewSibling(basicMap({ layoutType: 'tree-left' }), basicMap().nodes.a1)).toBe('left');
    expect(sideForNewSibling(basicMap(), { ...basicMap().nodes.a1, side: undefined })).toBeUndefined();
  });

  it('sideUnderParent：ルートの下は自分の side（なければ右）、それ以外は親と同じ側になること', () => {
    const map = basicMap();
    expect(sideUnderParent(map, map.nodes.root, 'left')).toBe('left');
    expect(sideUnderParent(map, map.nodes.root, undefined)).toBe('right');
    expect(sideUnderParent(map, map.nodes.b, 'right')).toBe('left');
    expect(sideUnderParent(map, { ...map.nodes.b, side: undefined }, 'right')).toBeUndefined();
  });

  it('sideForSiblingDrop：ルートの子が相手なら相手と同じ側（マインドマップ型で side がなければ右）になること', () => {
    const map = basicMap();
    const tree = basicMap({ layoutType: 'tree-right' });
    expect(sideForSiblingDrop(map, map.nodes.d)).toBe('left');
    expect(sideForSiblingDrop(map, { ...map.nodes.d, side: undefined })).toBe('right');
    expect(sideForSiblingDrop(tree, { ...tree.nodes.d, side: undefined })).toBeUndefined();
  });

  it('sideForSiblingDrop：ルートの子以外が相手なら、相手の親と同じ側になること', () => {
    const map = basicMap();
    expect(sideForSiblingDrop(map, map.nodes.b1)).toBe('left');
    expect(sideForSiblingDrop(map, { ...map.nodes.b1, side: 'right' })).toBe('left');
  });
});
