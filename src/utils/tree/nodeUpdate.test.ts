import { describe, it, expect } from 'vitest';
import {
  updateMapFontFamily,
  updateMultipleNodesProps,
  updateNodeProps,
  updateNodeText,
} from '../treeOperations';
import { NOW, basicMap, snapshotOf, useFixedTime } from './testHelpers';

describe('updateNodeText', () => {
  useFixedTime();

  it('テキストを更新し、そのノードだけを作り直すこと', () => {
    const map = basicMap();
    const result = updateNodeText(map, 'a', '新しい文字');
    expect(result.nodes.a).toMatchObject({ text: '新しい文字', updatedAt: NOW });
    expect(result.nodes.b).toBe(map.nodes.b);
    expect(result.title).toBe(map.title);
    expect(result.updatedAt).toBe(NOW);
  });

  it('ルートのテキストを変えると、マップのタイトルも変わること（前後の空白は除く）', () => {
    const result = updateNodeText(basicMap(), 'root', '  新しいタイトル ');
    expect(result.nodes.root.text).toBe('  新しいタイトル ');
    expect(result.title).toBe('新しいタイトル');
  });

  it('ルートのテキストを空にすると、タイトルは「中心トピック」になること', () => {
    const result = updateNodeText(basicMap(), 'root', '   ');
    expect(result.nodes.root.text).toBe('   ');
    expect(result.title).toBe('中心トピック');
  });

  it.each([
    ['テキストが同じ', 'a', 'a'],
    ['存在しないノード', 'missing', 'x'],
  ])('%s ときは、同じマップを返すこと', (_label, nodeId, text) => {
    const map = basicMap();
    expect(updateNodeText(map, nodeId, text)).toBe(map);
  });
});

describe('updateNodeProps / updateMultipleNodesProps', () => {
  useFixedTime();

  it('指定した属性だけを上書きすること', () => {
    const map = basicMap();
    const result = updateNodeProps(map, 'a', { color: '#ff0000', bold: true });
    expect(result.nodes.a).toMatchObject({ color: '#ff0000', bold: true, text: 'a', side: 'right', updatedAt: NOW });
    expect(result.nodes.b).toBe(map.nodes.b);
    expect(result.updatedAt).toBe(NOW);
  });

  it('undefined を渡すと、その属性を消すこと', () => {
    const colored = updateNodeProps(basicMap(), 'a', { color: '#ff0000' });
    expect(updateNodeProps(colored, 'a', { color: undefined }).nodes.a.color).toBeUndefined();
  });

  it('存在しないノードのときは、同じマップを返すこと', () => {
    const map = basicMap();
    expect(updateNodeProps(map, 'missing', { bold: true })).toBe(map);
  });

  it('複数のノードに同じ属性を付け、存在しない id は無視すること', () => {
    const map = basicMap();
    const result = updateMultipleNodesProps(map, ['a', 'missing', 'b1'], { fontSize: 'lg' });
    expect(result.nodes.a).toMatchObject({ fontSize: 'lg', updatedAt: NOW });
    expect(result.nodes.b1).toMatchObject({ fontSize: 'lg', updatedAt: NOW });
    expect(result.nodes.c).toBe(map.nodes.c);
    expect(result.updatedAt).toBe(NOW);
  });

  it.each([
    ['空の一覧', []],
    ['存在しない id だけ', ['missing']],
  ])('%s のときは、同じマップを返すこと', (_label, ids) => {
    const map = basicMap();
    expect(updateMultipleNodesProps(map, ids, { bold: true })).toBe(map);
  });

  it('元のマップを書き換えないこと', () => {
    const map = basicMap();
    const before = snapshotOf(map);
    updateNodeText(map, 'a', 'x');
    updateNodeProps(map, 'a', { bold: true });
    updateMultipleNodesProps(map, ['a', 'b'], { bold: true });
    expect(map).toEqual(before);
  });
});

describe('updateMapFontFamily', () => {
  useFixedTime();

  it('フォントを変え、ノードはそのままにすること', () => {
    const map = basicMap();
    const result = updateMapFontFamily(map, 'serif');
    expect(result.fontFamily).toBe('serif');
    expect(result.updatedAt).toBe(NOW);
    expect(result.nodes).toBe(map.nodes);
    expect(map.fontFamily).toBeUndefined();
  });
});
