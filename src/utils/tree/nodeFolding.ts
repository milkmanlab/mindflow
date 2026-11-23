import { MindMap, MindNode } from '../../types';

/**
 * 折りたたみを切り替える。
 * 子のないノードは折りたためない（同じマップを返す）。すでに折りたたまれている場合は、展開だけできる
 */
export function toggleFoldNode(map: MindMap, nodeId: string): MindMap {
  const node = map.nodes[nodeId];
  if (!node) return map;

  if (!node.isFolded && !hasChildren(map, nodeId)) return map;

  const now = Date.now();
  return {
    ...map,
    nodes: { ...map.nodes, [nodeId]: { ...node, isFolded: !node.isFolded, updatedAt: now } },
    updatedAt: now,
  };
}

function hasChildren(map: MindMap, nodeId: string): boolean {
  return Object.values(map.nodes).some((n) => n.parentId === nodeId);
}

/**
 * 各ノードの折りたたみを、あるべき状態に合わせる。
 * 状態が変わるノードだけを作り直し、1 つも変わらなければ同じマップを返す
 * @param resolve ノードのあるべき状態。null なら、そのノードは変えない
 */
function applyFoldStates(
  map: MindMap,
  resolve: (id: string, node: MindNode) => boolean | null
): MindMap {
  const now = Date.now();
  const nodes: Record<string, MindNode> = {};
  let changed = false;

  for (const [id, node] of Object.entries(map.nodes)) {
    const shouldFold = resolve(id, node);
    if (shouldFold !== null && !!node.isFolded !== shouldFold) {
      nodes[id] = { ...node, isFolded: shouldFold, updatedAt: now };
      changed = true;
    } else {
      nodes[id] = node;
    }
  }

  return changed ? { ...map, nodes, updatedAt: now } : map;
}

/** 折りたたまれたノードを、すべて展開する */
export function expandAllNodes(map: MindMap): MindMap {
  return applyFoldStates(map, () => false);
}

/** 子を持つノードを、すべて折りたたむ。ルートは折りたたまない（折りたたまれていたら展開する） */
export function collapseAllNodes(map: MindMap): MindMap {
  const parentIds = new Set<string>();
  for (const node of Object.values(map.nodes)) {
    if (node.parentId) parentIds.add(node.parentId);
  }

  return applyFoldStates(map, (id, node) => {
    if (id === map.rootId || !node.parentId) return false;
    return parentIds.has(id) ? true : null;
  });
}
