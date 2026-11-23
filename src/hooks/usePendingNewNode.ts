import { useRef, useEffect, useCallback } from 'react';
import { MindMap } from '../types';
import { deleteNode } from '../utils/treeOperations';

interface UsePendingNewNodeParams {
  mindMap: MindMap;
  updateMap: (map: MindMap) => void;
  amendMap: (map: MindMap) => void;
  discardMap: (expected: MindMap, fallback: MindMap) => void;
  setSelectedNodeId: (id: string | null) => void;
  editingNodeId: string | null;
  setEditingNodeId: (id: string | null) => void;
  setEditingInitialChar: (char: string | null) => void;
}

/**
 * 追加直後でまだ一度もテキストを確定していない空ノードを追跡し、Undo と連携する。
 * 「空ノードの追加」と「最初の入力」を 1 つの Undo ステップにまとめ、
 * 未入力のまま破棄された場合は追加のステップごと履歴から消す（Undo で空ノードが現れないように）
 */
export function usePendingNewNode({
  mindMap,
  updateMap,
  amendMap,
  discardMap,
  setSelectedNodeId,
  editingNodeId,
  setEditingNodeId,
  setEditingInitialChar,
}: UsePendingNewNodeParams) {
  const pendingNewNodeIdRef = useRef<string | null>(null);
  // 追加した直後〜新ノードの編集欄が描画されるまでの間は、次の追加を受け付けない。
  // Tab の連打で、更新前の古い状態から追加が重なり、空ノードが残るのを防ぐ
  const addLockedRef = useRef(false);

  // 新ノードが描画され、編集が始まったらロックを解く
  useEffect(() => {
    const pendingId = pendingNewNodeIdRef.current;
    if (addLockedRef.current && pendingId && editingNodeId === pendingId && mindMap.nodes[pendingId]) {
      addLockedRef.current = false;
    }
  }, [mindMap, editingNodeId]);

  /** 追加を受け付けない間は true */
  const isAddLocked = useCallback(() => addLockedRef.current, []);

  // 外部からの更新などで履歴がリセットされたら追跡を解除
  useEffect(() => {
    const pendingId = pendingNewNodeIdRef.current;
    if (pendingId && !mindMap.nodes[pendingId]) {
      pendingNewNodeIdRef.current = null;
      addLockedRef.current = false;
    }
  }, [mindMap]);

  /** 空ノードを追加するステップを積み、追跡対象にして、そのまま編集を始める */
  const commitAndEditNewNode = useCallback(
    (updatedMap: MindMap, newNodeId: string) => {
      updateMap(updatedMap);
      addLockedRef.current = true;
      pendingNewNodeIdRef.current = newNodeId;
      setSelectedNodeId(newNodeId);
      setEditingNodeId(newNodeId);
    },
    [updateMap, setSelectedNodeId, setEditingNodeId]
  );

  /** ノードのテキストの確定。追加直後のノードなら、追加のステップに統合する */
  const commitNodeText = useCallback(
    (nodeId: string, updated: MindMap) => {
      if (pendingNewNodeIdRef.current === nodeId) {
        pendingNewNodeIdRef.current = null;
        amendMap(updated);
      } else {
        updateMap(updated);
      }
    },
    [amendMap, updateMap]
  );

  /** 未入力の空ノードを破棄する */
  const removeEmptyNode = useCallback(
    (nodeId: string) => {
      addLockedRef.current = false;
      if (nodeId === mindMap.rootId || !mindMap.nodes[nodeId]) {
        setEditingNodeId(null);
        setEditingInitialChar(null);
        return;
      }

      const { updatedMap, nextSelectedId } = deleteNode(mindMap, nodeId);
      if (pendingNewNodeIdRef.current === nodeId) {
        // 追加直後の空ノード → 追加のステップごと取り消す（Redo でも復活させない）
        pendingNewNodeIdRef.current = null;
        discardMap(mindMap, updatedMap);
      } else {
        updateMap(updatedMap);
      }
      setSelectedNodeId(nextSelectedId);
      setEditingNodeId(null);
      setEditingInitialChar(null);
    },
    [mindMap, updateMap, discardMap, setSelectedNodeId, setEditingNodeId, setEditingInitialChar]
  );

  return { commitAndEditNewNode, commitNodeText, removeEmptyNode, isAddLocked };
}
