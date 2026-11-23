import { t } from '../i18n';
import { useCallback } from 'react';
import { MindMap, MindNode } from '../types';
import {
  DropPosition,
  addChildNode,
  addSiblingNode,
  collapseAllNodes,
  deleteNode,
  deleteNodes,
  expandAllNodes,
  moveSiblingOrder,
  reorderOrReparentNode,
  toggleFoldNode,
  updateMultipleNodesProps,
  updateNodeProps,
} from '../utils/treeOperations';

interface UseNodeStructureActionsParams {
  mindMap: MindMap;
  updateMap: (map: MindMap) => void;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  editingNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setEditingInitialChar: (char: string | null) => void;
  clearSelection: () => void;
  commitAndEditNewNode: (updatedMap: MindMap, newNodeId: string) => void;
  isAddLocked: () => boolean;
  showToast: (msg: string) => void;
}

/** ノードの追加・削除・折りたたみ・移動・並べ替え・プロパティの更新 */
export function useNodeStructureActions({
  mindMap,
  updateMap,
  selectedNodeId,
  selectedNodeIds,
  editingNodeId,
  setSelectedNodeId,
  setEditingNodeId,
  setEditingInitialChar,
  clearSelection,
  commitAndEditNewNode,
  isAddLocked,
  showToast,
}: UseNodeStructureActionsParams) {
  // 子ノードの追加（Tab、追加ボタン）
  const handleAddChild = useCallback(
    (parentId: string, sideHint?: 'left' | 'right') => {
      if (isAddLocked()) return;
      const { updatedMap, newNodeId } = addChildNode(mindMap, parentId, '', sideHint);
      commitAndEditNewNode(updatedMap, newNodeId);
      setEditingInitialChar(null);
    },
    [mindMap, commitAndEditNewNode, isAddLocked, setEditingInitialChar]
  );

  // 兄弟ノードの追加（Enter：後ろ、Shift+Enter：前）
  const handleAddSibling = useCallback(
    (targetNodeId: string, position: 'before' | 'after' = 'after') => {
      if (isAddLocked()) return;
      const { updatedMap, newNodeId } = addSiblingNode(mindMap, targetNodeId, '', position);
      commitAndEditNewNode(updatedMap, newNodeId);
      setEditingInitialChar(null);
    },
    [mindMap, commitAndEditNewNode, isAddLocked, setEditingInitialChar]
  );

  // 複数ノードの一括削除
  const handleDeleteSelectedNodes = useCallback(() => {
    const nodesToDelete = selectedNodeIds.filter((id) => id !== mindMap.rootId);
    if (nodesToDelete.length === 0) {
      if (selectedNodeIds.includes(mindMap.rootId)) {
        showToast(t('toast.rootNoDelete'));
      }
      return;
    }
    const { updatedMap } = deleteNodes(mindMap, nodesToDelete);
    updateMap(updatedMap);
    clearSelection();
  }, [mindMap, selectedNodeIds, updateMap, clearSelection, showToast]);

  // ノードの削除（Delete / Backspace）
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (nodeId === mindMap.rootId) {
        showToast(t('toast.rootNoDelete'));
        return;
      }
      const { updatedMap, nextSelectedId } = deleteNode(mindMap, nodeId);
      updateMap(updatedMap);
      setSelectedNodeId(nextSelectedId);
      setEditingNodeId(null);
    },
    [mindMap, updateMap, showToast, setSelectedNodeId, setEditingNodeId]
  );

  // 折りたたみの切り替え
  const handleToggleFold = useCallback(
    (nodeId: string) => {
      if (editingNodeId) {
        setEditingNodeId(null);
      }
      updateMap(toggleFoldNode(mindMap, nodeId));
    },
    [mindMap, editingNodeId, updateMap, setEditingNodeId]
  );

  // すべて展開
  const handleExpandAll = useCallback(() => {
    if (editingNodeId) {
      setEditingNodeId(null);
    }
    const updated = expandAllNodes(mindMap);
    if (updated !== mindMap) {
      updateMap(updated);
    }
  }, [mindMap, editingNodeId, updateMap, setEditingNodeId]);

  // ルート以外をすべて折りたたむ。折りたたまれて見えなくなるノードを選んでいたら、ルートに移す
  const handleCollapseAll = useCallback(() => {
    if (editingNodeId) {
      setEditingNodeId(null);
    }
    const updated = collapseAllNodes(mindMap);
    if (updated !== mindMap) {
      updateMap(updated);
      if (selectedNodeId && selectedNodeId !== mindMap.rootId) {
        const selNode = mindMap.nodes[selectedNodeId];
        if (selNode && selNode.parentId !== mindMap.rootId) {
          setSelectedNodeId(mindMap.rootId);
        }
      }
    }
  }, [mindMap, editingNodeId, selectedNodeId, updateMap, setSelectedNodeId, setEditingNodeId]);

  // 親の変更と並べ替え（ドラッグ＆ドロップ）
  const handleReparent = useCallback(
    (nodeId: string, targetId: string, position: DropPosition = 'inside', side?: 'left' | 'right') => {
      const node = mindMap.nodes[nodeId];
      if (!node) return;
      // ルートの左右を指定されたときは、側が変わるなら移す
      const isSideChange = side !== undefined && (node.side || 'right') !== side;
      if (position === 'inside' && node.parentId === targetId && !isSideChange) {
        showToast(t('toast.alreadyChild'));
        return;
      }
      const updated = reorderOrReparentNode(mindMap, nodeId, targetId, position, side);
      if (updated !== mindMap) {
        updateMap(updated);
      } else {
        showToast(t('toast.cannotMove'));
      }
    },
    [mindMap, updateMap, showToast]
  );

  // プロパティの更新（複数ノードを選んでいれば、すべてに反映する）
  const handleUpdateNodeProps = useCallback(
    (nodeId: string, partial: Partial<MindNode>) => {
      if (selectedNodeIds.length > 1 && selectedNodeIds.includes(nodeId)) {
        updateMap(updateMultipleNodesProps(mindMap, selectedNodeIds, partial));
      } else {
        updateMap(updateNodeProps(mindMap, nodeId, partial));
      }
    },
    [mindMap, selectedNodeIds, updateMap]
  );

  // 兄弟の上下移動（Alt + ↑ / ↓）
  const handleMoveSibling = useCallback(
    (nodeId: string, direction: 'up' | 'down') => {
      const updated = moveSiblingOrder(mindMap, nodeId, direction);
      if (updated !== mindMap) {
        updateMap(updated);
      }
    },
    [mindMap, updateMap]
  );

  return {
    handleAddChild,
    handleAddSibling,
    handleDeleteSelectedNodes,
    handleDeleteNode,
    handleToggleFold,
    handleExpandAll,
    handleCollapseAll,
    handleReparent,
    handleUpdateNodeProps,
    handleMoveSibling,
  };
}
