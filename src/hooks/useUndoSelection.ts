import { useCallback, useEffect, useRef } from 'react';
import { MindMap } from '../types';

interface UseUndoSelectionProps {
  mindMap: MindMap;
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Undo / Redo で移った先のマップに、必要なときだけ選択を戻す。戻すのは次の 2 つの場合。
 * - 選択していたノードが、移った先のマップにない（例：ノードを追加して Undo）
 * - そのマップで選択していたノードが、Undo / Redo で戻ってきた（例：ノードを削除して Undo）
 *
 * テキストや色の変更を戻すときは、今の選択を動かさない。
 *
 * マップはイミュータブルなスナップショットなので、マップをキーにして、
 * そのマップを最後に表示していたときの選択を覚えておく。
 * 履歴から外れたマップの分は、WeakMap なので自然に消える。
 */
export function useUndoSelection({
  mindMap,
  selectedNodeIds,
  setSelectedNodeIds,
  undo,
  redo,
  canUndo,
  canRedo,
}: UseUndoSelectionProps) {
  const selectionByMap = useRef(new WeakMap<MindMap, string[]>());
  const previousMap = useRef(mindMap);
  const shouldRestore = useRef(false);

  useEffect(() => {
    const fromMap = previousMap.current;
    previousMap.current = mindMap;

    if (shouldRestore.current && fromMap !== mindMap) {
      shouldRestore.current = false;
      const saved = (selectionByMap.current.get(mindMap) ?? []).filter((id) => mindMap.nodes[id]);
      const selectionLost =
        selectedNodeIds.length > 0 && !selectedNodeIds.some((id) => mindMap.nodes[id]);
      const nodesCameBack = saved.some((id) => !fromMap.nodes[id]);

      if (saved.length > 0 && (selectionLost || nodesCameBack)) {
        // 選択を戻すと、この effect がもう一度走り、戻した選択が記録される
        setSelectedNodeIds(saved);
        return;
      }
    }

    selectionByMap.current.set(mindMap, selectedNodeIds);
  }, [mindMap, selectedNodeIds, setSelectedNodeIds]);

  const undoWithSelection = useCallback(() => {
    if (!canUndo) return;
    shouldRestore.current = true;
    undo();
  }, [canUndo, undo]);

  const redoWithSelection = useCallback(() => {
    if (!canRedo) return;
    shouldRestore.current = true;
    redo();
  }, [canRedo, redo]);

  return { undo: undoWithSelection, redo: redoWithSelection };
}
