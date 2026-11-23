import { t } from '../../i18n';
import { MindMap, MindNode } from '../../types';

/** ルートのテキストが空のときの、マップのタイトル */
const EMPTY_ROOT_TITLE = t('content.rootDefault');

/**
 * ノードのテキストを更新する。ルートのテキストは、マップのタイトルにもなる（前後の空白は除く）。
 * テキストが変わらないときは、同じマップを返す
 */
export function updateNodeText(map: MindMap, nodeId: string, text: string): MindMap {
  const node = map.nodes[nodeId];
  if (!node || node.text === text) return map;

  const now = Date.now();
  return {
    ...map,
    title: nodeId === map.rootId ? text.trim() || EMPTY_ROOT_TITLE : map.title,
    nodes: { ...map.nodes, [nodeId]: { ...node, text, updatedAt: now } },
    updatedAt: now,
  };
}

/** ノードの属性を、指定したものだけ上書きする */
export function updateNodeProps(map: MindMap, nodeId: string, partial: Partial<MindNode>): MindMap {
  const node = map.nodes[nodeId];
  if (!node) return map;

  const now = Date.now();
  return {
    ...map,
    nodes: { ...map.nodes, [nodeId]: { ...node, ...partial, updatedAt: now } },
    updatedAt: now,
  };
}

/** 複数のノードに、同じ属性をまとめて付ける。存在しない id は無視する */
export function updateMultipleNodesProps(
  map: MindMap,
  nodeIds: string[],
  partial: Partial<MindNode>
): MindMap {
  const now = Date.now();
  const nodes = { ...map.nodes };
  let hasChange = false;

  for (const id of nodeIds) {
    const node = nodes[id];
    if (node) {
      nodes[id] = { ...node, ...partial, updatedAt: now };
      hasChange = true;
    }
  }

  return hasChange ? { ...map, nodes, updatedAt: now } : map;
}

/** マップのフォントを変える */
export function updateMapFontFamily(map: MindMap, fontFamily: string): MindMap {
  return { ...map, fontFamily, updatedAt: Date.now() };
}
