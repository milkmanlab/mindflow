import { useCallback } from 'react';
import { MindMap } from '../types';
import { addChildNode, addSiblingNode, updateNodeText } from '../utils/treeOperations';
import { DEFAULT_ROOT_TEXT, resolveEditCommit } from '../utils/editCommit';

interface UseNodeEditActionsParams {
  mindMap: MindMap;
  updateMap: (map: MindMap) => void;
  setSelectedNodeId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setEditingInitialChar: (char: string | null) => void;
  commitAndEditNewNode: (updatedMap: MindMap, newNodeId: string) => void;
  isAddLocked: () => boolean;
  commitNodeText: (nodeId: string, updated: MindMap) => void;
  removeEmptyNode: (nodeId: string) => void;
}

/** ノードのテキスト編集の開始と確定 */
export function useNodeEditActions({
  mindMap,
  updateMap,
  setSelectedNodeId,
  setEditingNodeId,
  setEditingInitialChar,
  commitAndEditNewNode,
  isAddLocked,
  commitNodeText,
  removeEmptyNode,
}: UseNodeEditActionsParams) {
  const handleStartEdit = useCallback(
    (nodeId: string, initialChar?: string) => {
      setEditingNodeId(nodeId);
      setSelectedNodeId(nodeId);
      setEditingInitialChar(initialChar ?? null);
    },
    [setEditingNodeId, setSelectedNodeId, setEditingInitialChar]
  );

  const handleFinishEdit = useCallback(
    (nodeId: string, newText: string) => {
      setEditingNodeId(null);
      setEditingInitialChar(null);
      switch (resolveEditCommit(mindMap, nodeId, newText)) {
        case 'discardEmpty':
          removeEmptyNode(nodeId);
          return;
        case 'resetRoot':
          updateMap(updateNodeText(mindMap, nodeId, DEFAULT_ROOT_TEXT));
          return;
        case 'update':
          commitNodeText(nodeId, updateNodeText(mindMap, nodeId, newText));
          return;
        case 'missing':
        case 'unchanged':
          return;
      }
    },
    [mindMap, updateMap, commitNodeText, removeEmptyNode, setEditingNodeId, setEditingInitialChar]
  );

  /**
   * 「確定と同時に追加」用のテキストの確定。続けて追加するノードの土台になるマップを返す。
   * 空のノードは破棄して null を返す。ルートが空なら既定の名前に戻す（handleFinishEdit と同じ判定）
   */
  const commitTextBeforeAdding = useCallback(
    (nodeId: string, newText: string): MindMap | null => {
      setEditingInitialChar(null);
      const action = resolveEditCommit(mindMap, nodeId, newText);
      if (action === 'discardEmpty') {
        removeEmptyNode(nodeId);
        return null;
      }
      if (action === 'resetRoot' || action === 'update') {
        const text = action === 'resetRoot' ? DEFAULT_ROOT_TEXT : newText;
        const mapWithText = updateNodeText(mindMap, nodeId, text);
        commitNodeText(nodeId, mapWithText);
        return mapWithText;
      }
      return mindMap;
    },
    [mindMap, commitNodeText, removeEmptyNode, setEditingInitialChar]
  );

  // 確定して兄弟を追加（Enter / Shift+Enter）。ルートには兄弟がないので子を追加する
  const handleFinishEditAndAddSibling = useCallback(
    (nodeId: string, newText: string, position: 'before' | 'after' = 'after') => {
      if (isAddLocked()) return;
      const mapWithText = commitTextBeforeAdding(nodeId, newText);
      if (!mapWithText) return;
      const { updatedMap, newNodeId } =
        nodeId === mapWithText.rootId
          ? addChildNode(mapWithText, nodeId, '')
          : addSiblingNode(mapWithText, nodeId, '', position);
      commitAndEditNewNode(updatedMap, newNodeId);
    },
    [isAddLocked, commitTextBeforeAdding, commitAndEditNewNode]
  );

  // 確定して子を追加（Tab）
  const handleFinishEditAndAddChild = useCallback(
    (nodeId: string, newText: string) => {
      if (isAddLocked()) return;
      const mapWithText = commitTextBeforeAdding(nodeId, newText);
      if (!mapWithText) return;
      const { updatedMap, newNodeId } = addChildNode(mapWithText, nodeId, '');
      commitAndEditNewNode(updatedMap, newNodeId);
    },
    [isAddLocked, commitTextBeforeAdding, commitAndEditNewNode]
  );

  return { handleStartEdit, handleFinishEdit, handleFinishEditAndAddSibling, handleFinishEditAndAddChild };
}
