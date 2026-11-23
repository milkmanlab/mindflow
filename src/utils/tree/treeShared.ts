import { MindMap, MindNode } from '../../types';
import { assignRootChildSides, nextRootChildSide } from '../rootSide';
import { ChildrenMap, compareSiblingOrder } from './treeQueries';

// ツリー操作に共通の部品。utils/tree/ の中だけで使う（treeOperations.ts からは公開しない）。
//
// nodes を受け取って書き換える関数は、呼び出し側が `{ ...map.nodes }` で作った作業用のコピーを渡すこと。
// 元の map は書き換えない

export type Side = 'left' | 'right';
type NodeRecord = Record<string, MindNode>;

/** 兄弟に、並びの順に order を振り直す（順番が変わらないノードの updatedAt も更新する） */
export function reindexSiblings(nodes: NodeRecord, siblings: MindNode[], now: number): void {
  siblings.forEach((s, index) => {
    nodes[s.id] = { ...nodes[s.id], order: index, updatedAt: now };
  });
}

/**
 * マインドマップ型のルートの子に、左右をまたいだ通し番号を振り直す（左右それぞれの中の順番は保つ）。
 * 並べ替えは同じ側の中だけで order を振るので、左右で同じ order ができるのを防ぐ。
 * ルートの子でない、またはマインドマップ型でないときは何もしない
 */
export function renumberRootChildren(map: MindMap, nodes: NodeRecord, parentId: string | null | undefined, now: number): void {
  if (map.layoutType !== 'mindmap' || !parentId || parentId !== map.rootId) return;
  const children = Object.values(nodes)
    .filter((n) => n.parentId === parentId)
    .sort(compareSiblingOrder);
  children.forEach((child, index) => {
    if (child.order !== index) nodes[child.id] = { ...child, order: index, updatedAt: now };
  });
}

/** 子孫すべての side を書き換える（nodeId 自身は変えない） */
export function setDescendantsSide(
  nodes: NodeRecord,
  childrenMap: ChildrenMap,
  nodeId: string,
  side: Side | undefined,
  now: number
): void {
  for (const child of childrenMap.get(nodeId) || []) {
    nodes[child.id] = { ...nodes[child.id], side, updatedAt: now };
    setDescendantsSide(nodes, childrenMap, child.id, side, now);
  }
}

/** ノードと、それにつながる関連線を取り除いたマップを返す（残るノードは作り直さない） */
export function removeNodes(map: MindMap, idsToDelete: Set<string>, now: number): MindMap {
  const nodes: NodeRecord = {};
  Object.entries(map.nodes).forEach(([id, node]) => {
    if (!idsToDelete.has(id)) nodes[id] = node;
  });

  let relationships = map.relationships;
  if (map.relationships) {
    relationships = {};
    for (const [relId, rel] of Object.entries(map.relationships)) {
      if (!idsToDelete.has(rel.sourceId) && !idsToDelete.has(rel.targetId)) relationships[relId] = rel;
    }
  }

  return { ...map, nodes, relationships, updatedAt: now };
}

// ---- side（枝の左右）の決め方 ----

/**
 * 子を追加するとき。
 * ツリー型はレイアウトの向き。マインドマップ型は、ルートの子なら指定された側（なければ rootSide.ts の決まり：
 * 右を先に 5 本埋め、次に左を 5 本、そのあとは交互）、それ以外は親と同じ側
 */
export function sideForNewChild(map: MindMap, parent: MindNode, siblings: MindNode[], sideHint?: Side): Side {
  if (map.layoutType === 'tree-right') return 'right';
  if (map.layoutType === 'tree-left') return 'left';
  if (parent.id !== map.rootId) return parent.side || 'right';
  if (sideHint) return sideHint;

  // side のない子は、読み込み・描画と同じく並び順で側を決めて数える
  const sides = assignRootChildSides(siblings);
  const leftCount = sides.filter((s) => s === 'left').length;
  return nextRootChildSide(sides.length - leftCount, leftCount);
}

/** マインドマップ型のルートの子について、各子の実際の側（side がなければ並び順で決めた側）を id で引けるようにする */
export function rootChildSides(siblings: MindNode[]): Map<string, Side> {
  const sides = assignRootChildSides(siblings);
  return new Map(siblings.map((c, i) => [c.id, sides[i]]));
}

/** 兄弟を追加するとき。ツリー型はレイアウトの向き、マインドマップ型は基準のノードと同じ側 */
export function sideForNewSibling(map: MindMap, target: MindNode): Side | undefined {
  if (map.layoutType === 'tree-right') return 'right';
  if (map.layoutType === 'tree-left') return 'left';
  return target.side;
}

/** 親の下に入れるとき（D&D の「中へ」、貼り付け）。ルートの下なら自分の side（なければ右）、それ以外は親と同じ側 */
export function sideUnderParent(map: MindMap, parent: MindNode, ownSide: Side | undefined): Side | undefined {
  return parent.id === map.rootId ? ownSide || 'right' : parent.side;
}

/**
 * 兄弟として並べるとき（D&D の「前へ」「後ろへ」）。
 * ルートの子同士なら相手と同じ側（マインドマップ型で相手に side がなければ右）、それ以外は相手の親と同じ側
 */
export function sideForSiblingDrop(map: MindMap, target: MindNode): Side | undefined {
  if (target.parentId === map.rootId) {
    return map.layoutType === 'mindmap' ? target.side || 'right' : target.side;
  }
  const parent = target.parentId ? map.nodes[target.parentId] : undefined;
  return parent ? parent.side : target.side;
}
