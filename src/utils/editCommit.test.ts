import { describe, it, expect } from 'vitest';
import { resolveEditCommit } from './editCommit';
import { createDefaultMindMap } from './treeOperations';

const map = createDefaultMindMap('テーマ');
const child = Object.keys(map.nodes).find((id) => id !== map.rootId)!;
const childText = map.nodes[child].text;

describe('resolveEditCommit', () => {
  it('ノードが存在しなければ missing を返すこと', () => {
    expect(resolveEditCommit(map, 'missing', 'abc')).toBe('missing');
  });

  it('ルート以外で空なら、ノードを破棄すること', () => {
    expect(resolveEditCommit(map, child, '')).toBe('discardEmpty');
    expect(resolveEditCommit(map, child, '   ')).toBe('discardEmpty');
  });

  it('ルートで空なら、既定の名前に戻すこと', () => {
    expect(resolveEditCommit(map, map.rootId, ' ')).toBe('resetRoot');
  });

  it('文字が変わったら更新すること', () => {
    expect(resolveEditCommit(map, child, '新しい文字')).toBe('update');
    expect(resolveEditCommit(map, map.rootId, '新しいテーマ')).toBe('update');
  });

  it('文字が変わっていなければ何もしないこと', () => {
    expect(resolveEditCommit(map, child, childText)).toBe('unchanged');
  });

  it('前後の空白だけが違う場合も、変わったとみなすこと（trim 前の文字列で比べる）', () => {
    expect(resolveEditCommit(map, child, ` ${childText}`)).toBe('update');
  });
});
