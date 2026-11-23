import {
  DEFAULT_CONNECTOR_STYLE,
  MindMap,
  MindNode,
  PositionedNode,
  Connection,
  ConnectorStyle,
  LayoutResult,
  LayoutBounds,
  LayoutType,
} from '../types';
import { getTheme } from './themes';
import { estimateNodeDimensions } from './nodeDimensions';
import { createConnection } from './connectionPath';
import { ChildrenMap, buildChildrenMap } from './tree/treeQueries';
import { assignRootChildSides } from './rootSide';

/** 親と子の横の間隔 */
const HORIZONTAL_LEVEL_GAP = 95;
/** ルートと階層 1 の間に足す横の間隔 */
const ROOT_GAP_EXTRA = 25;
/** 兄弟の縦の間隔 */
const VERTICAL_NODE_GAP = 18;
/** 階層 1 の枝の縦の間隔 */
const FIRST_LEVEL_BRANCH_GAP = VERTICAL_NODE_GAP + 10;
/** すべてのノードを囲む範囲の外側に付ける余白 */
const BOUNDS_PADDING = 80;

type Side = 'left' | 'right';

/** 部分木の大きさ（位置はまだ決まっていない） */
interface SubtreeLayout {
  node: MindNode;
  width: number;
  height: number;
  /** 子孫を含めた高さ */
  subtreeHeight: number;
  children: SubtreeLayout[];
  side: Side;
  depth: number;
  branchColor: string;
}

interface LayoutContext {
  childrenMap: ChildrenMap;
  branchColors: string[];
  connectorStyle: ConnectorStyle;
  /** マップのフォント。文字の幅の見積もりに使う */
  fontFamily?: string;
}

/** 配置の結果を追加していく先 */
interface LayoutOutput {
  nodes: PositionedNode[];
  connections: Connection[];
}

/**
 * ルートの子を左右に振り分ける。
 * マインドマップ型は side に従い、side がなければ並び順で rootSide.ts の決まりに従って振り分ける（右を先に 5 本）
 */
function splitRootChildren(
  rootChildren: MindNode[],
  layoutType: LayoutType
): { right: MindNode[]; left: MindNode[] } {
  if (layoutType === 'tree-right') return { right: rootChildren, left: [] };
  if (layoutType === 'tree-left') return { right: [], left: rootChildren };

  const right: MindNode[] = [];
  const left: MindNode[] = [];
  const sides = assignRootChildSides(rootChildren);
  rootChildren.forEach((child, index) => {
    (sides[index] === 'left' ? left : right).push(child);
  });
  return { right, left };
}

/** ルートを、中心が原点 (0, 0) になるように置く */
function createRootNode(
  rootNode: MindNode,
  childCount: number,
  branchColor: string,
  fontFamily?: string
): PositionedNode {
  const dims = estimateNodeDimensions(rootNode, true, fontFamily);
  return {
    ...rootNode,
    x: -dims.width / 2,
    y: -dims.height / 2,
    width: dims.width,
    height: dims.height,
    depth: 0,
    effectiveSide: 'right',
    hasChildren: childCount > 0,
    childrenCount: childCount,
    branchColor,
  };
}

/** 縦に並べた部分木の高さの合計（間隔を含む） */
function sumSubtreeHeights(subtrees: SubtreeLayout[], gap: number): number {
  const total = subtrees.reduce((sum, s) => sum + s.subtreeHeight, 0);
  return total + Math.max(0, subtrees.length - 1) * gap;
}

/**
 * 部分木の大きさを計算する。折りたたんだノードの子は数えない。
 * 色を指定したノードは、その色を子孫の枝の色に引き継ぐ
 */
function measureSubtree(
  node: MindNode,
  side: Side,
  depth: number,
  inheritedColor: string,
  childrenMap: ChildrenMap,
  fontFamily?: string
): SubtreeLayout {
  const dims = estimateNodeDimensions(node, false, fontFamily);
  const branchColor = node.color || inheritedColor;
  const visibleChildren = node.isFolded ? [] : childrenMap.get(node.id) || [];
  const children = visibleChildren.map((c) => measureSubtree(c, side, depth + 1, branchColor, childrenMap, fontFamily));

  return {
    node,
    width: dims.width,
    height: dims.height,
    subtreeHeight: Math.max(dims.height, sumSubtreeHeights(children, VERTICAL_NODE_GAP)),
    children,
    side,
    depth,
    branchColor,
  };
}

/**
 * 部分木を配置し、ノードと接続線を out に追加する（親 → 子の順）。
 * ノードは部分木の高さの中央に置き、子の並びはノードの中央にそろえる
 * @param topY 部分木の上端の y 座標
 */
