import { describe, it, expect } from 'vitest';
import { deleteNode, deleteNodes } from '../treeOperations';
import type { MindMap } from '../../types';
import { NOW, basicMap, snapshotOf, useFixedTime } from './testHelpers';

const withRelationships = (map: MindMap): MindMap => ({
  ...map,
  relationships: {
    r1: { id: 'r1', sourceId: 'a1', targetId: 'b1' },
    r2: { id: 'r2', sourceId: 'c11', targetId: 'd' },
    r3: { id: 'r3', sourceId: 'b', targetId: 'd' },
  },
});

describe('deleteNode', () => {
  useFixedTime();

  it('ノードと子孫を削除し、ほかのノードはそのまま残すこと', () => {
    const map = basicMap();
    const { updatedMap } = deleteNode(map, 'c');
    expect(Object.keys(updatedMap.nodes)).toEqual(['root', 'a', 'b', 'd', 'a1', 'a2', 'b1']);
    // 残ったノードは作り直さない（兄弟の order も振り直さない）
    Object.keys(updatedMap.nodes).forEach((id) => expect(updatedMap.nodes[id]).toBe(map.nodes[id]));
    expect(updatedMap.updatedAt).toBe(NOW);
  });

  it.each([
    ['前の兄弟がいれば、前の兄弟', 'a2', 'a1'],
    ['先頭なら、次の兄弟', 'a1', 'a2'],
    ['一人っ子なら、親', 'c1', 'c'],
    ['マインドマップ型のルートの子は、同じ側の前の兄弟', 'c', 'a'],
    ['マインドマップ型のルートの子の先頭は、同じ側の次の兄弟', 'a', 'c'],
  ])('次に選ぶノード：%s', (_label, nodeId, expected) => {
    expect(deleteNode(basicMap(), nodeId).nextSelectedId).toBe(expected);
  });

  it('マインドマップ型で、同じ側に兄弟がいなければ、ルートを選ぶこと', () => {
    const map = basicMap();
    const { updatedMap } = deleteNode(map, 'c');
    expect(deleteNode(updatedMap, 'a').nextSelectedId).toBe('root');
  });

  it('ツリー型では、左右に関係なく前の兄弟を選ぶこと', () => {
    expect(deleteNode(basicMap({ layoutType: 'tree-right' }), 'c').nextSelectedId).toBe('b');
  });

  it('削除したノード・子孫につながる関連線を削除すること', () => {
    const { updatedMap } = deleteNode(withRelationships(basicMap()), 'c');
    expect(Object.keys(updatedMap.relationships!)).toEqual(['r1', 'r3']);
  });

  it('関連線がないマップでは、relationships を作らないこと', () => {
    expect(deleteNode(basicMap(), 'c').updatedMap.relationships).toBeUndefined();
  });

  it.each([
    ['ルート', 'root'],
    ['存在しないノード', 'missing'],
  ])('%s は削除できず、同じマップを返してルートを選ぶこと', (_label, nodeId) => {
    const map = basicMap();
    const result = deleteNode(map, nodeId);
    expect(result.updatedMap).toBe(map);
    expect(result.nextSelectedId).toBe('root');
  });

  it('元のマップを書き換えないこと', () => {
    const map = withRelationships(basicMap());
    const before = snapshotOf(map);
    deleteNode(map, 'c');
    expect(map).toEqual(before);
  });
});

describe('deleteNodes', () => {
  useFixedTime();

  it('複数のノードと、それぞれの子孫を削除し、ルートを選ぶこと', () => {
    const map = basicMap();
    const { updatedMap, nextSelectedId } = deleteNodes(map, ['a1', 'c']);
    expect(Object.keys(updatedMap.nodes)).toEqual(['root', 'a', 'b', 'd', 'a2', 'b1']);
    Object.keys(updatedMap.nodes).forEach((id) => expect(updatedMap.nodes[id]).toBe(map.nodes[id]));
    expect(nextSelectedId).toBe('root');
    expect(updatedMap.updatedAt).toBe(NOW);
  });

  it('親と子孫を同時に指定しても、まとめて削除すること', () => {
    const { updatedMap } = deleteNodes(basicMap(), ['c', 'c11', 'c1']);
    expect(Object.keys(updatedMap.nodes)).toEqual(['root', 'a', 'b', 'd', 'a1', 'a2', 'b1']);
  });

  it('ルートと存在しないノードは無視して、残りを削除すること', () => {
    const { updatedMap } = deleteNodes(basicMap(), ['root', 'missing', 'd']);
    expect(updatedMap.nodes.root).toBeDefined();
    expect(updatedMap.nodes.d).toBeUndefined();
  });

  it('削除したノードにつながる関連線を削除すること', () => {
    const { updatedMap } = deleteNodes(withRelationships(basicMap()), ['a1', 'd']);
    expect(Object.keys(updatedMap.relationships!)).toEqual([]);
  });

  it.each([
    ['空の一覧', []],
    ['ルートだけ', ['root']],
    ['存在しないノードだけ', ['missing']],
  ])('%s のときは、同じマップを返してルートを選ぶこと', (_label, ids) => {
    const map = basicMap();
    const result = deleteNodes(map, ids);
    expect(result.updatedMap).toBe(map);
    expect(result.nextSelectedId).toBe('root');
  });

  it('元のマップを書き換えないこと', () => {
    const map = withRelationships(basicMap());
    const before = snapshotOf(map);
    deleteNodes(map, ['a1', 'c']);
    expect(map).toEqual(before);
  });
});
