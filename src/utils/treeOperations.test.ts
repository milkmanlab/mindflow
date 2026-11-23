import { describe, it, expect } from 'vitest';
import {
  createDefaultMindMap,
  addChildNode,
  addSiblingNode,
  deleteNode,
  deleteNodes,
  updateMultipleNodesProps,
  toggleFoldNode,
  reparentNode,
  getChildren,
  updateNodeText,
  updateNodeProps,
  copySubtree,
} from './treeOperations';

describe('treeOperations', () => {
  it('デフォルトマップが有効なツリー構造で作成されること', () => {
    const map = createDefaultMindMap('テストマップ');
    expect(map.title).toBe('テストマップ');
    expect(map.rootId).toBeDefined();

    const root = map.nodes[map.rootId];
    expect(root).toBeDefined();
    expect(root.parentId).toBeNull();
    expect(root.text).toBe('テストマップ');

    const children = getChildren(map, map.rootId);
    expect(children.length).toBeGreaterThan(0);
    children.forEach((c) => {
      expect(c.parentId).toBe(map.rootId);
    });
  });

  it('子ノードの追加（Tab操作相当）が正常に機能すること', () => {
    const map = createDefaultMindMap('メイン');
    const { updatedMap, newNodeId } = addChildNode(map, map.rootId, '新しい子ノード', 'right');

    expect(updatedMap.nodes[newNodeId]).toBeDefined();
    expect(updatedMap.nodes[newNodeId].text).toBe('新しい子ノード');
    expect(updatedMap.nodes[newNodeId].parentId).toBe(map.rootId);
    expect(updatedMap.nodes[newNodeId].side).toBe('right');

    const children = getChildren(updatedMap, map.rootId);
    expect(children.some((c) => c.id === newNodeId)).toBe(true);
  });

  it('兄弟ノードの追加（Enter操作相当: 下側に追加）が正常に機能すること', () => {
    const map = createDefaultMindMap('メイン');
    const firstChild = getChildren(map, map.rootId)[0];
    const { updatedMap, newNodeId } = addSiblingNode(map, firstChild.id, '新しい兄弟ノード', 'after');

    expect(updatedMap.nodes[newNodeId]).toBeDefined();
    expect(updatedMap.nodes[newNodeId].text).toBe('新しい兄弟ノード');
    expect(updatedMap.nodes[newNodeId].parentId).toBe(map.rootId);

    const newChildren = getChildren(updatedMap, map.rootId);
    const newIndex = newChildren.findIndex((c) => c.id === newNodeId);
    const targetIndex = newChildren.findIndex((c) => c.id === firstChild.id);
    expect(newIndex).toBe(targetIndex + 1);
  });

  it('兄弟ノードの追加（Shift+Enter操作相当: 上側に追加）が正常に機能すること', () => {
    const map = createDefaultMindMap('メイン');
    const children = getChildren(map, map.rootId);
    const targetChild = children[1];
    const { updatedMap, newNodeId } = addSiblingNode(map, targetChild.id, '上側に追加された兄弟', 'before');

    expect(updatedMap.nodes[newNodeId]).toBeDefined();
    expect(updatedMap.nodes[newNodeId].text).toBe('上側に追加された兄弟');

    const newChildren = getChildren(updatedMap, map.rootId);
    const newIndex = newChildren.findIndex((c) => c.id === newNodeId);
    const targetIndex = newChildren.findIndex((c) => c.id === targetChild.id);
    expect(newIndex).toBe(targetIndex - 1);
  });

  it('ノードを削除した際、その子孫ノードも連鎖して削除されること', () => {
    const map = createDefaultMindMap('メイン');
    const firstChild = getChildren(map, map.rootId)[0];

    // 孫ノードを追加
    const { updatedMap: mapWithGrandChild, newNodeId: grandChildId } = addChildNode(
      map,
      firstChild.id,
      '孫ノード'
    );

    expect(mapWithGrandChild.nodes[grandChildId]).toBeDefined();

    // firstChild を削除
    const { updatedMap: mapAfterDelete } = deleteNode(mapWithGrandChild, firstChild.id);

    // firstChild も grandChild も削除されていること
    expect(mapAfterDelete.nodes[firstChild.id]).toBeUndefined();
    expect(mapAfterDelete.nodes[grandChildId]).toBeUndefined();

    // ルートは残っていること
    expect(mapAfterDelete.nodes[map.rootId]).toBeDefined();
  });

  it('ルートノードの削除は防止されること', () => {
    const map = createDefaultMindMap('ルート保護テスト');
    const { updatedMap: mapAfterDelete } = deleteNode(map, map.rootId);

    // ルートノードは削除されずにそのまま残る
    expect(mapAfterDelete.nodes[map.rootId]).toBeDefined();
  });

  it('ノードの折りたたみトグルが機能すること', () => {
    const base = createDefaultMindMap('メイン');
    const firstChild = getChildren(base, base.rootId)[0];
    // 子のないノードは折りたためないので、子を 1 つ付けておく
    const map = addChildNode(base, firstChild.id, '孫').updatedMap;

    const foldedMap = toggleFoldNode(map, firstChild.id);
    expect(foldedMap.nodes[firstChild.id].isFolded).toBe(true);

    const unfoldedMap = toggleFoldNode(foldedMap, firstChild.id);
    expect(unfoldedMap.nodes[firstChild.id].isFolded).toBe(false);
  });

  it('親ノードの付け替え（ドラッグ＆ドロップ）が正しく機能すること', () => {
    const map = createDefaultMindMap('メイン');
    const children = getChildren(map, map.rootId);
    const nodeA = children[0];
    const nodeB = children[1];

    // nodeB を nodeA の子にする
    const reparented = reparentNode(map, nodeB.id, nodeA.id);
    expect(reparented.nodes[nodeB.id].parentId).toBe(nodeA.id);

    const nodeAChildren = getChildren(reparented, nodeA.id);
    expect(nodeAChildren.some((c) => c.id === nodeB.id)).toBe(true);
  });

  it('同一レベルの兄弟ノードを別の兄弟ノードの子にした際、親が折りたたまれていれば自動展開され、元の親の兄弟orderが再採番されること', () => {
    let map = createDefaultMindMap('メイン');
    const children = getChildren(map, map.rootId);
    const nodeA = children[0];
    const nodeB = children[1];

    // nodeA を折りたたむ（子のないノードは折りたためないので、子を 1 つ付けておく）
    map = addChildNode(map, nodeA.id, '孫').updatedMap;
    map = toggleFoldNode(map, nodeA.id);
    expect(map.nodes[nodeA.id].isFolded).toBe(true);

    // 同一レベルの nodeB を nodeA の子に移動
    const reparented = reparentNode(map, nodeB.id, nodeA.id);

    // nodeA の折りたたみが自動解除されていること
    expect(reparented.nodes[nodeA.id].isFolded).toBe(false);
    expect(reparented.nodes[nodeB.id].parentId).toBe(nodeA.id);

    // 元の親(root)に残った兄弟(nodeA, nodeCなど)のorderが0から連続していること
    const remainingRootChildren = getChildren(reparented, map.rootId);
    expect(remainingRootChildren.some((c) => c.id === nodeB.id)).toBe(false);
    remainingRootChildren.forEach((child, index) => {
      expect(child.order).toBe(index);
    });
  });

  it('ノードのテキストおよび装飾プロパティの更新が正しく機能すること', () => {
    let map = createDefaultMindMap('メイン');
    const rootId = map.rootId;

    // ルートノードのテキスト更新で map.title も同期更新されること（要望1: 案A）
    map = updateNodeText(map, rootId, '更新されたタイトル');
    expect(map.nodes[rootId].text).toBe('更新されたタイトル');
    expect(map.title).toBe('更新されたタイトル');

    // 空文字で更新された場合はデフォルトの中心トピックになること
    const emptyUpdated = updateNodeText(map, rootId, '   ');
    expect(emptyUpdated.title).toBe('中心トピック');

    // 子ノードのテキスト更新では map.title は変わらないこと
    const firstChild = getChildren(map, rootId)[0];
    const childUpdated = updateNodeText(map, firstChild.id, '子ノードの更新');
    expect(childUpdated.nodes[firstChild.id].text).toBe('子ノードの更新');
    expect(childUpdated.title).toBe('更新されたタイトル');

    map = updateNodeProps(map, rootId, { color: '#3b82f6', bold: true });
    expect(map.nodes[rootId].color).toBe('#3b82f6');
    expect(map.nodes[rootId].bold).toBe(true);
  });

  it('「あいうえお」の5ノード連続作成および空ノード削除が整合性高く動作すること', () => {
    let map = createDefaultMindMap('中心トピック');
    const rootId = map.rootId;
    // ルート以外を一旦クリア
    map = {
      ...map,
      nodes: { [rootId]: map.nodes[rootId] },
    };

    // 1. 'あ' ノードを子として作成
    const resA = addChildNode(map, rootId, 'あ');
    map = resA.updatedMap;
    // 2. 'い', 'う', 'え', 'お' を兄弟として順次作成
    const resI = addSiblingNode(map, resA.newNodeId, 'い', 'after');
    map = resI.updatedMap;
    const resU = addSiblingNode(map, resI.newNodeId, 'う', 'after');
    map = resU.updatedMap;
    const resE = addSiblingNode(map, resU.newNodeId, 'え', 'after');
    map = resE.updatedMap;
    const resO = addSiblingNode(map, resE.newNodeId, 'お', 'after');
    map = resO.updatedMap;

    let children = getChildren(map, rootId);
    expect(children.map((c) => c.text)).toEqual(['あ', 'い', 'う', 'え', 'お']);

    // 3. 空白ノードを作成し、未入力でキャンセル（deleteNode）した場合
    const resDraft = addSiblingNode(map, resO.newNodeId, '', 'after');
    map = resDraft.updatedMap;
    expect(map.nodes[resDraft.newNodeId]).toBeDefined();

    // 未入力キャンセル
    const resDel = deleteNode(map, resDraft.newNodeId);
    map = resDel.updatedMap;

    // 空ノードが完全に消去され、あいうえおの5ノードだけが残ること
    children = getChildren(map, rootId);
    expect(children.map((c) => c.text)).toEqual(['あ', 'い', 'う', 'え', 'お']);
    expect(Object.keys(map.nodes).length).toBe(6); // root + 5
  });

  it('deleteNodes で複数ノードが一括削除され、接続するリレーションも破棄されること', () => {
    let map = createDefaultMindMap('中心');
    const children = getChildren(map, map.rootId);
    const n1 = children[0].id;
    const n2 = children[1].id;
    const n3 = children[2].id;

    map = {
      ...map,
      relationships: {
        rel1: { id: 'rel1', sourceId: n1, targetId: n2 },
        rel2: { id: 'rel2', sourceId: n2, targetId: n3 },
      },
    };

    // n1, n2 を一括削除
    const { updatedMap } = deleteNodes(map, [n1, n2]);
    expect(updatedMap.nodes[n1]).toBeUndefined();
    expect(updatedMap.nodes[n2]).toBeUndefined();
    expect(updatedMap.nodes[n3]).toBeDefined();

    // rel1 (n1-n2) と rel2 (n2-n3) はどちらも削除対象ノードを含んでいるため破棄されること
    expect(updatedMap.relationships).toBeDefined();
    expect(Object.keys(updatedMap.relationships || {}).length).toBe(0);
  });

  it('deleteNode で単一ノード削除時に紐づくリレーションが自動破棄されること', () => {
    let map = createDefaultMindMap('中心');
    const children = getChildren(map, map.rootId);
    const n1 = children[0].id;
    const n2 = children[1].id;

    map = {
      ...map,
      relationships: {
        rel1: { id: 'rel1', sourceId: n1, targetId: n2 },
      },
    };

    const { updatedMap } = deleteNode(map, n1);
    expect(updatedMap.nodes[n1]).toBeUndefined();
    expect(updatedMap.nodes[n2]).toBeDefined();
    expect(updatedMap.relationships?.['rel1']).toBeUndefined();
  });

  it('updateMultipleNodesProps で複数ノードの装飾プロパティが一括適用されること', () => {
    const map = createDefaultMindMap('中心');
    const children = getChildren(map, map.rootId);
    const ids = [children[0].id, children[1].id];

    const updated = updateMultipleNodesProps(map, ids, {
      color: '#ef4444',
      fontSize: 'lg',
      bold: true,
    });

    expect(updated.nodes[ids[0]].color).toBe('#ef4444');
    expect(updated.nodes[ids[0]].fontSize).toBe('lg');
    expect(updated.nodes[ids[0]].bold).toBe(true);

    expect(updated.nodes[ids[1]].color).toBe('#ef4444');
    expect(updated.nodes[ids[1]].fontSize).toBe('lg');
    expect(updated.nodes[ids[1]].bold).toBe(true);
  });
});

