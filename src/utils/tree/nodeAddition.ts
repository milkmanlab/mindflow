import { MindMap, MindNode } from '../../types';
import { generateId } from '../id';
import { getChildren } from './treeQueries';
import { Side, reindexSiblings, rootChildSides, sideForNewChild, sideForNewSibling } from './treeShared';

/**
 * 子ノードを、末尾に追加する（Tab）。親が折りたたまれていたら展開する
 * @param sideHint マインドマップ型のルートに追加するときの側
 */
export function addChildNode(
  map: MindMap,
  parentId: string,
  initialText = '',
  sideHint?: Side
): { updatedMap: MindMap; newNodeId: string } {
  const parent = map.nodes[parentId];
  if (!parent) return { updatedMap: map, newNodeId: '' };

  const newNodeId = generateId();
  const now = Date.now();
  const siblings = getChildren(map, parentId);

  const newNode: MindNode = {
    id: newNodeId,
    parentId,
    text: initialText,
    side: sideForNewChild(map, parent, siblings, sideHint),
    order: siblings.length,
    createdAt: now,
    updatedAt: now,
  };
  // 親が折りたたまれていたら展開する（追加したノードが見えるようにする）
  const updatedParent = parent.isFolded ? { ...parent, isFolded: false, updatedAt: now } : parent;

  return {
    updatedMap: {
      ...map,
      nodes: { ...map.nodes, [parentId]: updatedParent, [newNodeId]: newNode },
      updatedAt: now,
    },
    newNodeId,
  };
}

/**
 * 兄弟ノードを、基準のノードの直前か直後に追加する（Shift+Enter / Enter）。
 * ルートは兄弟を持てないので、ルートで呼ぶと子を追加する
 */
export function addSiblingNode(
  map: MindMap,
  targetNodeId: string,
  initialText = '',
  position: 'before' | 'after' = 'after'
): { updatedMap: MindMap; newNodeId: string } {
  const target = map.nodes[targetNodeId];
  if (!target) return { updatedMap: map, newNodeId: '' };
  if (targetNodeId === map.rootId || !target.parentId) {
    return addChildNode(map, targetNodeId, initialText);
  }

  const parentId = target.parentId;
  const siblings = getChildren(map, parentId);
  const targetIndex = siblings.findIndex((n) => n.id === targetNodeId);
  let insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
  let side = sideForNewSibling(map, target);

  // マインドマップ型のルートの子で、その側の末尾から「後ろ」に足すときは、置き場所を決まりに任せる
  // （右が埋まったら左へ回る）。反対側になるときは、並び全体の末尾に入る
  if (map.layoutType === 'mindmap' && parentId === map.rootId && position === 'after') {
    const sides = rootChildSides(siblings);
    const targetSide = sides.get(targetNodeId);
    const isLastOnItsSide = siblings.slice(targetIndex + 1).every((n) => sides.get(n.id) !== targetSide);
    if (isLastOnItsSide) {
      const nextSide = sideForNewChild(map, map.nodes[parentId], siblings);
      side = nextSide;
      if (nextSide !== targetSide) insertIndex = siblings.length;
    } else {
      side = targetSide;
    }
  }

  const newNodeId = generateId();
  const now = Date.now();
  const newNode: MindNode = {
    id: newNodeId,
    parentId,
    text: initialText,
    side,
    order: insertIndex,
    createdAt: now,
    updatedAt: now,
  };
  siblings.splice(insertIndex, 0, newNode);

  const nodes: Record<string, MindNode> = { ...map.nodes, [newNodeId]: newNode };
  reindexSiblings(nodes, siblings, now);

  return { updatedMap: { ...map, nodes, updatedAt: now }, newNodeId };
}
