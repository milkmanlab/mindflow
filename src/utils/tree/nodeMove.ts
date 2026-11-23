import { MindMap, MindNode } from '../../types';
import { buildChildrenMap, getDescendantIds, getReorderSiblings } from './treeQueries';
import { Side, reindexSiblings, renumberRootChildren, setDescendantsSide, sideForSiblingDrop, sideUnderParent } from './treeShared';

export type DropPosition = 'before' | 'after' | 'inside';

/**
 * ノードを、別のノードの子にする（D&D の「中へ」）。末尾の子になる。
 * ルート・自分自身・自分の子孫の中へは動かせない（同じマップを返す）
 *
 * @param sideHint 放射状のマップで、ルートの下に入れるときの側（その側の末尾に入る）。それ以外では使わない。
 *   ルートの子が、同じ側を指定されたときは、何も変えない（同じマップを返す）
 */
export function reparentNode(map: MindMap, nodeId: string, newParentId: string, sideHint?: Side): MindMap {
  if (nodeId === map.rootId || nodeId === newParentId) return map;
  if (getDescendantIds(map, nodeId).includes(newParentId)) return map;

  const node = map.nodes[nodeId];
  const newParent = map.nodes[newParentId];
  if (!node || !newParent) return map;

  const now = Date.now();
  const childrenMap = buildChildrenMap(map.nodes);
  const useSideHint = !!sideHint && newParentId === map.rootId && map.layoutType === 'mindmap';
  const side = useSideHint ? sideHint : sideUnderParent(map, newParent, node.side);
  // 同じ側へ、同じ親の中で動かしても何も変わらない
  if (useSideHint && node.parentId === newParentId && (node.side || 'right') === side) return map;
  const order = (childrenMap.get(newParentId) || []).length;
  const nodes: Record<string, MindNode> = {
    ...map.nodes,
    [nodeId]: { ...node, parentId: newParentId, side, order, updatedAt: now },
  };

  // 移動先が折りたたまれていたら展開する（動かしたノードが見えるようにする）
  if (newParent.isFolded) {
    nodes[newParentId] = { ...newParent, isFolded: false, updatedAt: now };
  }
  // 元の親に残った兄弟の順番を詰める
  if (node.parentId && node.parentId !== newParentId) {
    const oldSiblings = (childrenMap.get(node.parentId) || []).filter((s) => s.id !== nodeId);
    reindexSiblings(nodes, oldSiblings, now);
  }
  setDescendantsSide(nodes, childrenMap, nodeId, side, now);
  // 放射状のルートの子は、左右をまたいだ通し番号を振り直す（同じ親の中で側だけ変えたときの order の隙間も詰まる）
  renumberRootChildren(map, nodes, newParentId, now);

  return { ...map, nodes, updatedAt: now };
}

/** ノードを、target の兄弟として、その直前か直後に入れる */
function moveAsSibling(
  map: MindMap,
  source: MindNode,
  target: MindNode,
  position: 'before' | 'after'
): MindMap {
  const now = Date.now();
  const parentId = target.parentId as string;
  const side = sideForSiblingDrop(map, target);

  // 並べる兄弟（マインドマップ型のルートの子は、相手と同じ側だけ）から自分を除き、相手の前後に入れ直す
  const siblings = getReorderSiblings(map, target).filter((s) => s.id !== source.id);
  const targetIndex = siblings.findIndex((s) => s.id === target.id);
  siblings.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, source);

  const nodes: Record<string, MindNode> = {
    ...map.nodes,
    [source.id]: { ...source, parentId, side, updatedAt: now },
  };
  reindexSiblings(nodes, siblings, now);
  renumberRootChildren(map, nodes, parentId, now);

  // 別の親から移ってきたときは、元の親に残った兄弟の順番を詰める
  const childrenMap = buildChildrenMap(map.nodes);
  if (source.parentId && source.parentId !== parentId) {
    const oldSiblings = (childrenMap.get(source.parentId) || []).filter((s) => s.id !== source.id);
    reindexSiblings(nodes, oldSiblings, now);
  }
  setDescendantsSide(nodes, childrenMap, source.id, side, now);

  return { ...map, nodes, updatedAt: now };
}

/**
 * D&D でノードを動かす。
 * - 'inside'：target の子にする（target が放射状のルートなら、sideHint の側の末尾）
 * - 'before' / 'after'：target の兄弟として、その直前 / 直後に入れる
 *
 * ルート・自分自身・自分の子孫へは動かせない（同じマップを返す）
 */
export function reorderOrReparentNode(
  map: MindMap,
  sourceNodeId: string,
  targetNodeId: string,
  position: DropPosition = 'inside',
  sideHint?: Side
): MindMap {
  if (sourceNodeId === map.rootId || sourceNodeId === targetNodeId) return map;

  const source = map.nodes[sourceNodeId];
  const target = map.nodes[targetNodeId];
  if (!source || !target) return map;
  if (getDescendantIds(map, sourceNodeId).includes(targetNodeId)) return map;

  // 「中へ」のとき。または、相手が兄弟を持てない（ルート、親のないノード）とき
  if (position === 'inside' || targetNodeId === map.rootId || !target.parentId) {
    return reparentNode(map, sourceNodeId, targetNodeId, sideHint);
  }
  return moveAsSibling(map, source, target, position);
}

/**
 * 兄弟の中で、1 つ上か下に動かす（Alt + ↑ / ↓）。
 * マインドマップ型のルートの子は、同じ側の兄弟の中だけで動く。端では何もしない（同じマップを返す）
 */
export function moveSiblingOrder(map: MindMap, nodeId: string, direction: 'up' | 'down'): MindMap {
  const node = map.nodes[nodeId];
  if (!node || !node.parentId) return map;

  const siblings = getReorderSiblings(map, node);
  const currentIndex = siblings.findIndex((s) => s.id === nodeId);
  if (currentIndex === -1) return map;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= siblings.length) return map;

  const [moved] = siblings.splice(currentIndex, 1);
  siblings.splice(targetIndex, 0, moved);

  const now = Date.now();
  const nodes = { ...map.nodes };
  reindexSiblings(nodes, siblings, now);
  renumberRootChildren(map, nodes, node.parentId, now);

  return { ...map, nodes, updatedAt: now };
}
