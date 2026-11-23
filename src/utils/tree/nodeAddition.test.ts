import { describe, it, expect } from 'vitest';
import { addChildNode, addSiblingNode, toggleFoldNode } from '../treeOperations';
import { NOW, basicMap, buildMap, dump, snapshotOf, useFixedTime } from './testHelpers';

describe('addChildNode（Tab）', () => {
  useFixedTime();

  it('末尾の子として追加し、親の side を引き継ぐこと', () => {
    const { updatedMap, newNodeId } = addChildNode(basicMap(), 'b', '新規');
    expect(dump(updatedMap, { [newNodeId]: 'NEW' })).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- a | side=right | order=0
      a2 <- a | side=right | order=1
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      NEW <- b | side=left | order=1 | touched
      "
    `);
    expect(updatedMap.nodes[newNodeId]).toMatchObject({ text: '新規', createdAt: NOW, updatedAt: NOW });
    expect(updatedMap.updatedAt).toBe(NOW);
  });

  it('テキストを省くと、空のノードになること', () => {
    const { updatedMap, newNodeId } = addChildNode(basicMap(), 'a');
    expect(updatedMap.nodes[newNodeId].text).toBe('');
  });

  it('マインドマップ型のルート：左右が同じ数なら右側に追加すること', () => {
    const { updatedMap, newNodeId } = addChildNode(basicMap(), 'root');
    expect(updatedMap.nodes[newNodeId]).toMatchObject({ side: 'right', order: 4 });
  });

  it('マインドマップ型のルート：右が 5 本になるまで右、そのあとは左に追加すること', () => {
    // basicMap は右 2・左 2。右に 3 本足して 5 本になり、次は左
    let map = basicMap();
    const sides: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = addChildNode(map, 'root');
      sides.push(r.updatedMap.nodes[r.newNodeId].side as string);
      map = r.updatedMap;
    }
    expect(sides).toEqual(['right', 'right', 'right', 'left']);
  });

  it('マインドマップ型のルート：side のない子は、並び順で側を決めて数えること', () => {
    const map = basicMap();
    const nodes = { ...map.nodes };
    for (const id of ['a', 'b', 'c', 'd']) nodes[id] = { ...nodes[id], side: undefined };
    // 4 本とも side なし → 右 4 本として数えるので、次は右（5 本目）
    const { updatedMap, newNodeId } = addChildNode({ ...map, nodes }, 'root');
    expect(updatedMap.nodes[newNodeId].side).toBe('right');
    const next = addChildNode(updatedMap, 'root');
    expect(next.updatedMap.nodes[next.newNodeId].side).toBe('left');
  });

  it('マインドマップ型のルート：側を指定すると、その側に追加すること', () => {
    const { updatedMap, newNodeId } = addChildNode(basicMap(), 'root', '', 'left');
    expect(updatedMap.nodes[newNodeId].side).toBe('left');
  });

  it.each([
    ['tree-right', 'right'],
    ['tree-left', 'left'],
  ] as const)('%s では、親の side や指定に関係なく %s になること', (layoutType, side) => {
    const map = basicMap({ layoutType });
    const child = addChildNode(map, 'b');
    expect(child.updatedMap.nodes[child.newNodeId].side).toBe(side);
    const rootChild = addChildNode(map, 'root', '', side === 'right' ? 'left' : 'right');
    expect(rootChild.updatedMap.nodes[rootChild.newNodeId].side).toBe(side);
  });

  it('親に side がなければ、右側になること', () => {
    const map = basicMap();
    const noSide = { ...map, nodes: { ...map.nodes, a: { ...map.nodes.a, side: undefined } } };
    const { updatedMap, newNodeId } = addChildNode(noSide, 'a');
    expect(updatedMap.nodes[newNodeId].side).toBe('right');
  });

  it('折りたたまれた親を展開すること', () => {
    const folded = toggleFoldNode(basicMap(), 'c');
    const { updatedMap } = addChildNode(folded, 'c');
    expect(updatedMap.nodes.c.isFolded).toBe(false);
  });

  it('折りたたまれていない親は、そのままであること', () => {
    const map = basicMap();
    const { updatedMap } = addChildNode(map, 'a');
    expect(updatedMap.nodes.a).toBe(map.nodes.a);
  });

  it('親が存在しないときは、同じマップと空の id を返すこと', () => {
    const map = basicMap();
    const result = addChildNode(map, 'missing');
    expect(result.updatedMap).toBe(map);
    expect(result.newNodeId).toBe('');
  });

  it('元のマップを書き換えないこと', () => {
    const map = toggleFoldNode(basicMap(), 'c');
    const before = snapshotOf(map);
    addChildNode(map, 'c');
    addChildNode(map, 'root');
    expect(map).toEqual(before);
  });
});

describe('addSiblingNode（Enter / Shift+Enter）', () => {
  useFixedTime();

  it('「後ろ」：基準のノードの直後に入れ、兄弟の順番を振り直すこと', () => {
    const { updatedMap, newNodeId } = addSiblingNode(basicMap(), 'a1', '新規', 'after');
    expect(dump(updatedMap, { [newNodeId]: 'NEW' })).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- a | side=right | order=0 | touched
      a2 <- a | side=right | order=2 | touched
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      NEW <- a | side=right | order=1 | touched
      "
    `);
    expect(updatedMap.nodes[newNodeId]).toMatchObject({ text: '新規', createdAt: NOW });
  });

  it('「前」：基準のノードの直前に入れること', () => {
    const { updatedMap, newNodeId } = addSiblingNode(basicMap(), 'a1', '', 'before');
    expect(dump(updatedMap, { [newNodeId]: 'NEW' })).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- a | side=right | order=1 | touched
      a2 <- a | side=right | order=2 | touched
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      NEW <- a | side=right | order=0 | touched
      "
    `);
  });

  it('位置を省くと「後ろ」になること', () => {
    const { updatedMap, newNodeId } = addSiblingNode(basicMap(), 'a1');
    expect(updatedMap.nodes[newNodeId].order).toBe(1);
  });

  it('マインドマップ型のルートの子：基準のノードと同じ側になり、左右を合わせた並びの直後に入ること', () => {
    const { updatedMap, newNodeId } = addSiblingNode(basicMap(), 'b', '', 'after');
    expect(dump(updatedMap, { [newNodeId]: 'NEW' })).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0 | touched
      b <- root | side=left | order=1 | touched
      c <- root | side=right | order=3 | touched
      d <- root | side=left | order=4 | touched
      a1 <- a | side=right | order=0
      a2 <- a | side=right | order=1
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      NEW <- root | side=left | order=2 | touched
      "
    `);
  });

  describe('マインドマップ型のルートの子（右を先に 5 本埋める決まり）', () => {
    /** ルートの子を、右 right 本・左 left 本にしたマップ（並びは右が先、そのあと左） */
    const rootMap = (right: number, left: number) => {
      const specs = [{ id: 'root', parentId: null as string | null }];
      for (let i = 0; i < right; i++) specs.push({ id: `r${i}`, parentId: 'root', side: 'right' } as never);
      for (let i = 0; i < left; i++) specs.push({ id: `l${i}`, parentId: 'root', side: 'left' } as never);
      return buildMap(specs);
    };

    it('右の末尾から Enter：右が 5 本に満たなければ、右の末尾の直後に入ること', () => {
      const { updatedMap, newNodeId } = addSiblingNode(rootMap(3, 0), 'r2');
      expect(updatedMap.nodes[newNodeId]).toMatchObject({ side: 'right', order: 3 });
    });

    it('右の末尾から Enter：右が 5 本そろっていたら、左に回り、並び全体の末尾に入ること', () => {
      const { updatedMap, newNodeId } = addSiblingNode(rootMap(5, 0), 'r4');
      expect(updatedMap.nodes[newNodeId]).toMatchObject({ side: 'left', order: 5 });
    });

    it('左の末尾から Enter：左が右より少なければ左、同数になったら右に回ること', () => {
      const four = addSiblingNode(rootMap(5, 3), 'l2');
      expect(four.updatedMap.nodes[four.newNodeId]).toMatchObject({ side: 'left', order: 8 });
      const five = addSiblingNode(rootMap(5, 5), 'l4');
      expect(five.updatedMap.nodes[five.newNodeId]).toMatchObject({ side: 'right', order: 10 });
    });

    it('途中のノードから Enter：基準と同じ側の、すぐ後ろに入ること（右が 5 本そろっていても）', () => {
      const { updatedMap, newNodeId } = addSiblingNode(rootMap(5, 0), 'r1');
      expect(updatedMap.nodes[newNodeId]).toMatchObject({ side: 'right', order: 2 });
    });

    it('Shift+Enter：右が 5 本そろった末尾でも、基準と同じ側の、すぐ前に入ること', () => {
      const { updatedMap, newNodeId } = addSiblingNode(rootMap(5, 0), 'r4', '', 'before');
      expect(updatedMap.nodes[newNodeId]).toMatchObject({ side: 'right', order: 4 });
    });

    it('反対側に入るとき、他の子の order を振り直すこと', () => {
      const { updatedMap } = addSiblingNode(rootMap(5, 1), 'r4'); // 左は 1 本だけ。右の末尾でも r4 の後ろに左の l0 がある
      const orders = ['r0', 'r1', 'r2', 'r3', 'r4', 'l0'].map((id) => updatedMap.nodes[id].order);
      expect(orders).toEqual([0, 1, 2, 3, 4, 5]);
    });
  });

  it.each([
    ['tree-right', 'right'],
    ['tree-left', 'left'],
  ] as const)('%s では、基準のノードの side に関係なく %s になること', (layoutType, side) => {
    const { updatedMap, newNodeId } = addSiblingNode(basicMap({ layoutType }), side === 'right' ? 'b1' : 'a1');
    expect(updatedMap.nodes[newNodeId].side).toBe(side);
  });

  it('ルートで呼ぶと、子を追加すること', () => {
    const { updatedMap, newNodeId } = addSiblingNode(basicMap(), 'root', '子');
    expect(updatedMap.nodes[newNodeId]).toMatchObject({ parentId: 'root', text: '子', order: 4, side: 'right' });
  });

  it('基準のノードが存在しないときは、同じマップと空の id を返すこと', () => {
    const map = basicMap();
    const result = addSiblingNode(map, 'missing');
    expect(result.updatedMap).toBe(map);
    expect(result.newNodeId).toBe('');
  });

  it('元のマップを書き換えないこと', () => {
    const map = basicMap();
    const before = snapshotOf(map);
    addSiblingNode(map, 'a1', '', 'before');
    addSiblingNode(map, 'b');
    expect(map).toEqual(before);
  });
});
