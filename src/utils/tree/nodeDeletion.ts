import { MindMap, MindNode } from '../../types';
import { getDescendantIds, getReorderSiblings } from './treeQueries';
import { removeNodes } from './treeShared';

/**
 * 削除したあとに選ぶノード。前の兄弟、なければ次の兄弟、兄弟がいなければ親。
 * マインドマップ型のルートの子は、同じ側の兄弟の中から選ぶ
 */
function pickNextSelectedId(map: MindMap, node: MindNode): string {
  const parentId = node.parentId || map.rootId;
  const siblings = getReorderSiblings(map, node);
  const index = siblings.findIndex((n) => n.id === node.id);

  if (siblings.length > 1) {
    if (index > 0) return siblings[index - 1].id;
    if (index < siblings.length - 1) return siblings[index + 1].id;
  }
  return parentId;
}

/**
 * ノードと子孫、それにつながる関連線を削除する（Delete / Backspace）。
 * ルートは削除できない（同じマップを返す）
 */
export function deleteNode(
  map: MindMap,
  nodeId: string
): { updatedMap: MindMap; nextSelectedId: string | null } {
  const node = map.nodes[nodeId];
  if (nodeId === map.rootId || !node) {
    return { updatedMap: map, nextSelectedId: map.rootId };
  }

  const idsToDelete = new Set([nodeId, ...getDescendantIds(map, nodeId)]);
  return {
    updatedMap: removeNodes(map, idsToDelete, Date.now()),
    nextSelectedId: pickNextSelectedId(map, node),
  };
}

/**
 * 複数のノードと、それぞれの子孫、それにつながる関連線を削除する。
 * ルートと存在しない id は無視する。削除のあとはルートを選ぶ
 */
export function deleteNodes(
  map: MindMap,
  nodeIds: string[]
): { updatedMap: MindMap; nextSelectedId: string | null } {
  const validNodeIds = nodeIds.filter((id) => id !== map.rootId && !!map.nodes[id]);
  if (validNodeIds.length === 0) {
    return { updatedMap: map, nextSelectedId: map.rootId };
  }

  const idsToDelete = new Set<string>();
  validNodeIds.forEach((id) => {
    idsToDelete.add(id);
    getDescendantIds(map, id).forEach((descendantId) => idsToDelete.add(descendantId));
  });

  return { updatedMap: removeNodes(map, idsToDelete, Date.now()), nextSelectedId: map.rootId };
}
