import React, { useState, useEffect, useCallback } from 'react';
import { LayoutResult, MindMap } from '../types';
import { DropPosition, getDescendantIds } from '../utils/treeOperations';
import { computeDropPosition, computeRootDropSide, resolveDropPosition } from '../utils/canvasDropPosition';

interface UseNodeDragDropParams {
  mindMap: MindMap;
  layout: LayoutResult;
  onReparentNode: (nodeId: string, targetId: string, position?: DropPosition, side?: 'left' | 'right') => void;
  /** ノードのドラッグ中にキャンバスのパンが動かないようにする */
  stopPanning: () => void;
}

/** ノードのドラッグ＆ドロップ（親の変更、Alt を押しながらの兄弟の並べ替え） */
export function useNodeDragDrop({ mindMap, layout, onReparentNode, stopPanning }: UseNodeDragDropParams) {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
  /** ルートにドロップするときに入る側（放射状のみ） */
  const [dropSide, setDropSide] = useState<'left' | 'right' | null>(null);
  const [isAltActive, setIsAltActive] = useState(false);

  const clearDragState = useCallback(() => {
    setDraggedNodeId(null);
    setDropTargetId(null);
    setDropPosition(null);
    setDropSide(null);
  }, []);

  // Alt（Option）キーの状態を追う。押している間は、ドロップで兄弟の並べ替えだけを行う
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setIsAltActive(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setIsAltActive(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ノードの外でドラッグが終わったときにも、確実に状態を消す
  useEffect(() => {
    window.addEventListener('dragend', clearDragState);
    return () => window.removeEventListener('dragend', clearDragState);
  }, [clearDragState]);

  const handleNodeDragStart = (e: React.DragEvent, nodeId: string) => {
    stopPanning();
    e.dataTransfer.setData('text/plain', nodeId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNodeId(nodeId);
    if (e.altKey) {
      setIsAltActive(true);
    }
  };

  const handleNodeDragEnd = () => {
    stopPanning();
    clearDragState();
  };

  const handleNodeDragOver = (e: React.DragEvent, targetNodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedNodeId) return;

    // 自分の子孫には落とせない
    if (targetNodeId !== draggedNodeId && getDescendantIds(mindMap, draggedNodeId).includes(targetNodeId)) {
      return;
    }
    // 自分自身の上では何も表示しない
    if (targetNodeId === draggedNodeId) {
      setDropTargetId(null);
      setDropPosition(null);
      setDropSide(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const targetLayoutNode = layout.nodeMap.get(targetNodeId);
    const ratioX = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
    const isRoot = targetNodeId === mindMap.rootId;
    const position = computeDropPosition({
      ratioX,
      ratioY: rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5,
      isAlt: e.altKey || isAltActive,
      isRoot,
      childSide: targetLayoutNode?.effectiveSide || (mindMap.layoutType === 'tree-left' ? 'left' : 'right'),
    });

    setDropTargetId(targetNodeId);
    setDropPosition(position);
    setDropSide(computeRootDropSide({ ratioX, isRoot, layoutType: mindMap.layoutType }) ?? null);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleNodeDragLeave = (e: React.DragEvent, targetNodeId: string) => {
    const currentTarget = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as Node | null;
    // 子要素への移動で発生する dragleave は無視する
    if (related && currentTarget.contains(related)) return;
    if (dropTargetId === targetNodeId) {
      setDropTargetId(null);
      setDropPosition(null);
      setDropSide(null);
    }
  };

  const handleNodeDrop = (e: React.DragEvent, targetNodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    stopPanning();
    const sourceNodeId = e.dataTransfer.getData('text/plain') || draggedNodeId;

    if (sourceNodeId && sourceNodeId !== targetNodeId) {
      const isAlt = e.altKey || isAltActive;
      onReparentNode(
        sourceNodeId,
        targetNodeId,
        resolveDropPosition(dropPosition, isAlt, targetNodeId === mindMap.rootId),
        dropSide ?? undefined
      );
    }
    clearDragState();
  };

  return {
    draggedNodeId,
    dropTargetId,
    dropPosition,
    dropSide,
    isAltActive,
    handleNodeDragStart,
    handleNodeDragEnd,
    handleNodeDragOver,
    handleNodeDragLeave,
    handleNodeDrop,
  };
}
