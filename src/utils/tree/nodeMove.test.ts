import { describe, it, expect } from 'vitest';
import { moveSiblingOrder, reorderOrReparentNode, reparentNode, toggleFoldNode } from '../treeOperations';
import { NOW, basicMap, buildMap, dump, snapshotOf, useFixedTime } from './testHelpers';

describe('reorderOrReparentNode（D&D）', () => {
  useFixedTime();

  it('「中へ」：反対側の枝の子になり、side が移動先に合うこと', () => {
    const map = basicMap();
    const result = reorderOrReparentNode(map, 'a1', 'b', 'inside');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- b | side=left | order=1 | touched
      a2 <- a | side=right | order=0 | touched
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
    expect(result.updatedAt).toBe(NOW);
  });

  it('「中へ」：子孫ごと移り、子孫の side も変わること', () => {
    const result = reorderOrReparentNode(basicMap(), 'c1', 'd', 'inside');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- a | side=right | order=0
      a2 <- a | side=right | order=1
      b1 <- b | side=left | order=0
      c1 <- d | side=left | order=0 | touched
      c11 <- c1 | side=left | order=0 | touched
      "
    `);
  });

  it('「中へ」：折りたたまれた移動先を展開すること', () => {
    const folded = toggleFoldNode(basicMap(), 'c');
    const result = reorderOrReparentNode(folded, 'd', 'c', 'inside');
    expect(result.nodes.c.isFolded).toBe(false);
    expect(result.nodes.d).toMatchObject({ parentId: 'c', side: 'right', order: 1 });
  });

  it('position を省くと「中へ」になること', () => {
    const map = basicMap();
    expect(reorderOrReparentNode(map, 'a1', 'b')).toEqual(reorderOrReparentNode(map, 'a1', 'b', 'inside'));
  });

  it('「前へ」：同じ親の中で並べ替えること', () => {
    const result = reorderOrReparentNode(basicMap(), 'a2', 'a1', 'before');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- a | side=right | order=1 | touched
      a2 <- a | side=right | order=0 | touched
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
  });

  it('「後ろへ」：同じ親の中で並べ替えること', () => {
    const result = reorderOrReparentNode(basicMap(), 'a1', 'a2', 'after');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- a | side=right | order=1 | touched
      a2 <- a | side=right | order=0 | touched
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
  });

  it('「前へ」：別の親の兄弟になり、元の親の兄弟の順番を振り直すこと', () => {
    const result = reorderOrReparentNode(basicMap(), 'a1', 'b1', 'before');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- b | side=left | order=0 | touched
      a2 <- a | side=right | order=0 | touched
      b1 <- b | side=left | order=1 | touched
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
  });

  it('「後ろへ」：子孫ごと別の親の兄弟になり、子孫の side も変わること', () => {
    const result = reorderOrReparentNode(basicMap(), 'c1', 'b1', 'after');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- a | side=right | order=0
      a2 <- a | side=right | order=1
      b1 <- b | side=left | order=0 | touched
      c1 <- b | side=left | order=1 | touched
      c11 <- c1 | side=left | order=0 | touched
      "
    `);
  });

  it('「後ろへ」：ルートの子の兄弟になること（マインドマップ型は相手と同じ側）', () => {
    const result = reorderOrReparentNode(basicMap(), 'a1', 'b', 'after');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1 | touched
      c <- root | side=right | order=3 | touched
      d <- root | side=left | order=4 | touched
      a1 <- root | side=left | order=2 | touched
      a2 <- a | side=right | order=0 | touched
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
  });

  it('マインドマップ型：ルートの子を反対側の兄弟の前へ動かすと、その側の中だけで順番を振り直すこと', () => {
    const result = reorderOrReparentNode(basicMap(), 'a', 'd', 'before');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=left | order=1 | touched
      b <- root | side=left | order=0 | touched
      c <- root | side=right | order=2
      d <- root | side=left | order=3 | touched
      a1 <- a | side=left | order=0 | touched
      a2 <- a | side=left | order=1 | touched
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
  });

  it('マインドマップ型：同じ側のルートの子を並べ替えること', () => {
    const result = reorderOrReparentNode(basicMap(), 'c', 'a', 'before');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=1 | touched
      b <- root | side=left | order=2 | touched
      c <- root | side=right | order=0 | touched
      d <- root | side=left | order=3
      a1 <- a | side=right | order=0
      a2 <- a | side=right | order=1
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0 | touched
      c11 <- c1 | side=right | order=0 | touched
      "
    `);
  });

  it('ツリー型：ルートの子を、左右に関係なくすべての兄弟の中で並べ替えること', () => {
    const result = reorderOrReparentNode(basicMap({ layoutType: 'tree-right' }), 'a', 'd', 'before');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=left | order=2 | touched
      b <- root | side=left | order=0 | touched
      c <- root | side=right | order=1 | touched
      d <- root | side=left | order=3 | touched
      a1 <- a | side=left | order=0 | touched
      a2 <- a | side=left | order=1 | touched
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
  });

  it('相手がルートのときは、「前へ」「後ろへ」でもルートの子になること', () => {
    const map = basicMap();
    const result = reorderOrReparentNode(map, 'c1', 'root', 'before');
    expect(result).toEqual(reorderOrReparentNode(map, 'c1', 'root', 'inside'));
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- a | side=right | order=0
      a2 <- a | side=right | order=1
      b1 <- b | side=left | order=0
      c1 <- root | side=right | order=4 | touched
      c11 <- c1 | side=right | order=0 | touched
      "
    `);
  });

  it.each([
    ['ルートを動かす', 'root', 'a', 'inside'],
    ['自分自身に落とす', 'a', 'a', 'inside'],
    ['存在しないノードを動かす', 'missing', 'a', 'inside'],
    ['存在しないノードに落とす', 'a', 'missing', 'inside'],
    ['自分の子孫の中へ', 'c', 'c11', 'inside'],
    ['自分の子孫の前へ', 'c', 'c11', 'before'],
    ['自分の子の後ろへ', 'c', 'c1', 'after'],
  ] as const)('%s ときは、同じマップを返すこと', (_label, source, target, position) => {
    const map = basicMap();
    expect(reorderOrReparentNode(map, source, target, position)).toBe(map);
  });

  it('元のマップを書き換えないこと', () => {
    const map = basicMap();
    const before = snapshotOf(map);
    reorderOrReparentNode(map, 'c1', 'b1', 'after');
    reorderOrReparentNode(map, 'a', 'd', 'before');
    reorderOrReparentNode(map, 'a1', 'b', 'inside');
    expect(map).toEqual(before);
  });
});