describe('copySubtree', () => {
  /** root の子 a（孫 a1 つき）と b を持つマップ */
  const buildMap = () => {
    const base = createDefaultMindMap('中心');
    const [a, b] = getChildren(base, base.rootId);
    const { updatedMap, newNodeId: a1 } = addChildNode(base, a.id, '孫');
    return { map: updatedMap, a: a.id, a1, b: b.id };
  };

  it('部分木を、新しい id で貼り付け先の子として複製すること', () => {
    const { map, a, a1, b } = buildMap();
    const { updatedMap, newRootNodeId } = copySubtree(map, a, b);

    const copy = updatedMap.nodes[newRootNodeId];
    expect(copy.id).not.toBe(a);
    expect(copy.parentId).toBe(b);
    expect(copy.text).toBe(map.nodes[a].text);

    const copiedChildren = getChildren(updatedMap, newRootNodeId);
    expect(copiedChildren).toHaveLength(1);
    expect(copiedChildren[0].id).not.toBe(a1);
    expect(copiedChildren[0].text).toBe('孫');
    // コピー元は変わらない
    expect(updatedMap.nodes[a]).toBe(map.nodes[a]);
    expect(updatedMap.nodes[a1]).toBe(map.nodes[a1]);
  });

  it('貼り付け先が折りたたまれていたら展開すること', () => {
    const { map: base, a, b } = buildMap();
    // 子のないノードは折りたためないので、貼り付け先に子を 1 つ付けておく
    const map = addChildNode(base, b, '孫').updatedMap;
    const folded = toggleFoldNode(map, b);
    expect(folded.nodes[b].isFolded).toBe(true);

    const { updatedMap } = copySubtree(folded, a, b);
    expect(updatedMap.nodes[b].isFolded).toBe(false);
    // 元のマップは書き換えない
    expect(folded.nodes[b].isFolded).toBe(true);
  });

  it('折りたたまれたノードを自分自身の中に貼り付けても、複製は折りたたまれたままであること', () => {
    const { map, a } = buildMap();
    const folded = toggleFoldNode(map, a);

    const { updatedMap, newRootNodeId } = copySubtree(folded, a, a);
    expect(updatedMap.nodes[a].isFolded).toBe(false);
    expect(updatedMap.nodes[newRootNodeId].isFolded).toBe(true);
  });

  it('コピー元か貼り付け先が存在しないときは、マップを変えず、新しい id を空で返すこと', () => {
    const { map, a } = buildMap();
    expect(copySubtree(map, 'missing', a)).toEqual({ updatedMap: map, newRootNodeId: '' });
    expect(copySubtree(map, a, 'missing')).toEqual({ updatedMap: map, newRootNodeId: '' });
    expect(copySubtree(map, 'missing', a).updatedMap).toBe(map);
  });
});
