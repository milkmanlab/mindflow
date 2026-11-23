import { MindMap, MindNode } from '../../types';

/** 親 id → 子の一覧（並び順どおり） */
export type ChildrenMap = Map<string, MindNode[]>;

/** 兄弟の並び順（order、同じなら作成順） */
export function compareSiblingOrder(a: MindNode, b: MindNode): number {
  return (a.order ?? 0) - (b.order ?? 0) || a.createdAt - b.createdAt;
}

/**
 * 親 id → 子の一覧（並び順どおり）を作る。全ノードを 1 回だけ走査する。
 * 木を何度もたどる処理は、getChildren を繰り返し呼ばずに、これを 1 回作って使う
 */
export function buildChildrenMap(nodes: Record<string, MindNode>): ChildrenMap {
  const childrenMap: ChildrenMap = new Map();
  Object.values(nodes).forEach((n) => {
    if (n.parentId) {
      const siblings = childrenMap.get(n.parentId) || [];
      siblings.push(n);
      childrenMap.set(n.parentId, siblings);
    }
  });
  childrenMap.forEach((children) => children.sort(compareSiblingOrder));
  return childrenMap;
}

/** ノードの子を、並び順どおりに返す */
export function getChildren(map: MindMap, parentId: string): MindNode[] {
  return Object.values(map.nodes)
    .filter((n) => n.parentId === parentId)
    .sort(compareSiblingOrder);
}

function collectDescendantIds(childrenMap: ChildrenMap, nodeId: string, out: string[]): void {
  for (const child of childrenMap.get(nodeId) || []) {
    out.push(child.id);
    collectDescendantIds(childrenMap, child.id, out);
  }
}

/** 子孫の id を返す（親 → 子の順、兄弟は並び順どおり。自分自身は含めない） */
export function getDescendantIds(map: MindMap, nodeId: string): string[] {
  const descendants: string[] = [];
  collectDescendantIds(buildChildrenMap(map.nodes), nodeId, descendants);
  return descendants;
}

/**
 * 並べ替えの対象になる兄弟（自分を含む）を、並び順どおりに返す。
 * マインドマップ型でルートの子なら、同じ側の兄弟だけ（side がなければ右側として扱う）
 */
export function getReorderSiblings(map: MindMap, node: MindNode): MindNode[] {
  if (!node.parentId) return [];
  const siblings = getChildren(map, node.parentId);
  if (node.parentId !== map.rootId || map.layoutType !== 'mindmap') return siblings;

  const side = node.side || 'right';
  return siblings.filter((s) => (s.side || 'right') === side);
}