describe('reparentNode', () => {
  useFixedTime();

  it('ルートの子にするときは、自分の side を保つこと', () => {
    const result = reparentNode(basicMap(), 'b1', 'root');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- a | side=right | order=0
      a2 <- a | side=right | order=1
      b1 <- root | side=left | order=4 | touched
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
  });

  it('side のないノードをルートの子にすると、右側になること', () => {
    const map = basicMap();
    const noSide = { ...map, nodes: { ...map.nodes, a1: { ...map.nodes.a1, side: undefined } } };
    expect(reparentNode(noSide, 'a1', 'root').nodes.a1.side).toBe('right');
  });

  it('同じ親に入れ直すと、末尾に回ること', () => {
    const result = reparentNode(basicMap(), 'a1', 'a');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- a | side=right | order=2 | touched
      a2 <- a | side=right | order=1
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
  });

  it.each([
    ['ルートを動かす', 'root', 'a'],
    ['自分自身の中へ', 'a', 'a'],
    ['自分の子孫の中へ', 'c', 'c11'],
    ['存在しないノードを動かす', 'missing', 'a'],
    ['存在しない親の中へ', 'a', 'missing'],
  ])('%s ときは、同じマップを返すこと', (_label, nodeId, newParentId) => {
    const map = basicMap();
    expect(reparentNode(map, nodeId, newParentId)).toBe(map);
  });

  it('元のマップを書き換えないこと', () => {
    const map = toggleFoldNode(basicMap(), 'c');
    const before = snapshotOf(map);
    reparentNode(map, 'a', 'c');
    expect(map).toEqual(before);
  });
});

