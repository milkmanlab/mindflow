import { describe, it, expect } from 'vitest';
import { MindMap } from '../../types';
import { collapseAllNodes, expandAllNodes, toggleFoldNode } from '../treeOperations';
import { NOW, T0, basicMap, dump, snapshotOf, useFixedTime } from './testHelpers';

/** 子のないノードが折りたたまれたマップ（古いファイルに残っている状態）を作る */
function withFoldedLeaf(map: MindMap, nodeId: string): MindMap {
  return { ...map, nodes: { ...map.nodes, [nodeId]: { ...map.nodes[nodeId], isFolded: true } } };
}

describe('toggleFoldNode', () => {
  useFixedTime();

  it('折りたたみを切り替え、そのノードだけを更新すること', () => {
    const map = basicMap();
    const folded = toggleFoldNode(map, 'c');
    expect(folded.nodes.c).toMatchObject({ isFolded: true, updatedAt: NOW });
    expect(folded.updatedAt).toBe(NOW);
    expect(folded.nodes.a).toBe(map.nodes.a);
    expect(toggleFoldNode(folded, 'c').nodes.c.isFolded).toBe(false);
  });

  it('子のないノードは折りたたまず、同じマップを返すこと', () => {
    const map = basicMap();
    expect(toggleFoldNode(map, 'd')).toBe(map);
  });

  it('子のないノードが折りたたまれていたら、展開できること', () => {
    const map = withFoldedLeaf(basicMap(), 'd');
    expect(toggleFoldNode(map, 'd').nodes.d.isFolded).toBe(false);
  });

  it('存在しないノードのときは、同じマップを返すこと', () => {
    const map = basicMap();
    expect(toggleFoldNode(map, 'missing')).toBe(map);
  });

  it('元のマップを書き換えないこと', () => {
    const map = basicMap();
    const before = snapshotOf(map);
    toggleFoldNode(map, 'c');
    expect(map).toEqual(before);
  });
});

describe('collapseAllNodes', () => {
  useFixedTime();

  it('子を持つノードをすべて折りたたみ、ルートと子のないノードは変えないこと', () => {
    const map = basicMap();
    const result = collapseAllNodes(map);
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0 | folded=true | touched
      b <- root | side=left | order=1 | folded=true | touched
      c <- root | side=right | order=2 | folded=true | touched
      d <- root | side=left | order=3
      a1 <- a | side=right | order=0
      a2 <- a | side=right | order=1
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0 | folded=true | touched
      c11 <- c1 | side=right | order=0
      "
    `);
    expect(result.updatedAt).toBe(NOW);
    expect(result.nodes.d).toBe(map.nodes.d);
  });

  it('すでに折りたたまれているノードは、作り直さないこと', () => {
    const map = toggleFoldNode(basicMap(), 'a');
    const result = collapseAllNodes(map);
    expect(result.nodes.a).toBe(map.nodes.a);
    expect(result.nodes.b.isFolded).toBe(true);
  });

  it('ルートが折りたたまれていたら、展開すること', () => {
    const result = collapseAllNodes(toggleFoldNode(basicMap(), 'root'));
    expect(result.nodes.root.isFolded).toBe(false);
  });

  it('子のないノードが折りたたまれていても、そのままにすること', () => {
    const map = withFoldedLeaf(basicMap(), 'd');
    expect(collapseAllNodes(map).nodes.d).toBe(map.nodes.d);
  });

  it('変わるノードがなければ、同じマップを返すこと', () => {
    const collapsed = collapseAllNodes(basicMap());
    expect(collapseAllNodes(collapsed)).toBe(collapsed);
  });

  it('元のマップを書き換えないこと', () => {
    const map = basicMap();
    const before = snapshotOf(map);
    collapseAllNodes(map);
    expect(map).toEqual(before);
  });
});

describe('expandAllNodes', () => {
  useFixedTime();

  it('折りたたまれたノードをすべて展開し、ほかのノードは作り直さないこと', () => {
    const collapsed = { ...collapseAllNodes(basicMap()), updatedAt: T0 };
    const result = expandAllNodes(collapsed);
    expect(['a', 'b', 'c', 'c1'].map((id) => result.nodes[id].isFolded)).toEqual([false, false, false, false]);
    expect(result.nodes.d).toBe(collapsed.nodes.d);
    expect(result.nodes.root).toBe(collapsed.nodes.root);
    expect(result.updatedAt).toBe(NOW);
  });

  it('折りたたまれたノードがなければ、同じマップを返すこと', () => {
    const map = basicMap();
    expect(expandAllNodes(map)).toBe(map);
    const reopened = toggleFoldNode(toggleFoldNode(map, 'a'), 'a');
    expect(expandAllNodes(reopened)).toBe(reopened);
  });

  it('元のマップを書き換えないこと', () => {
    const map = collapseAllNodes(basicMap());
    const before = snapshotOf(map);
    expandAllNodes(map);
    expect(map).toEqual(before);
  });
});
