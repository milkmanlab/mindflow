import { t } from '../i18n';
import type { MindMap } from '../types';

/** ルートの文字を空にして確定したときに戻す名前 */
export const DEFAULT_ROOT_TEXT = t('content.rootDefault');

export type EditCommitAction =
  /** ノードが存在しない（何もしない） */
  | 'missing'
  /** ルート以外で空：ノードを破棄する */
  | 'discardEmpty'
  /** ルートで空：既定の名前に戻す */
  | 'resetRoot'
  /** 文字が変わった：更新する */
  | 'update'
  /** 文字が変わっていない（何もしない） */
  | 'unchanged';

/**
 * 編集を確定したときに何をするか。判定は上から順に行う。
 * 文字が変わったかは、trim する前の文字列で比べる（今の挙動のまま）
 */
export function resolveEditCommit(map: MindMap, nodeId: string, newText: string): EditCommitAction {
  const node = map.nodes[nodeId];
  if (!node) return 'missing';
  const isEmpty = !newText.trim();
  const isRoot = nodeId === map.rootId;
  if (isEmpty && !isRoot) return 'discardEmpty';
  if (isEmpty && isRoot) return 'resetRoot';
  return node.text !== newText ? 'update' : 'unchanged';
}
