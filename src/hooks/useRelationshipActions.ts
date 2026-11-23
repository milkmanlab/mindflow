import { t } from '../i18n';
import { useState, useEffect, useCallback } from 'react';
import { MindMap, MindRelationship } from '../types';
import {
  addRelationship,
  findRelationshipBetween,
  removeRelationship,
  updateRelationship,
} from '../utils/relationshipOperations';

interface UseRelationshipActionsParams {
  mindMap: MindMap;
  updateMap: (map: MindMap) => void;
  selectedNodeIds: string[];
  handleSelectNode: (nodeId: string | null, isMulti?: boolean) => void;
  handleSelectNodes: (nodeIds: string[]) => void;
  clearSelection: () => void;
  showToast: (msg: string) => void;
}

/** 関連線の選択・作成・更新・削除。ノードを選んだら関連線の選択は解除する */
export function useRelationshipActions({
  mindMap,
  updateMap,
  selectedNodeIds,
  handleSelectNode,
  handleSelectNodes,
  clearSelection,
  showToast,
}: UseRelationshipActionsParams) {
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);

  // Undo などで関連線が消えたら、選択から外す
  useEffect(() => {
    setSelectedRelationshipId((prev) => (prev && !mindMap.relationships?.[prev] ? null : prev));
  }, [mindMap]);

  /** 関連線を選ぶ（ノードの選択は解除する） */
  const selectRelationshipOnly = useCallback(
    (relId: string) => {
      setSelectedRelationshipId(relId);
      clearSelection();
    },
    [clearSelection]
  );

  const handleSelectRelationship = useCallback(
    (relId: string | null) => {
      setSelectedRelationshipId(relId);
      if (relId) {
        clearSelection();
      }
    },
    [clearSelection]
  );

  const handleSelectNodeWithRelClear = useCallback(
    (nodeId: string | null, isMulti = false) => {
      setSelectedRelationshipId(null);
      handleSelectNode(nodeId, isMulti);
    },
    [handleSelectNode]
  );

  const handleSelectNodesWithRelClear = useCallback(
    (nodeIds: string[]) => {
      setSelectedRelationshipId(null);
      handleSelectNodes(nodeIds);
    },
    [handleSelectNodes]
  );

  // 関連線の作成。既にあれば作らず、既存の関連線を選ぶ
  const handleCreateRelationship = useCallback(
    (sourceId?: string, targetId?: string) => {
      const src = sourceId || selectedNodeIds[0];
      const tgt = targetId || selectedNodeIds[1];
      if (!src || !tgt || src === tgt) return;

      const existing = findRelationshipBetween(mindMap, src, tgt);
      if (existing) {
        showToast(t('toast.relationExists'));
        selectRelationshipOnly(existing.id);
        return;
      }

      const { updatedMap, relId } = addRelationship(mindMap, src, tgt);
      updateMap(updatedMap);
      selectRelationshipOnly(relId);
    },
    [mindMap, selectedNodeIds, updateMap, selectRelationshipOnly, showToast]
  );

  const handleUpdateRelationship = useCallback(
    (relId: string, partial: Partial<MindRelationship>) => {
      updateMap(updateRelationship(mindMap, relId, partial));
    },
    [mindMap, updateMap]
  );

  const handleDeleteRelationship = useCallback(
    (relId: string) => {
      const updated = removeRelationship(mindMap, relId);
      if (updated === mindMap) return;
      updateMap(updated);
      if (selectedRelationshipId === relId) {
        setSelectedRelationshipId(null);
      }
    },
    [mindMap, selectedRelationshipId, updateMap]
  );

  const selectedRelationship = selectedRelationshipId ? mindMap.relationships?.[selectedRelationshipId] || null : null;

  return {
    selectedRelationshipId,
    setSelectedRelationshipId,
    selectedRelationship,
    handleSelectRelationship,
    handleSelectNodeWithRelClear,
    handleSelectNodesWithRelClear,
    handleCreateRelationship,
    handleUpdateRelationship,
    handleDeleteRelationship,
  };
}
