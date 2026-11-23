import { t } from '../i18n';
import { DEFAULT_CONNECTOR_STYLE, DEFAULT_LAYOUT_TYPE, MindMap, MindNode } from '../types';
import { DEFAULT_THEME_ID } from './themes';
import { generateId } from './id';

/** 新しいマップに最初から入れておく子ノードの数 */
const DEFAULT_CHILD_COUNT = 4;

/** 新しいマップ（ルートと 4 つの子を持つ右ツリー）を作る */
export function createDefaultMindMap(title = t('content.mainTheme')): MindMap {
  const rootId = generateId();
  const childIds = Array.from({ length: DEFAULT_CHILD_COUNT }, () => generateId());
  const now = Date.now();

  const nodes: Record<string, MindNode> = {
    [rootId]: { id: rootId, parentId: null, text: title, createdAt: now, updatedAt: now },
  };
  childIds.forEach((id, index) => {
    // 作成順で並ぶように、1 ミリ秒ずつずらす
    const createdAt = now + index + 1;
    nodes[id] = {
      id,
      parentId: rootId,
      text: t('content.idea', { n: index + 1 }),
      side: 'right',
      order: index,
      createdAt,
      updatedAt: createdAt,
    };
  });

  return {
    id: 'map_' + now.toString(36),
    title,
    rootId,
    nodes,
    themeId: DEFAULT_THEME_ID,
    layoutType: DEFAULT_LAYOUT_TYPE,
    connectorStyle: DEFAULT_CONNECTOR_STYLE,
    createdAt: now,
    updatedAt: now,
  };
}
