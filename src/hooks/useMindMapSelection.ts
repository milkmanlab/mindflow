import { useState, useCallback, useMemo } from 'react';

export function useMindMapSelection(initialRootId?: string) {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(() =>
    initialRootId ? [initialRootId] : []
  );
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingInitialChar, setEditingInitialChar] = useState<string | null>(null);

  // Selection history stack (Alt+Left / Alt+Right navigation)
  const [selectionHistory, setSelectionHistory] = useState<string[]>(() =>
    initialRootId ? [initialRootId] : []
  );
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Clipboard copied node
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);

  // Primary selected node (既存コードとの完全な互換性を維持)
  const selectedNodeId = useMemo(
    () => (selectedNodeIds.length > 0 ? selectedNodeIds[selectedNodeIds.length - 1] : null),
    [selectedNodeIds]
  );

  const setSelectedNodeId = useCallback((id: string | null) => {
    setSelectedNodeIds(id ? [id] : []);
  }, []);

  // ノード選択ハンドラー (isMulti: true の場合は Shift/Cmd クリックによる追加/トグル選択)
  const handleSelectNode = useCallback(
    (nodeId: string | null, isMulti = false) => {
      if (!nodeId) {
        setSelectedNodeIds([]);
        return;
      }

      if (isMulti) {
        setSelectedNodeIds((prev) => {
          if (prev.includes(nodeId)) {
            // 選択解除
            const next = prev.filter((id) => id !== nodeId);
            return next;
          } else {
            // 追加選択
            return [...prev, nodeId];
          }
        });
      } else {
        // 単一選択
        setSelectedNodeIds([nodeId]);
      }

      if (nodeId !== selectionHistory[historyIndex]) {
        setSelectionHistory((prev) => [...prev.slice(0, historyIndex + 1), nodeId]);
        setHistoryIndex((prev) => prev + 1);
      }
    },
    [selectionHistory, historyIndex]
  );

  // 矩形選択（ラバーバンド）用の一括設定ハンドラー
  const handleSelectNodes = useCallback((nodeIds: string[]) => {
    setSelectedNodeIds(nodeIds);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeIds([]);
  }, []);

  const handleHistoryBack = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setSelectedNodeIds([selectionHistory[nextIndex]]);
    }
  }, [historyIndex, selectionHistory]);

  const handleHistoryForward = useCallback(() => {
    if (historyIndex < selectionHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setSelectedNodeIds([selectionHistory[nextIndex]]);
    }
  }, [historyIndex, selectionHistory]);

  const resetSelection = useCallback((rootId: string) => {
    setSelectedNodeIds([rootId]);
    setEditingNodeId(null);
    setEditingInitialChar(null);
    setSelectionHistory([rootId]);
    setHistoryIndex(0);
  }, []);

  return {
    selectedNodeId,
    selectedNodeIds,
    setSelectedNodeId,
    setSelectedNodeIds,
    editingNodeId,
    setEditingNodeId,
    editingInitialChar,
    setEditingInitialChar,
    copiedNodeId,
    setCopiedNodeId,
    selectionHistory,
    historyIndex,
    handleSelectNode,
    handleSelectNodes,
    clearSelection,
    handleHistoryBack,
    handleHistoryForward,
    resetSelection,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < selectionHistory.length - 1,
  };
}