describe('moveSiblingOrder（Alt + ↑↓）', () => {
  useFixedTime();

  it('上へ動かすと、前の兄弟と入れ替わること', () => {
    const result = moveSiblingOrder(basicMap(), 'a2', 'up');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0
      b <- root | side=left | order=1
      c <- root | side=right | order=2
      d <- root | side=left | order=3
      a1 <- a | side=right | order=1 | touched
      a2 <- a | side=right | order=0 | touched
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
    expect(result.updatedAt).toBe(NOW);
  });

  it('下へ動かすと、次の兄弟と入れ替わること', () => {
    const result = moveSiblingOrder(basicMap(), 'a1', 'down');
    expect(result.nodes.a1.order).toBe(1);
    expect(result.nodes.a2.order).toBe(0);
  });

  it('マインドマップ型：ルートの子は、同じ側の中だけで入れ替わること', () => {
    const result = moveSiblingOrder(basicMap(), 'c', 'up');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=1 | touched
      b <- root | side=left | order=2 | touched
      c <- root | side=right | order=0 | touched
      d <- root | side=left | order=3
      a1 <- a | side=right | order=0
      a2 <- a | side=right | order=1
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
  });

  it('マインドマップ型：並べ替えたあとも、ルートの子の order が左右で重ならないこと', () => {
    const result = moveSiblingOrder(basicMap(), 'c', 'up');
    const orders = ['a', 'b', 'c', 'd'].map((id) => result.nodes[id].order);
    expect(new Set(orders).size).toBe(4);
    // 同じ側の中の順番は、並べ替えた結果のまま
    expect(result.nodes.c.order!).toBeLessThan(result.nodes.a.order!);
    expect(result.nodes.b.order!).toBeLessThan(result.nodes.d.order!);
  });

  it('マインドマップ型：side のないルートの子は、右側として扱うこと', () => {
    const map = basicMap();
    const noSide = { ...map, nodes: { ...map.nodes, c: { ...map.nodes.c, side: undefined } } };
    const result = moveSiblingOrder(noSide, 'c', 'up');
    expect(result.nodes.c.order).toBe(0);
    expect(result.nodes.a.order).toBe(1);
  });

  it('ツリー型：ルートの子は、左右に関係なく隣の兄弟と入れ替わること', () => {
    const result = moveSiblingOrder(basicMap({ layoutType: 'tree-right' }), 'c', 'up');
    expect(dump(result)).toMatchInlineSnapshot(`
      "
      root <- - | side=- | order=-
      a <- root | side=right | order=0 | touched
      b <- root | side=left | order=2 | touched
      c <- root | side=right | order=1 | touched
      d <- root | side=left | order=3 | touched
      a1 <- a | side=right | order=0
      a2 <- a | side=right | order=1
      b1 <- b | side=left | order=0
      c1 <- c | side=right | order=0
      c11 <- c1 | side=right | order=0
      "
    `);
  });

  it.each([
    ['先頭を上へ', 'a1', 'up'],
    ['末尾を下へ', 'a2', 'down'],
    ['一人っ子を上へ', 'b1', 'up'],
    ['ルートを動かす', 'root', 'up'],
    ['存在しないノードを動かす', 'missing', 'down'],
    ['マインドマップ型で、その側の先頭を上へ', 'b', 'up'],
    ['マインドマップ型で、その側の末尾を下へ', 'c', 'down'],
  ] as const)('%s ときは、同じマップを返すこと', (_label, nodeId, direction) => {
    const map = basicMap();
    expect(moveSiblingOrder(map, nodeId, direction)).toBe(map);
  });

  it('元のマップを書き換えないこと', () => {
    const map = basicMap();
    const before = snapshotOf(map);
    moveSiblingOrder(map, 'a2', 'up');
    moveSiblingOrder(map, 'c', 'up');
    expect(map).toEqual(before);
  });
});

describe('reorderOrReparentNode（ルートの左右へのドロップ）', () => {
  useFixedTime();

  it('右側のルートの子を、左側へ：左の末尾に入り、子孫も左になること', () => {
    const result = reorderOrReparentNode(basicMap(), 'c', 'root', 'inside', 'left');
    expect(result.nodes.c).toMatchObject({ parentId: 'root', side: 'left' });
    expect(result.nodes.c1.side).toBe('left');
    expect(result.nodes.c11.side).toBe('left');
    const leftOrder = ['b', 'd', 'c'].map((id) => result.nodes[id].order as number);
    expect(leftOrder).toEqual([...leftOrder].sort((x, y) => x - y));
  });

  it('反対側に 1 つもなくても、移せること', () => {
    const map = buildMap(
      [
        { id: 'root', parentId: null },
        { id: 'a', parentId: 'root', side: 'right' },
        { id: 'b', parentId: 'root', side: 'right' },
      ],
      {}
    );
    const result = reorderOrReparentNode(map, 'a', 'root', 'inside', 'left');
    expect(result.nodes.a.side).toBe('left');
    expect(result.nodes.b.side).toBe('right');
  });

  it('深い階層のノードを、ルートの左側へ：親がルートになり、左の末尾に入ること', () => {
    const result = reorderOrReparentNode(basicMap(), 'a1', 'root', 'inside', 'left');
    expect(result.nodes.a1).toMatchObject({ parentId: 'root', side: 'left' });
    const rootChildren = Object.values(result.nodes).filter((n) => n.parentId === 'root');
    const orders = rootChildren.map((n) => n.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect(result.nodes.a1.order).toBe(rootChildren.length - 1);
  });

  it('同じ側を指定すると、同じマップを返すこと', () => {
    const map = basicMap();
    expect(reorderOrReparentNode(map, 'a', 'root', 'inside', 'right')).toBe(map);
    expect(reorderOrReparentNode(map, 'b', 'root', 'inside', 'left')).toBe(map);
  });

  it('放射状以外では、側の指定を使わないこと', () => {
    const map = basicMap({ layoutType: 'tree-right' });
    const result = reorderOrReparentNode(map, 'a1', 'root', 'inside', 'left');
    expect(result.nodes.a1.side).toBe(reorderOrReparentNode(map, 'a1', 'root', 'inside').nodes.a1.side);
  });

  it('側の指定がなければ、今までどおり元の側のままであること', () => {
    const result = reorderOrReparentNode(basicMap(), 'b1', 'root', 'inside');
    expect(result.nodes.b1.side).toBe('left');
  });
});
