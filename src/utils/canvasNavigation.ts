import type { LayoutResult, PositionedNode } from '../types';

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

type NavLayout = Pick<LayoutResult, 'nodes' | 'nodeMap'>;

const ARROW_KEYS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export function isArrowKey(key: string): key is ArrowKey {
  return ARROW_KEYS.includes(key);
}

const byY = (a: PositionedNode, b: PositionedNode) => a.y - b.y;

/** 子を y の昇順で並べる */
function childrenOf(layout: NavLayout, parentId: string, side?: 'left' | 'right'): PositionedNode[] {
  return layout.nodes
    .filter((n) => n.parentId === parentId && (side === undefined || n.effectiveSide === side))
    .sort(byY);
}

/** 並びの真ん中（偶数個なら後ろ寄り） */
function middle(list: PositionedNode[]): string | null {
  return list.length > 0 ? list[Math.floor(list.length / 2)].id : null;
}

/** 1 = 下、-1 = 上 */
type VerticalDirection = 1 | -1;

/**
 * 上下方向の移動先。次の順に探す。
 * 1. 隣の兄弟
 * 2. 同じ側・同じ深さで、その方向にいちばん近いノード
 * 3. 同じ側で、その方向にいちばん近いノード
 */
function findVerticalTarget(
  layout: NavLayout,
  rootId: string,
  curr: PositionedNode,
  dir: VerticalDirection
): string | null {
  if (curr.id === rootId) {
    const children = childrenOf(layout, rootId);
    if (children.length === 0) return null;
    return (dir === -1 ? children[0] : children[children.length - 1]).id;
  }

  if (!curr.parentId) return null;
  // ルートの子は左右に分かれるため、同じ側のノードだけを兄弟として扱う（y 順だと左右が交互に並ぶ）
  const siblings = childrenOf(layout, curr.parentId, curr.effectiveSide);
  const index = siblings.findIndex((s) => s.id === curr.id);
  // 兄弟の中に見つからない（index = -1）とき、上方向では兄弟を探さない（元の挙動のまま）
  const siblingIndex = dir === -1 ? (index > 0 ? index - 1 : -1) : index !== -1 ? index + 1 : -1;
  if (siblingIndex >= 0 && siblingIndex < siblings.length) return siblings[siblingIndex].id;

  const isAhead = (n: PositionedNode) => (dir === -1 ? n.y < curr.y : n.y > curr.y);
  const sameSide = layout.nodes.filter(
    (n) => n.id !== curr.id && n.id !== rootId && n.effectiveSide === curr.effectiveSide && isAhead(n)
  );
  // 近い順：上方向なら y の降順、下方向なら昇順
  const nearestFirst = (a: PositionedNode, b: PositionedNode) => (a.y - b.y) * dir;

  const sameDepth = sameSide.filter((n) => n.depth === curr.depth).sort(nearestFirst);
  if (sameDepth.length > 0) return sameDepth[0].id;

  const any = [...sameSide].sort(nearestFirst);
  return any.length > 0 ? any[0].id : null;
}

/**
 * 左右方向の移動先。
 * - ルート：その側の子の真ん中
 * - 子が伸びる側（外側）：子の真ん中
 * - 反対側（内側）：親
 */
function findHorizontalTarget(
  layout: NavLayout,
  rootId: string,
  curr: PositionedNode,
  side: 'left' | 'right'
): string | null {
  if (curr.id === rootId) return middle(childrenOf(layout, rootId, side));
  if (curr.effectiveSide === side) return middle(childrenOf(layout, curr.id));
  return curr.parentId ?? null;
}

/** 矢印キーでの移動先のノード id。移動先がなければ null */
export function findArrowNavigationTarget(
  layout: NavLayout,
  rootId: string,
  currentId: string,
  key: ArrowKey
): string | null {
  const curr = layout.nodeMap.get(currentId);
  if (!curr) return null;

  switch (key) {
    case 'ArrowUp':
      return findVerticalTarget(layout, rootId, curr, -1);
    case 'ArrowDown':
      return findVerticalTarget(layout, rootId, curr, 1);
    case 'ArrowLeft':
      return findHorizontalTarget(layout, rootId, curr, 'left');
    case 'ArrowRight':
      return findHorizontalTarget(layout, rootId, curr, 'right');
  }
}