function placeSubtree(
  subtree: SubtreeLayout,
  parent: PositionedNode,
  topY: number,
  ctx: LayoutContext,
  out: LayoutOutput
): void {
  const { node, side } = subtree;
  const isFirstLevel = subtree.depth === 1;
  const gap = isFirstLevel ? HORIZONTAL_LEVEL_GAP + ROOT_GAP_EXTRA : HORIZONTAL_LEVEL_GAP;
  const childCount = (ctx.childrenMap.get(node.id) || []).length;

  const positioned: PositionedNode = {
    ...node,
    x: side === 'right' ? parent.x + parent.width + gap : parent.x - gap - subtree.width,
    y: topY + subtree.subtreeHeight / 2 - subtree.height / 2,
    width: subtree.width,
    height: subtree.height,
    depth: subtree.depth,
    effectiveSide: side,
    hasChildren: childCount > 0,
    childrenCount: childCount,
    branchColor: subtree.branchColor,
  };
  out.nodes.push(positioned);
  out.connections.push(
    createConnection({
      parent,
      child: positioned,
      side,
      sourceId: node.parentId || '',
      targetId: node.id,
      color: subtree.branchColor,
      isRootBranch: isFirstLevel,
      style: ctx.connectorStyle,
    })
  );

  const centerY = positioned.y + subtree.height / 2;
  let childTopY = centerY - sumSubtreeHeights(subtree.children, VERTICAL_NODE_GAP) / 2;
  subtree.children.forEach((child) => {
    placeSubtree(child, positioned, childTopY, ctx, out);
    childTopY += child.subtreeHeight + VERTICAL_NODE_GAP;
  });
}

/**
 * ルートの片側の枝を、ルートの中央にそろえて上から順に配置する
 * @param colorOffset 枝の色を選ぶ位置のずれ（左側は、右側の枝の数だけずらす）
 */
function placeSide(
  children: MindNode[],
  side: Side,
  colorOffset: number,
  root: PositionedNode,
  ctx: LayoutContext,
  out: LayoutOutput
): void {
  const subtrees = children.map((child, index) => {
    const color = child.color || ctx.branchColors[(index + colorOffset) % ctx.branchColors.length];
    return measureSubtree(child, side, 1, color, ctx.childrenMap, ctx.fontFamily);
  });

  let topY = -sumSubtreeHeights(subtrees, FIRST_LEVEL_BRANCH_GAP) / 2;
  subtrees.forEach((subtree) => {
    placeSubtree(subtree, root, topY, ctx, out);
    topY += subtree.subtreeHeight + FIRST_LEVEL_BRANCH_GAP;
  });
}

/** すべてのノードを囲む範囲（余白つき）。nodes は 1 つ以上あること */
function calculateBounds(nodes: PositionedNode[]): LayoutBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  nodes.forEach((n) => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  });

  return {
    minX: minX - BOUNDS_PADDING,
    minY: minY - BOUNDS_PADDING,
    maxX: maxX + BOUNDS_PADDING,
    maxY: maxY + BOUNDS_PADDING,
    width: maxX - minX + BOUNDS_PADDING * 2,
    height: maxY - minY + BOUNDS_PADDING * 2,
  };
}

/**
 * マインドマップ全体の配置（ノードの位置と大きさ、接続線、範囲）を計算する。
 * ルートを原点に置き、ルートの子を右側 → 左側の順に配置する
 */
export function calculateLayout(mindMap: MindMap): LayoutResult {
  const rootNode = mindMap.nodes[mindMap.rootId];
  if (!rootNode) {
    return {
      nodes: [],
      connections: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      nodeMap: new Map(),
    };
  }

  const childrenMap = buildChildrenMap(mindMap.nodes);
  const ctx: LayoutContext = {
    childrenMap,
    branchColors: getTheme(mindMap.themeId).branchColors,
    connectorStyle: mindMap.connectorStyle || DEFAULT_CONNECTOR_STYLE,
    fontFamily: mindMap.fontFamily,
  };

  const rootChildren = childrenMap.get(rootNode.id) || [];
  const { right, left } = splitRootChildren(rootChildren, mindMap.layoutType);
  const root = createRootNode(rootNode, rootChildren.length, ctx.branchColors[0], ctx.fontFamily);

  const out: LayoutOutput = { nodes: [root], connections: [] };
  placeSide(right, 'right', 0, root, ctx, out);
  placeSide(left, 'left', right.length, root, ctx, out);

  return {
    nodes: out.nodes,
    connections: out.connections,
    bounds: calculateBounds(out.nodes),
    nodeMap: new Map(out.nodes.map((n) => [n.id, n])),
  };
}
