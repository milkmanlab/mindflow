import { MindMap, MindNode } from '../../types';
import { generateId } from '../id';
import { ChildrenMap, buildChildrenMap } from './treeQueries';
import { Side, sideUnderParent } from './treeShared';

/** 子孫を、新しい id で複製する（親 → 子の順。兄弟の order はそのまま） */
function cloneDescendants(
  childrenMap: ChildrenMap,
  oldParentId: string,
  newParentId: string,
  side: Side | undefined,
  now: number
): MindNode[] {
  return (childrenMap.get(oldParentId) || []).flatMap((child) => {
    const id = generateId();
    const clone: MindNode = { ...child, id, parentId: newParentId, side, createdAt: now, updatedAt: now };
    return [clone, ...cloneDescendants(childrenMap, child.id, id, side, now)];
  });
}

/**
 * ノードと子孫を複製し、貼り付け先の末尾の子にする（コピーと貼り付け）。
 * 貼り付け先が折りたたまれていたら展開する。関連線は複製しない
 */
export function copySubtree(
  map: MindMap,
  sourceNodeId: string,
  targetParentId: string
): { updatedMap: MindMap; newRootNodeId: string } {
  const source = map.nodes[sourceNodeId];
  const targetParent = map.nodes[targetParentId];
  if (!source || !targetParent) return { updatedMap: map, newRootNodeId: '' };

  const now = Date.now();
  const newRootId = generateId();
  const childrenMap = buildChildrenMap(map.nodes);
  const side = sideUnderParent(map, targetParent, source.side);

  const nodes: Record<string, MindNode> = { ...map.nodes };
  nodes[newRootId] = {
    ...source,
    id: newRootId,
    parentId: targetParentId,
    side,
    order: (childrenMap.get(targetParentId) || []).length,
    createdAt: now,
    updatedAt: now,
  };
  // 貼り付け先が折りたたまれていたら展開する（貼り付けたノードが見えるようにする）
  if (targetParent.isFolded) {
    nodes[targetParentId] = { ...targetParent, isFolded: false, updatedAt: now };
  }
  for (const clone of cloneDescendants(childrenMap, sourceNodeId, newRootId, side, now)) {
    nodes[clone.id] = clone;
  }

  return { updatedMap: { ...map, nodes, updatedAt: now }, newRootNodeId: newRootId };
}
